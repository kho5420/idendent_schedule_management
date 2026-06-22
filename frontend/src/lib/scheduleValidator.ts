import type { DayAssignment, StaffRow, ScheduleSetting } from '../types';
import { groupAssignmentsByWeek } from './weekGrouping';

export type ValidationIssue = {
    severity: 'warn' | 'info';
    message: string;
};

export type WeekValidation = {
    weekLabel: string;
    issues: ValidationIssue[];
};

const DAY_NAME_BY_DOW = ['일', '월', '화', '수', '목', '금', '토'];
const ORTHO_MIN = 3;
const EXPECTED_WORK_DAYS = 5; // 정상 주 근무일(주차 2회 = 기본 휴무, 5근무 2휴무)
const FULL_WEEK_DAYS = 7; // 월~일 모두 있는 완전한 주만 개인 균형 검사 (부분주 오탐 방지)

function staffKey(s: StaffRow): string {
    return s.alias ?? s.name;
}

function settingByDow(settings: ScheduleSetting[], dayOfWeek: number): ScheduleSetting | undefined {
    return settings.find((s) => s.day_name === DAY_NAME_BY_DOW[dayOfWeek]);
}

/** 하루 단위 규칙 검사 (최소 인원·교정·일요일 팀장/신규·야간) */
function checkDay(
    d: DayAssignment,
    clinicStaff: StaffRow[],
    settings: ScheduleSetting[]
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const dow = DAY_NAME_BY_DOW[d.dayOfWeek];
    const isClosureOrEmpty = d.working.length === 0;

    // 1. 최소 인원 (전체출근일·야간분리일·휴진/빈날 제외)
    if (!d.isFullAttendance && !d.hasNightShift && !isClosureOrEmpty) {
        const setting = settingByDow(settings, d.dayOfWeek);
        if (setting) {
            const hasLeave = d.fullDayOff.length > 0;
            const required = hasLeave
                ? setting.min_staff_on_leave
                : d.isOrthoDay
                  ? setting.min_staff_with_ortho
                  : setting.min_staff_without_ortho;
            if (d.working.length < required) {
                issues.push({
                    severity: 'warn',
                    message: `${dow}요일 ${d.working.length}명 (최소 ${required})`,
                });
            }
        }
    }

    // 5. 교정일 교정 인원
    if (d.isOrthoDay && d.orthoStaffCount < ORTHO_MIN) {
        issues.push({
            severity: 'warn',
            message: `${dow}요일 교정 ${d.orthoStaffCount}명 (최소 ${ORTHO_MIN})`,
        });
    }

    // 6. 야간 인원
    if (d.hasNightShift && !isClosureOrEmpty && d.nightShiftStaff.length === 0) {
        issues.push({ severity: 'warn', message: `${dow}요일 야간 인원 없음` });
    }

    // 일요일 전용 (출근자가 있는 진료일만)
    if (d.dayOfWeek === 0 && !isClosureOrEmpty) {
        // 3. 팀장 1명 이상
        if (!d.hasTeamLeader) {
            issues.push({ severity: 'warn', message: '일요일 팀장 미배정' });
        }
        // 4. 신규 미배정
        const newbieKeys = new Set(clinicStaff.filter((s) => s.career === '신규').map(staffKey));
        const newbies = d.working.filter((name) => newbieKeys.has(name));
        if (newbies.length > 0) {
            issues.push({
                severity: 'warn',
                message: `일요일 신규 배정: ${newbies.join(',')}`,
            });
        }
    }

    return issues;
}

/**
 * 한 주 개인별 5근무/2휴무 검사 (완전한 주만).
 * 주차는 매주 2회 주어지는 기본 휴무이므로 근무일 기준(5)에 이미 반영돼 있다.
 * 연차만 별도 휴가로 근무일을 줄인다 → 기대 근무일 = 5 - 연차.
 */
function checkWeeklyBalance(days: DayAssignment[], clinicStaff: StaffRow[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (days.length !== FULL_WEEK_DAYS) return issues;

    const active = clinicStaff.filter((s) => !s.is_on_leave);
    for (const s of active) {
        const key = staffKey(s);
        let workDays = 0;
        let annualDays = 0; // 연차만 (주차는 제외)
        for (const d of days) {
            if (d.working.includes(key)) workDays++;
            else if (d.fullDayOff.some((r) => r.name === key && r.type === '연차')) annualDays++;
        }

        const expected = Math.max(0, EXPECTED_WORK_DAYS - annualDays);
        if (workDays < expected) {
            issues.push({ severity: 'warn', message: `${key} ${workDays}일 근무` });
        } else if (workDays > expected) {
            issues.push({ severity: 'warn', message: `${key} ${workDays}일 근무 (휴무 부족)` });
        } else if (annualDays > 0) {
            issues.push({ severity: 'info', message: `${key} 연차 ${annualDays}일` });
        }
    }
    return issues;
}

/**
 * 생성 스케줄을 주 단위로 검사한다. 미리보기와 같은 주 분할을 사용하므로
 * 반환 배열의 인덱스가 미리보기 주 순서와 일치한다.
 */
export function validateSchedule(
    assignments: DayAssignment[],
    clinicStaff: StaffRow[],
    scheduleSettings: ScheduleSetting[]
): WeekValidation[] {
    const weeks = groupAssignmentsByWeek(assignments);
    return weeks.map((week, i) => {
        const days = week.filter((a): a is DayAssignment => a !== null);
        const issues: ValidationIssue[] = [];
        for (const d of days) issues.push(...checkDay(d, clinicStaff, scheduleSettings));
        issues.push(...checkWeeklyBalance(days, clinicStaff));
        return { weekLabel: `${i + 1}주차`, issues };
    });
}

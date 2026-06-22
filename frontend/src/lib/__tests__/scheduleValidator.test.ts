import { describe, it, expect } from 'vitest';
import { validateSchedule } from '../scheduleValidator';
import type { DayAssignment, StaffRow, ScheduleSetting, CareerLevel } from '../../types';

// 한 주(2026-07-06 월 ~ 07-12 일) dow: 월1 화2 수3 목4 금5 토6 일0
const WEEK_DATES: { date: string; dayOfWeek: number }[] = [
    { date: '2026-07-06', dayOfWeek: 1 },
    { date: '2026-07-07', dayOfWeek: 2 },
    { date: '2026-07-08', dayOfWeek: 3 },
    { date: '2026-07-09', dayOfWeek: 4 },
    { date: '2026-07-10', dayOfWeek: 5 },
    { date: '2026-07-11', dayOfWeek: 6 },
    { date: '2026-07-12', dayOfWeek: 0 },
];

function day(over: Partial<DayAssignment> & { date: string; dayOfWeek: number }): DayAssignment {
    return {
        doctorAliases: [],
        isFullAttendance: true, // 기본 전체출근 → 최소인원·교정·야간 검사 건너뜀
        working: [],
        fullDayOff: [],
        halfDayOff: [],
        isOrthoDay: false,
        orthoStaffCount: 0,
        nightFixedStaff: [],
        hasTeamLeader: true, // 기본 팀장 있음 → 일요일 팀장 경고 안 뜸
        hasNightShift: false,
        dayShiftStaff: [],
        nightShiftStaff: [],
        ...over,
    };
}

/** 기본(이상 없음) 한 주 — 각 테스트에서 특정 날만 override */
function baseWeek(over: Partial<Record<number, Partial<DayAssignment>>> = {}): DayAssignment[] {
    return WEEK_DATES.map((d) => day({ ...d, ...(over[d.dayOfWeek] ?? {}) }));
}

function makeStaff(over: Partial<StaffRow>): StaffRow {
    return {
        id: 1,
        name: '이름',
        alias: null,
        use_yn: 'Y',
        employee_type_id: 6,
        career: '고' as CareerLevel,
        team_no: null,
        is_ortho: false,
        is_team_leader: false,
        is_night_fixed: false,
        is_weekday_fixed: false,
        is_on_leave: false,
        is_head_dentist_pick: false,
        notes: null,
        sort_order: 1,
        ...over,
    };
}

function setting(day_name: string, over: Partial<ScheduleSetting>): ScheduleSetting {
    return {
        id: 1,
        day_name,
        sort_order: 1,
        min_staff_with_ortho: 0,
        min_staff_without_ortho: 0,
        min_staff_on_leave: 0,
        has_night_shift: false,
        ...over,
    };
}

const msgs = (r: ReturnType<typeof validateSchedule>) => r[0].issues.map((i) => i.message);

describe('validateSchedule', () => {
    it('이상 없는 주는 빈 issues를 반환한다', () => {
        const r = validateSchedule(baseWeek(), [], []);
        expect(r).toHaveLength(1);
        expect(r[0].weekLabel).toBe('1주차');
        expect(r[0].issues).toEqual([]);
    });

    it('요일별 최소 인원 미달을 경고한다', () => {
        const week = baseWeek({
            4: {
                isFullAttendance: false,
                doctorAliases: ['오'],
                working: ['a', 'b', 'c', 'd', 'e'],
            },
        });
        const r = validateSchedule(week, [], [setting('목', { min_staff_without_ortho: 6 })]);
        expect(msgs(r)).toContain('목요일 5명 (최소 6)');
    });

    it('교정일 교정 인원이 3명 미만이면 경고한다', () => {
        const week = baseWeek({
            5: {
                isFullAttendance: false,
                doctorAliases: ['정'],
                isOrthoDay: true,
                orthoStaffCount: 2,
                working: ['a'],
            },
        });
        const r = validateSchedule(week, [], []);
        expect(msgs(r)).toContain('금요일 교정 2명 (최소 3)');
    });

    it('일요일 팀장이 없으면 경고한다', () => {
        const week = baseWeek({
            0: {
                isFullAttendance: false,
                doctorAliases: ['Y'],
                working: ['a'],
                hasTeamLeader: false,
            },
        });
        const r = validateSchedule(week, [], []);
        expect(msgs(r)).toContain('일요일 팀장 미배정');
    });

    it('일요일에 신규 직원이 배정되면 경고한다', () => {
        const week = baseWeek({
            0: {
                isFullAttendance: false,
                doctorAliases: ['Y'],
                working: ['서이'],
                hasTeamLeader: true,
            },
        });
        const staff = [makeStaff({ name: '서이', career: '신규' })];
        const r = validateSchedule(week, staff, []);
        expect(msgs(r)).toContain('일요일 신규 배정: 서이');
    });

    it('야간분리일에 야간 인원이 없으면 경고한다', () => {
        const week = baseWeek({
            3: {
                isFullAttendance: false,
                doctorAliases: ['오'],
                working: ['a'],
                hasNightShift: true,
                nightShiftStaff: [],
            },
        });
        const r = validateSchedule(week, [], []);
        expect(msgs(r)).toContain('수요일 야간 인원 없음');
    });

    it('연차로 설명되지 않게 5일 미만 근무하면 경고한다', () => {
        const week = baseWeek({
            1: { working: ['혜수'] },
            2: { working: ['혜수'] },
            3: { working: ['혜수'] },
            4: { working: ['혜수'] },
        });
        const staff = [makeStaff({ name: '혜수' })];
        const r = validateSchedule(week, staff, []);
        expect(msgs(r)).toContain('혜수 4일 근무');
    });

    it('근무일 부족이 연차로 설명되면 경고 대신 정보로 표시한다', () => {
        const leave = (name: string) => ({ date: '', name, type: '연차' as const });
        const week = baseWeek({
            1: { working: ['예진'] },
            2: { working: ['예진'] },
            3: { working: ['예진'] },
            4: { fullDayOff: [leave('예진')] },
            5: { fullDayOff: [leave('예진')] },
            6: { fullDayOff: [leave('예진')] },
        });
        const staff = [makeStaff({ name: '예진' })];
        const r = validateSchedule(week, staff, []);
        expect(r[0].issues).toContainEqual({ severity: 'info', message: '예진 연차 3일' });
        expect(r[0].issues.every((i) => i.severity !== 'warn')).toBe(true);
    });

    it('6일 초과 근무(휴무 부족)를 경고한다', () => {
        const week = baseWeek({
            1: { working: ['갑'] },
            2: { working: ['갑'] },
            3: { working: ['갑'] },
            4: { working: ['갑'] },
            5: { working: ['갑'] },
            6: { working: ['갑'] },
        });
        const r = validateSchedule(week, [makeStaff({ name: '갑' })], []);
        expect(msgs(r)).toContain('갑 6일 근무 (휴무 부족)');
    });

    it('부분주(가용일 6 미만)는 개인 균형 검사를 건너뛴다', () => {
        const partial = [
            day({ date: '2026-07-06', dayOfWeek: 1, working: ['갑'] }),
            day({ date: '2026-07-07', dayOfWeek: 2, working: ['갑'] }),
            day({ date: '2026-07-08', dayOfWeek: 3, working: ['갑'] }),
        ];
        const r = validateSchedule(partial, [makeStaff({ name: '갑' })], []);
        expect(r[0].issues).toEqual([]);
    });
});

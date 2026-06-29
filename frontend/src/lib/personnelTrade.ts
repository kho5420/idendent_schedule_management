import type { DayAssignment, StaffRow } from '../types';
import { ORTHO_FIXED_COUNT, splitDayNightShift } from './scheduleAssigner';

const SUNDAY = 0;
const NEW_CAREER = '신규';
const EMPTY_SHIFT_SPLIT = { day: [] as string[], night: [] as string[] };

/** 출근 명단에 표기되는 이름 (별칭 우선) */
export function displayName(staff: StaffRow): string {
    return staff.alias ?? staff.name;
}

/**
 * From일에 근무 중인 인원 중 To일로 옮길 수 있는 사람 목록을 반환한다.
 * (같은 주 안에서 평일 휴무를 재배치하는 수동 트레이드용)
 *
 * 포함: From에 근무 중 + To에는 안 나오는 사람.
 * 제외: To에 종일 휴무(연차/주차) 신청, 휴직, To가 일요일인데 신규,
 *       그리고 From이 교정일이고 빼면 교정 3명 미만이 되는 교정 인원.
 * (최소 인원·연차 섞임·야간 균형 등은 막지 않는다 — 수동 편집 존중)
 */
export function eligibleMovers(
    from: DayAssignment,
    to: DayAssignment,
    clinicStaff: StaffRow[]
): StaffRow[] {
    const byName = new Map(clinicStaff.map((s) => [displayName(s), s]));
    const presentOnTo = new Set(to.working);
    const fullDayOffOnTo = new Set(to.fullDayOff.map((r) => r.name));
    // From이 교정일이고 교정 인원이 정원(3)에 걸쳐 있으면 교정 인원은 빼지 못한다.
    const orthoLocked = from.isOrthoDay && from.orthoStaffCount - 1 < ORTHO_FIXED_COUNT;

    return from.working
        .map((name) => byName.get(name))
        .filter((s): s is StaffRow => s != null)
        .filter((s) => {
            const name = displayName(s);
            if (s.is_on_leave) return false;
            if (presentOnTo.has(name)) return false;
            if (fullDayOffOnTo.has(name)) return false;
            if (to.dayOfWeek === SUNDAY && s.career === NEW_CAREER) return false;
            if (orthoLocked && s.is_ortho) return false;
            return true;
        });
}

/** 주어진 근무 인원(StaffRow[])으로 그날의 인원 파생 필드만 다시 계산한다. */
function recomputeRoster(day: DayAssignment, workingStaff: StaffRow[]): DayAssignment {
    const shiftSplit = day.hasNightShift ? splitDayNightShift(workingStaff) : EMPTY_SHIFT_SPLIT;
    return {
        ...day,
        working: workingStaff.map(displayName),
        orthoStaffCount: workingStaff.filter((s) => s.is_ortho).length,
        nightFixedStaff: workingStaff.filter((s) => s.is_night_fixed).map(displayName),
        hasTeamLeader: workingStaff.some((s) => s.is_team_leader),
        dayShiftStaff: shiftSplit.day,
        nightShiftStaff: shiftSplit.night,
    };
}

/**
 * staffId 인원을 From일에서 빼고 To일에 넣은 새 assignments 배열을 반환한다.
 * 두 날짜의 인원 파생 필드(인원수·교정수·팀장·야간 분리)는 다시 계산한다.
 * (원본 배열·객체는 변경하지 않는다)
 */
export function applyTrade(
    assignments: DayAssignment[],
    fromDate: string,
    toDate: string,
    staffId: number,
    clinicStaff: StaffRow[]
): DayAssignment[] {
    const mover = clinicStaff.find((s) => s.id === staffId);
    if (!mover) return assignments;
    const moverName = displayName(mover);
    const byName = new Map(clinicStaff.map((s) => [displayName(s), s]));
    const orderIndex = new Map(clinicStaff.map((s, i) => [displayName(s), i]));

    // 근무 이름 목록을 직원 정렬 순서대로 StaffRow[]로 변환 (표시 순서 일관성)
    const toStaffRows = (names: string[]): StaffRow[] =>
        names
            .map((n) => byName.get(n))
            .filter((s): s is StaffRow => s != null)
            .sort(
                (a, b) =>
                    (orderIndex.get(displayName(a)) ?? 0) - (orderIndex.get(displayName(b)) ?? 0)
            );

    return assignments.map((day) => {
        if (day.date === fromDate) {
            return recomputeRoster(day, toStaffRows(day.working.filter((n) => n !== moverName)));
        }
        if (day.date === toDate) {
            if (day.working.includes(moverName)) return day;
            return recomputeRoster(day, toStaffRows([...day.working, moverName]));
        }
        return day;
    });
}

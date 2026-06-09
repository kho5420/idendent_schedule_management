import type { DayAssignment } from '../types';

function dowToCol(dayOfWeek: number): number {
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

/** dayAssignments를 월~일(7열) 주 단위로 그룹화. 진료일이 없는 요일은 null. */
export function groupAssignmentsByWeek(assignments: DayAssignment[]): (DayAssignment | null)[][] {
    const sorted = [...assignments].sort((a, b) => a.date.localeCompare(b.date));
    const weeks: (DayAssignment | null)[][] = [];
    let current: (DayAssignment | null)[] = new Array(7).fill(null);

    for (const a of sorted) {
        const col = dowToCol(a.dayOfWeek);
        if (col === 0 && current.some((x) => x !== null)) {
            weeks.push(current);
            current = new Array(7).fill(null);
        }
        current[col] = a;
    }
    if (current.some((x) => x !== null)) weeks.push(current);
    return weeks;
}

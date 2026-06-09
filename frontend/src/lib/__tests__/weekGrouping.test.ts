import { describe, it, expect } from 'vitest';
import { groupAssignmentsByWeek } from '../weekGrouping';
import type { DayAssignment } from '../../types';

function mkDay(date: string, dayOfWeek: number): DayAssignment {
    return {
        date,
        dayOfWeek,
        doctorAliases: [],
        isFullAttendance: false,
        working: [],
        fullDayOff: [],
        halfDayOff: [],
        isOrthoDay: false,
        orthoStaffCount: 0,
        nightFixedStaff: [],
        hasTeamLeader: false,
        hasNightShift: false,
        dayShiftStaff: [],
        nightShiftStaff: [],
    };
}

describe('groupAssignmentsByWeek', () => {
    it('월~일 7열로 그룹화하고 없는 요일은 null', () => {
        const days = [
            mkDay('2026-07-01', 3), // 수
            mkDay('2026-07-02', 4), // 목
            mkDay('2026-07-05', 0), // 일
        ];
        const weeks = groupAssignmentsByWeek(days);
        expect(weeks).toHaveLength(1);
        expect(weeks[0][0]).toBeNull(); // 월
        expect(weeks[0][2]?.date).toBe('2026-07-01'); // 수=col2
        expect(weeks[0][6]?.date).toBe('2026-07-05'); // 일=col6
    });

    it('월요일에서 새 주로 분리한다', () => {
        const weeks = groupAssignmentsByWeek([
            mkDay('2026-07-05', 0), // 일 (1주)
            mkDay('2026-07-06', 1), // 월 (2주)
        ]);
        expect(weeks).toHaveLength(2);
        expect(weeks[0][6]?.date).toBe('2026-07-05');
        expect(weeks[1][0]?.date).toBe('2026-07-06');
    });
});

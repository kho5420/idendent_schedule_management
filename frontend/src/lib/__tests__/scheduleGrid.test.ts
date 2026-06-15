import { describe, it, expect } from 'vitest';
import { buildScheduleGrid, pickTabName } from '../scheduleGrid';
import type { DayAssignment, ScheduleMonth } from '../../types';

function mkDay(over: Partial<DayAssignment> & { date: string; dayOfWeek: number }): DayAssignment {
    return {
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
        ...over,
    };
}
const month: ScheduleMonth = { year: 2026, month: 7 };

describe('buildScheduleGrid', () => {
    it('헤더 4행을 기존 양식대로 만든다 (A열 여백, 요일은 B~H)', () => {
        const grid = buildScheduleGrid([], month);
        expect(grid[0]).toEqual(['', '7月']);
        expect(grid[1]).toEqual(['', '26.7.1']);
        expect(grid[2]).toEqual(['', ' ~ 26.7.31']);
        expect(grid[3]).toEqual([
            '',
            '월요일',
            '화요일',
            '수요일',
            '목요일',
            '금요일',
            '토요일',
            '일요일',
        ]);
    });

    it('전체출근일은 날짜+원장 행에 "일 원장님 전체출근", 진료실 행은 formatDayCell', () => {
        const wed = mkDay({
            date: '2026-07-01',
            dayOfWeek: 3,
            isFullAttendance: true,
            working: ['성민', '이은'],
        });
        const grid = buildScheduleGrid([wed], month);
        expect(grid[4][0]).toBe('');
        expect(grid[4][3]).toBe('1 원장님 전체출근');
        expect(grid[5]).toEqual([]);
        expect(grid[6]).toEqual([]);
        expect(grid[7]).toEqual([]);
        expect(grid[8][3]).toContain('성민,이은');
    });

    it('원장 코드가 있으면 "일 코드,코드" 형식으로 표기한다', () => {
        const thu = mkDay({ date: '2026-07-02', dayOfWeek: 4, doctorAliases: ['오', '신'] });
        const grid = buildScheduleGrid([thu], month);
        expect(grid[4][4]).toBe('2 오,신');
    });
});

describe('pickTabName', () => {
    it('충돌이 없으면 baseName 그대로 반환', () => {
        expect(pickTabName(['26.06', '기본틀'], '26.07_생성')).toBe('26.07_생성');
    });

    it('충돌하면 다음 번호를 붙인다', () => {
        expect(pickTabName(['26.07_생성', '26.07_생성2'], '26.07_생성')).toBe('26.07_생성3');
    });
});

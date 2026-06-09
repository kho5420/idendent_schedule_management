import { describe, it, expect } from 'vitest';
import { formatDayCell } from '../scheduleFormatter';
import type { DayAssignment } from '../../types';

function makeAssignment(overrides: Partial<DayAssignment>): DayAssignment {
    return {
        date: '2026-07-01',
        dayOfWeek: 3,
        doctorAliases: [],
        isFullAttendance: false,
        working: [],
        fullDayOff: [],
        halfDayOff: [],
        isOrthoDay: false,
        orthoStaffCount: 0,
        nightFixedStaff: [],
        hasTeamLeader: true,
        hasNightShift: false,
        dayShiftStaff: [],
        nightShiftStaff: [],
        ...overrides,
    };
}

describe('formatDayCell', () => {
    it('출근 인원을 4명씩 줄바꿈하고 마지막에 인원수를 표기한다', () => {
        const cell = formatDayCell(
            makeAssignment({
                working: ['지수', '수현', '성민', '이은', '윤정', '예진', '언경', '서이', '미연'],
            })
        );

        expect(cell).toBe('지수,수현,성민,이은\n윤정,예진,언경,서이\n미연\n\n(9)');
    });

    it('휴무 신청자가 없으면 주석 블록을 생략한다', () => {
        const cell = formatDayCell(makeAssignment({ working: ['지수', '혜수'] }));

        expect(cell).toBe('지수,혜수\n\n(2)');
    });

    it('주차/연차/반차 인원을 항목별로 표기한다', () => {
        const cell = formatDayCell(
            makeAssignment({
                working: ['지수', '혜수'],
                fullDayOff: [
                    { date: '2026-07-01', name: '박민', type: '주차' },
                    { date: '2026-07-01', name: '혜수', type: '주차' },
                    { date: '2026-07-01', name: '미연', type: '연차' },
                ],
                halfDayOff: [{ date: '2026-07-01', name: '언경', type: '반차' }],
            })
        );

        expect(cell).toBe('지수,혜수\n\n(2)\n\n주차:박민,혜수\n연차:미연\n반차:언경');
    });

    it('교정과 진료일에는 (일반+교정) 형식으로 인원수를 표기한다', () => {
        const cell = formatDayCell(
            makeAssignment({
                working: [
                    '박민',
                    '혜수',
                    '지수',
                    '이은',
                    '윤정',
                    '은경',
                    '언경',
                    '서이',
                    '예진',
                    '미연',
                ],
                isOrthoDay: true,
                orthoStaffCount: 3,
            })
        );

        expect(cell).toBe('박민,혜수,지수,이은\n윤정,은경,언경,서이\n예진,미연\n\n(7+3)');
    });

    it('교정과 진료일이어도 교정 인원이 0명이면 일반 형식으로 표기한다', () => {
        const cell = formatDayCell(
            makeAssignment({
                working: ['지수', '혜수'],
                isOrthoDay: true,
                orthoStaffCount: 0,
            })
        );

        expect(cell).toBe('지수,혜수\n\n(2)');
    });

    it('야간 분리 요일은 주간/야간 배정 인원을 "주)", "야)"로 나누어 표기한다', () => {
        const cell = formatDayCell(
            makeAssignment({
                working: ['지수', '혜수', '미연', '서이', '윤정', '언경', '예진'],
                hasNightShift: true,
                dayShiftStaff: ['지수', '혜수', '미연', '서이', '윤정'],
                nightShiftStaff: ['언경', '예진'],
            })
        );

        expect(cell).toBe('주)지수,혜수,미연,서이\n윤정\n(5)\n\n야)언경,예진\n(2)');
    });

    it('야간 분리 요일에도 휴무 주석은 동일하게 표기한다', () => {
        const cell = formatDayCell(
            makeAssignment({
                working: ['지수', '언경'],
                hasNightShift: true,
                dayShiftStaff: ['지수'],
                nightShiftStaff: ['언경'],
                fullDayOff: [{ date: '2026-07-01', name: '미연', type: '연차' }],
            })
        );

        expect(cell).toBe('주)지수\n(1)\n\n야)언경\n(1)\n\n연차:미연');
    });
});

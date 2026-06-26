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

    it('오후반차가 있으면 (오전/오후) 형식으로 인원수를 나눠 표기한다', () => {
        const cell = formatDayCell(
            makeAssignment({
                working: ['지수', '수현', '성민', '이은', '윤정', '예진', '언경', '서이'],
                halfDayOff: [{ date: '2026-07-01', name: '언경', type: '반차', half: '오후' }],
            })
        );

        // 오전 8명 전원 / 오후엔 언경이 빠져 7명
        expect(cell).toBe('지수,수현,성민,이은\n윤정,예진,언경,서이\n\n(8/7)\n\n반차:언경');
    });

    it('오전반차가 있으면 오전 인원이 줄어 (오전/오후)로 표기한다', () => {
        const cell = formatDayCell(
            makeAssignment({
                working: ['지수', '수현', '성민', '이은', '윤정', '예진', '언경', '서이'],
                halfDayOff: [{ date: '2026-07-01', name: '언경', type: '반차', half: '오전' }],
            })
        );

        expect(cell).toBe('지수,수현,성민,이은\n윤정,예진,언경,서이\n\n(7/8)\n\n반차:언경');
    });

    it('교정일에 반차가 있으면 일반 인원만 오전/오후로 나누고 교정 정원은 고정한다', () => {
        const cell = formatDayCell(
            makeAssignment({
                working: ['지수', '수현', '성민', '이은', '윤정', '예진'],
                isOrthoDay: true,
                orthoStaffCount: 3,
                halfDayOff: [{ date: '2026-07-01', name: '예진', type: '반차', half: '오후' }],
            })
        );

        // 일반 3명(오전)/2명(오후), 교정 3명 고정
        expect(cell).toBe('지수,수현,성민,이은\n윤정,예진\n\n(3+3/2+3)\n\n반차:예진');
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

    it('교정 인원이 정원(3명)을 초과하면 교정은 3으로 고정하고 초과분은 일반에 합산한다', () => {
        // 실제 교정 6명(총 10명) → 4+6 이 아니라 7+3 으로 표기
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
                orthoStaffCount: 6,
            })
        );

        expect(cell).toBe('박민,혜수,지수,이은\n윤정,은경,언경,서이\n예진,미연\n\n(7+3)');
    });

    it('교정 인원이 정원(3명) 초과 시 총 6명이면 3+3 으로 표기한다', () => {
        // 교정 4명(총 6명) → 2+4 가 아니라 3+3
        const cell = formatDayCell(
            makeAssignment({
                working: ['지수', '윤정', '은경', '언경', '혜수', '미연'],
                isOrthoDay: true,
                orthoStaffCount: 4,
            })
        );

        expect(cell).toBe('지수,윤정,은경,언경\n혜수,미연\n\n(3+3)');
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

    it('평일 전체휴진(진료·출근 없음)은 "전체 휴진"으로 표기한다', () => {
        const cell = formatDayCell(
            makeAssignment({
                dayOfWeek: 5,
                working: [],
                doctorAliases: [],
                isFullAttendance: false,
            })
        );

        expect(cell).toBe('전체 휴진');
    });

    it('전체휴진일에 명시 연차가 있으면 함께 표기한다', () => {
        const cell = formatDayCell(
            makeAssignment({
                dayOfWeek: 5,
                working: [],
                fullDayOff: [{ date: '2026-07-17', name: '예진', type: '연차' }],
            })
        );

        expect(cell).toBe('전체 휴진\n\n연차:예진');
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

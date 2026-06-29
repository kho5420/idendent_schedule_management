import { describe, it, expect } from 'vitest';
import { eligibleMovers, applyTrade, displayName } from '../personnelTrade';
import type { DayAssignment, StaffRow, CareerLevel } from '../../types';

let nextId = 1;
function staff(name: string, overrides: Partial<StaffRow> = {}): StaffRow {
    return {
        id: nextId++,
        name,
        alias: null,
        use_yn: 'Y',
        employee_type_id: 6,
        career: '중' as CareerLevel,
        team_no: 'A',
        is_ortho: false,
        is_team_leader: false,
        is_night_fixed: false,
        is_weekday_fixed: false,
        is_on_leave: false,
        is_head_dentist_pick: false,
        notes: null,
        sort_order: 0,
        ...overrides,
    };
}

function day(overrides: Partial<DayAssignment>): DayAssignment {
    return {
        date: '2026-07-16',
        dayOfWeek: 4,
        doctorAliases: ['Y'],
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
        ...overrides,
    };
}

describe('eligibleMovers', () => {
    it('From에 근무 중이고 To에는 안 나오는 사람만 반환한다', () => {
        const roster = [staff('지수'), staff('혜수'), staff('미연')];
        const from = day({ date: '2026-07-16', working: ['지수', '혜수', '미연'] });
        const to = day({ date: '2026-07-14', dayOfWeek: 2, working: ['혜수'] }); // 혜수는 이미 14 근무

        const names = eligibleMovers(from, to, roster).map(displayName);
        expect(names).toEqual(['지수', '미연']);
    });

    it('To에 종일 휴무(연차/주차) 신청이 있으면 제외한다', () => {
        const roster = [staff('지수'), staff('미연')];
        const from = day({ working: ['지수', '미연'] });
        const to = day({
            date: '2026-07-14',
            dayOfWeek: 2,
            working: [],
            fullDayOff: [{ date: '2026-07-14', name: '미연', type: '연차' }],
        });

        expect(eligibleMovers(from, to, roster).map(displayName)).toEqual(['지수']);
    });

    it('To가 일요일이면 신규는 제외한다', () => {
        const roster = [staff('지수'), staff('막내', { career: '신규' })];
        const from = day({ working: ['지수', '막내'] });
        const to = day({ date: '2026-07-19', dayOfWeek: 0, working: [] });

        expect(eligibleMovers(from, to, roster).map(displayName)).toEqual(['지수']);
    });

    it('휴직 인원은 제외한다', () => {
        const roster = [staff('지수'), staff('휴직', { is_on_leave: true })];
        const from = day({ working: ['지수', '휴직'] });
        const to = day({ date: '2026-07-14', dayOfWeek: 2, working: [] });

        expect(eligibleMovers(from, to, roster).map(displayName)).toEqual(['지수']);
    });

    it('From이 교정일이고 교정 정원이 3명이면 교정 인원은 뺄 수 없다', () => {
        const roster = [
            staff('교정1', { is_ortho: true }),
            staff('교정2', { is_ortho: true }),
            staff('교정3', { is_ortho: true }),
            staff('일반', { is_ortho: false }),
        ];
        const from = day({
            working: ['교정1', '교정2', '교정3', '일반'],
            isOrthoDay: true,
            orthoStaffCount: 3,
        });
        const to = day({ date: '2026-07-14', dayOfWeek: 2, working: [] });

        // 교정 3명은 제외, 일반만 이동 가능
        expect(eligibleMovers(from, to, roster).map(displayName)).toEqual(['일반']);
    });

    it('교정 인원이 정원(3)을 초과하면 교정 인원도 이동 가능하다', () => {
        const roster = [
            staff('교정1', { is_ortho: true }),
            staff('교정2', { is_ortho: true }),
            staff('교정3', { is_ortho: true }),
            staff('교정4', { is_ortho: true }),
        ];
        const from = day({
            working: ['교정1', '교정2', '교정3', '교정4'],
            isOrthoDay: true,
            orthoStaffCount: 4,
        });
        const to = day({ date: '2026-07-14', dayOfWeek: 2, working: [] });

        expect(eligibleMovers(from, to, roster).map(displayName)).toHaveLength(4);
    });
});

describe('applyTrade', () => {
    it('From에서 빼고 To에 넣으며 인원수를 다시 계산한다', () => {
        const 지수 = staff('지수');
        const roster = [지수, staff('혜수'), staff('미연')];
        const assignments = [
            day({ date: '2026-07-16', working: ['지수', '혜수', '미연'] }),
            day({ date: '2026-07-14', dayOfWeek: 2, working: ['혜수'] }),
        ];

        const next = applyTrade(assignments, '2026-07-16', '2026-07-14', 지수.id, roster);

        const from = next.find((d) => d.date === '2026-07-16')!;
        const to = next.find((d) => d.date === '2026-07-14')!;
        expect(from.working).toEqual(['혜수', '미연']);
        expect(to.working).toEqual(['지수', '혜수']);
    });

    it('교정 인원 이동 시 양쪽의 교정수(orthoStaffCount)가 갱신된다', () => {
        const 교정 = staff('교정', { is_ortho: true });
        const roster = [교정, staff('일반')];
        const assignments = [
            day({ date: '2026-07-16', working: ['교정', '일반'], orthoStaffCount: 1 }),
            day({ date: '2026-07-14', dayOfWeek: 2, working: [], orthoStaffCount: 0 }),
        ];

        const next = applyTrade(assignments, '2026-07-16', '2026-07-14', 교정.id, roster);

        expect(next.find((d) => d.date === '2026-07-16')!.orthoStaffCount).toBe(0);
        expect(next.find((d) => d.date === '2026-07-14')!.orthoStaffCount).toBe(1);
    });

    it('원본 배열을 변경하지 않는다', () => {
        const 지수 = staff('지수');
        const roster = [지수, staff('혜수')];
        const assignments = [
            day({ date: '2026-07-16', working: ['지수', '혜수'] }),
            day({ date: '2026-07-14', dayOfWeek: 2, working: [] }),
        ];

        applyTrade(assignments, '2026-07-16', '2026-07-14', 지수.id, roster);

        expect(assignments[0].working).toEqual(['지수', '혜수']);
        expect(assignments[1].working).toEqual([]);
    });
});

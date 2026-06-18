import { describe, it, expect } from 'vitest';
import { planWeeklyOffDays } from '../weeklyOffPlanner';
import { assignDailySchedule } from '../scheduleAssigner';
import type { StaffRow, DoctorDayInfo, LeaveRequest, ScheduleSetting } from '../../types';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 실제 DB 직원 (employee_type_id=6, 활성 11명; 민주는 휴직 제외)
function S(o: Partial<StaffRow> & { id: number; name: string; alias: string }): StaffRow {
    return {
        use_yn: 'Y',
        employee_type_id: 6,
        career: '고',
        team_no: null,
        is_ortho: false,
        is_team_leader: false,
        is_night_fixed: false,
        is_weekday_fixed: false,
        is_on_leave: false,
        is_head_dentist_pick: false,
        notes: null,
        sort_order: o.id,
        ...o,
    };
}
const clinicStaff: StaffRow[] = [
    S({
        id: 6,
        name: '강성민',
        alias: '성민',
        team_no: 'A',
        is_team_leader: true,
        is_head_dentist_pick: true,
        sort_order: 5,
    }),
    S({
        id: 5,
        name: '노이은',
        alias: '이은',
        team_no: 'A',
        is_team_leader: true,
        is_head_dentist_pick: true,
        sort_order: 7,
    }),
    S({
        id: 9,
        name: '김윤정',
        alias: '윤정',
        team_no: 'A',
        is_ortho: true,
        is_head_dentist_pick: true,
        sort_order: 8,
    }),
    S({
        id: 14,
        name: '김은경',
        alias: '은경',
        team_no: 'B',
        is_ortho: true,
        is_head_dentist_pick: true,
        sort_order: 9,
    }),
    S({
        id: 12,
        name: '차언경',
        alias: '언경',
        team_no: 'B',
        is_ortho: true,
        is_weekday_fixed: true,
        sort_order: 10,
    }),
    S({
        id: 10,
        name: '하지수',
        alias: '지수',
        is_ortho: true,
        is_night_fixed: true,
        sort_order: 11,
    }),
    S({ id: 8, name: '김혜수', alias: '혜수', team_no: 'B', is_ortho: true, sort_order: 12 }),
    S({
        id: 11,
        name: '최미연',
        alias: '미연',
        team_no: 'A',
        career: '중',
        is_ortho: true,
        sort_order: 13,
    }),
    S({
        id: 13,
        name: '강예진',
        alias: '예진',
        team_no: 'A',
        career: '중',
        is_ortho: true,
        sort_order: 14,
    }),
    S({ id: 15, name: '전수현', alias: '수현', team_no: 'B', career: '저', sort_order: 15 }),
    S({ id: 16, name: '임서이', alias: '서이', team_no: 'A', career: '신규', sort_order: 16 }),
];
const 정원장 = S({ id: 4, name: '정다운', alias: '정', employee_type_id: 2, is_ortho: true });
const 대표원장 = S({ id: 1, name: '윤득영', alias: 'Y', employee_type_id: 1 });
const 오원장 = S({ id: 2, name: '오주애', alias: '오', employee_type_id: 2 });
const 신원장 = S({ id: 3, name: '신혜준', alias: '신', employee_type_id: 2 });
const doctors = [대표원장, 오원장, 신원장, 정원장];

const settings: ScheduleSetting[] = [
    ['일', false, 7],
    ['월', false, 9],
    ['화', false, 9],
    ['수', true, 12],
    ['목', false, 6],
    ['금', false, 8],
    ['토', false, 7],
].map(([d, n, f], i) => ({
    id: i + 1,
    day_name: d as string,
    sort_order: i,
    min_staff_with_ortho: f as number,
    min_staff_without_ortho: f as number,
    min_staff_on_leave: 0,
    has_night_shift: n as boolean,
}));

// 원장 스케줄 7/6~7/12 (이미지 재구성)
const doctorSchedule: DoctorDayInfo[] = [
    { date: '2026-07-06', dayOfWeek: 1, doctorAliases: ['Y', '신'], isFullAttendance: false },
    { date: '2026-07-07', dayOfWeek: 2, doctorAliases: ['Y', '오', '신'], isFullAttendance: false },
    { date: '2026-07-08', dayOfWeek: 3, doctorAliases: [], isFullAttendance: true },
    { date: '2026-07-09', dayOfWeek: 4, doctorAliases: ['오', '신'], isFullAttendance: false },
    { date: '2026-07-10', dayOfWeek: 5, doctorAliases: ['Y', '오', '정'], isFullAttendance: false },
    { date: '2026-07-11', dayOfWeek: 6, doctorAliases: ['오', '신'], isFullAttendance: false },
    { date: '2026-07-12', dayOfWeek: 0, doctorAliases: ['Y'], isFullAttendance: false },
];

// 실제 휴무신청 7/6~7/12
const leaveRequests: LeaveRequest[] = [
    { date: '2026-07-09', name: '예진', type: '주차' },
    { date: '2026-07-09', name: '지수', type: '주차' },
    { date: '2026-07-10', name: '예진', type: '주차' },
    { date: '2026-07-10', name: '수진', type: '연차' },
    { date: '2026-07-11', name: '성민', type: '주차' },
    { date: '2026-07-11', name: '예진', type: '연차' },
    { date: '2026-07-11', name: '혜수', type: '주차' },
    { date: '2026-07-12', name: '예진', type: '연차' },
    { date: '2026-07-12', name: '혜수', type: '주차' },
    { date: '2026-07-12', name: '언경', type: '주차' },
    { date: '2026-07-12', name: '미연', type: '주차' },
];

describe('실제 7월 6~12 주간 검증', () => {
    const planned = planWeeklyOffDays(clinicStaff, doctorSchedule, leaveRequests, settings, 0);
    const days = assignDailySchedule(
        clinicStaff,
        doctors,
        leaveRequests,
        doctorSchedule,
        settings,
        { year: 2026, month: 7 },
        planned
    );

    const dump = (alias: string) =>
        days.map((d) => {
            if (d.working.includes(alias)) return `${d.date.slice(8)}:근무`;
            const off = [...d.fullDayOff, ...d.halfDayOff].find((r) => r.name === alias);
            if (off) return `${d.date.slice(8)}:${off.type}`;
            return `${d.date.slice(8)}:???`;
        });

    it('실제 min_staff_on_leave 설정 시 모든 평일이 하한을 충족한다(목 5→6 보정)', () => {
        // 실제 DB schedule_setting 값 (without_ortho / on_leave 분리)
        const real: ScheduleSetting[] = [
            ['일', false, 7, 7],
            ['월', false, 9, 9],
            ['화', false, 10, 9],
            ['수', true, 12, 11],
            ['목', false, 7, 6],
            ['금', false, 9, 8],
            ['토', false, 7, 7],
        ].map(([d, n, wo, ol], i) => ({
            id: i + 1,
            day_name: d as string,
            sort_order: i,
            min_staff_with_ortho: wo as number,
            min_staff_without_ortho: wo as number,
            min_staff_on_leave: ol as number,
            has_night_shift: n as boolean,
        }));
        const plannedReal = planWeeklyOffDays(
            clinicStaff,
            doctorSchedule,
            leaveRequests,
            real,
            0,
            doctors
        );
        const daysReal = assignDailySchedule(
            clinicStaff,
            doctors,
            leaveRequests,
            doctorSchedule,
            real,
            { year: 2026, month: 7 },
            plannedReal
        );

        // 평일(월~금)은 모두 on_leave 하한 이상이어야 한다. 특히 목요일은 보정 전 5명 → 6명.
        const onLeaveFloor = Object.fromEntries(
            real.map((s) => [s.day_name, s.min_staff_on_leave])
        );
        for (const d of daysReal) {
            if (d.dayOfWeek >= 1 && d.dayOfWeek <= 5) {
                expect(d.working.length).toBeGreaterThanOrEqual(
                    onLeaveFloor[DAY_NAMES[d.dayOfWeek]]
                );
            }
        }
        const byDate = Object.fromEntries(daysReal.map((d) => [d.date.slice(8), d.working.length]));
        expect(byDate['09']).toBe(6); // 목요일: 5 → 6 보정
        expect(byDate['07']).toBe(9); // 화요일(비교정)에서 1명 공여 → 10 → 9
        expect(byDate['10']).toBe(10); // 금요일(교정일)은 후순위라 그대로 10 유지
    });

    it('지수: 10일(금)에 사라지지 않고 근무한다', () => {
        console.log('지수:', dump('지수').join('  '));
        const fri = days.find((d) => d.date === '2026-07-10')!;
        const shown =
            fri.working.includes('지수') ||
            [...fri.fullDayOff, ...fri.halfDayOff].some((r) => r.name === '지수');
        expect(shown).toBe(true);
    });

    it('예진: 평일 주차 2회 → 주말 추가 off 없음(월·화·수 근무, 목·금 주차, 토·일 연차)', () => {
        console.log('예진:', dump('예진').join('  '));
        // 플래너가 예진에게 추가한 off가 없어야 한다
        expect(planned.get(13)!.size).toBe(0);
        const byDate = Object.fromEntries(dump('예진').map((s) => s.split(':')));
        expect(byDate['06']).toBe('근무');
        expect(byDate['07']).toBe('근무');
        expect(byDate['09']).toBe('주차');
        expect(byDate['10']).toBe('주차');
        expect(byDate['11']).toBe('연차');
        expect(byDate['12']).toBe('연차');
    });
});

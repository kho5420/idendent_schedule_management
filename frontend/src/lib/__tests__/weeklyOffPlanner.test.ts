import { describe, it, expect } from 'vitest';
import { planWeeklyOffDays } from '../weeklyOffPlanner';
import type { StaffRow, DoctorDayInfo, ScheduleSetting } from '../../types';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
function makeSettings(
    over: (day: string) => Partial<ScheduleSetting> = () => ({})
): ScheduleSetting[] {
    return DAY_NAMES.map((day_name, i) => ({
        id: i + 1,
        day_name,
        sort_order: i,
        min_staff_with_ortho: 0,
        min_staff_without_ortho: 0,
        min_staff_on_leave: 0,
        has_night_shift: false,
        ...over(day_name),
    }));
}

let nextId = 1;
function makeStaff(overrides: Partial<StaffRow>): StaffRow {
    return {
        id: nextId++,
        name: '이름',
        alias: null,
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
        sort_order: nextId,
        ...overrides,
    };
}

function makeDay(date: string, dayOfWeek: number): DoctorDayInfo {
    return { date, dayOfWeek, doctorAliases: [], isFullAttendance: true };
}

// July 2026: starts Wednesday(3)
// Week 1: Jul 1(Wed,3) ~ Jul 5(Sun,0)   — partial week
// Week 2: Jul 6(Mon,1) ~ Jul 12(Sun,0)  — full week
// Week 3: Jul 13(Mon,1) ~ Jul 19(Sun,0) — full week
const WEEK2: DoctorDayInfo[] = [
    makeDay('2026-07-06', 1), // Mon
    makeDay('2026-07-07', 2), // Tue
    makeDay('2026-07-08', 3), // Wed
    makeDay('2026-07-09', 4), // Thu
    makeDay('2026-07-10', 5), // Fri
    makeDay('2026-07-11', 6), // Sat
    makeDay('2026-07-12', 0), // Sun
];
const WEEK3: DoctorDayInfo[] = [
    makeDay('2026-07-13', 1),
    makeDay('2026-07-14', 2),
    makeDay('2026-07-15', 3),
    makeDay('2026-07-16', 4),
    makeDay('2026-07-17', 5),
    makeDay('2026-07-18', 6),
    makeDay('2026-07-19', 0),
];
const WEEK4: DoctorDayInfo[] = [
    makeDay('2026-07-20', 1),
    makeDay('2026-07-21', 2),
    makeDay('2026-07-22', 3),
    makeDay('2026-07-23', 4),
    makeDay('2026-07-24', 5),
    makeDay('2026-07-25', 6),
    makeDay('2026-07-26', 0),
];

const TWO_WEEKS = [...WEEK2, ...WEEK3];
const THREE_WEEKS = [...WEEK2, ...WEEK3, ...WEEK4];

describe('planWeeklyOffDays', () => {
    it('weekday_fixed 직원은 토·일 전체를 off로 배정한다', () => {
        const 언경 = makeStaff({ name: '언경', is_weekday_fixed: true });
        const result = planWeeklyOffDays([언경], WEEK2, []);

        expect(result.get(언경.id)).toContain('2026-07-11'); // 토
        expect(result.get(언경.id)).toContain('2026-07-12'); // 일
    });

    it('신규 직원은 일요일을 off로 배정하고 토요일은 근무한다', () => {
        const 서이 = makeStaff({ name: '서이', career: '신규' });
        const result = planWeeklyOffDays([서이], WEEK2, []);

        expect(result.get(서이.id)).toContain('2026-07-12'); // 일
        expect(result.get(서이.id)).not.toContain('2026-07-11'); // 토 근무
    });

    it('비weekday_fixed 직원은 매 주당 평일 1일씩 off를 배정한다', () => {
        const staff = [
            makeStaff({ name: 'A' }),
            makeStaff({ name: 'B' }),
            makeStaff({ name: 'C' }),
        ];
        const result = planWeeklyOffDays(staff, TWO_WEEKS, []);

        const week2Weekdays = [
            '2026-07-06',
            '2026-07-07',
            '2026-07-08',
            '2026-07-09',
            '2026-07-10',
        ];
        const week3Weekdays = [
            '2026-07-13',
            '2026-07-14',
            '2026-07-15',
            '2026-07-16',
            '2026-07-17',
        ];

        for (const s of staff) {
            const offs = result.get(s.id)!;
            const week2Off = week2Weekdays.filter((d) => offs.has(d));
            const week3Off = week3Weekdays.filter((d) => offs.has(d));
            expect(week2Off).toHaveLength(1);
            expect(week3Off).toHaveLength(1);
        }
    });

    it('비weekday_fixed 직원은 매 주당 주말 1일씩 off를 배정한다', () => {
        const staff = [makeStaff({ name: 'A' }), makeStaff({ name: 'B' })];
        const result = planWeeklyOffDays(staff, TWO_WEEKS, []);

        const weekends = [
            { sat: '2026-07-11', sun: '2026-07-12' },
            { sat: '2026-07-18', sun: '2026-07-19' },
        ];

        for (const s of staff) {
            const offs = result.get(s.id)!;
            for (const { sat, sun } of weekends) {
                const satOff = offs.has(sat);
                const sunOff = offs.has(sun);
                expect(satOff || sunOff).toBe(true); // 1일은 쉬어야 함
                expect(satOff && sunOff).toBe(false); // 2일 모두 쉬면 안 됨
            }
        }
    });

    it('일요일에는 팀장(is_team_leader)이 최소 1명 근무한다', () => {
        // 팀장 1명이 parity상 일요일 off가 될 상황이어도 보정되어야 함
        const leader = makeStaff({ name: '팀장', is_team_leader: true });
        const others = [makeStaff({ name: 'A' }), makeStaff({ name: 'B' })];
        const staff = [others[0], leader, others[1]]; // 팀장이 staffIdx=1 → 일요일 off 패턴

        const result = planWeeklyOffDays(staff, WEEK2, []);

        // 첫 주 일요일에 팀장이 근무해야 한다 (off가 아닌 상태)
        expect(result.get(leader.id)).not.toContain('2026-07-12');
    });

    it('일요일 근무는 월 2회를 초과하지 않는다', () => {
        const 갑 = makeStaff({ name: '갑' });
        const result = planWeeklyOffDays([갑], THREE_WEEKS, []);

        const sundays = ['2026-07-12', '2026-07-19', '2026-07-26'];
        const workedSundays = sundays.filter((d) => !result.get(갑.id)!.has(d));
        expect(workedSundays.length).toBeLessThanOrEqual(2);
    });

    it('대표원장(Y)이 특정 평일에 없으면 is_head_dentist_pick 직원을 같은 날 off로 배정한다', () => {
        const pick = makeStaff({ name: 'P', is_head_dentist_pick: true });
        const normal = makeStaff({ name: 'N' });
        // Jul 9(목)에 Y 없음, 나머지 평일에는 Y 있음
        const schedule = WEEK2.map((d) =>
            d.date === '2026-07-09'
                ? { ...d, doctorAliases: ['오'], isFullAttendance: false }
                : { ...d, doctorAliases: ['Y', '오'], isFullAttendance: false }
        );
        const result = planWeeklyOffDays([pick, normal], schedule, []);
        expect(result.get(pick.id)).toContain('2026-07-09');
    });

    it('is_on_leave 직원은 off 계획에서 제외한다', () => {
        const 휴직자 = makeStaff({ name: '휴직자', is_on_leave: true });
        const result = planWeeklyOffDays([휴직자], WEEK2, []);

        const offs = result.get(휴직자.id);
        expect(!offs || offs.size === 0).toBe(true);
    });

    it('주차(평일)가 있으면 그 주 평일 off를 별도 배정하지 않는다', () => {
        const 갑 = makeStaff({ name: '갑' });
        // 갑이 수요일(Jul 8)에 주차 → 플래너 평일 off 추가 없음
        const leaves = [{ date: '2026-07-08', name: '갑', type: '주차' as const }];
        const result = planWeeklyOffDays([갑], WEEK2, leaves);

        const offs = result.get(갑.id)!;
        const week2Weekdays = [
            '2026-07-06',
            '2026-07-07',
            '2026-07-08',
            '2026-07-09',
            '2026-07-10',
        ];
        const weekdayOffs = week2Weekdays.filter((d) => offs.has(d));
        expect(weekdayOffs).toHaveLength(0); // 주차가 이미 처리하므로 플래너 추가 없음

        // 주말 off는 여전히 배정
        expect(offs.has('2026-07-11') || offs.has('2026-07-12')).toBe(true);
    });

    it('평일 주차가 2회면 그 주 주말 off를 배정하지 않는다(평일 2회가 정기 휴무를 모두 대체)', () => {
        const 갑 = makeStaff({ name: '갑' });
        // 갑이 목·금(Jul 9·10)에 평일 주차 2회 → 평일·주말 추가 off 없음, 주말은 정상 근무
        const leaves = [
            { date: '2026-07-09', name: '갑', type: '주차' as const },
            { date: '2026-07-10', name: '갑', type: '주차' as const },
        ];
        const result = planWeeklyOffDays([갑], WEEK2, leaves);

        const offs = result.get(갑.id)!;
        // 플래너가 추가한 off가 없어야 한다 (명시 주차 2일 외에는 비어 있음)
        expect(offs.has('2026-07-11')).toBe(false); // 토 근무
        expect(offs.has('2026-07-12')).toBe(false); // 일 근무
        const week2Weekdays = ['2026-07-06', '2026-07-07', '2026-07-08'];
        expect(week2Weekdays.filter((d) => offs.has(d))).toHaveLength(0);
    });

    it('주차(주말)가 있으면 그 주 주말 off를 별도 배정하지 않는다', () => {
        const 갑 = makeStaff({ name: '갑' });
        // 갑이 토요일(Jul 11)에 주차 → 플래너 주말 off 추가 없음
        const leaves = [{ date: '2026-07-11', name: '갑', type: '주차' as const }];
        const result = planWeeklyOffDays([갑], WEEK2, leaves);

        const offs = result.get(갑.id)!;
        expect(offs.has('2026-07-11')).toBe(false); // 플래너가 토요일 추가 안 함
        expect(offs.has('2026-07-12')).toBe(false); // 일요일도 추가 안 함

        // 평일 off는 여전히 배정
        const week2Weekdays = [
            '2026-07-06',
            '2026-07-07',
            '2026-07-08',
            '2026-07-09',
            '2026-07-10',
        ];
        expect(week2Weekdays.some((d) => offs.has(d))).toBe(true);
    });

    it('야간시프트(has_night_shift) 요일은 평일 off 후보에서 제외한다', () => {
        const staff = [
            makeStaff({ name: 'A' }),
            makeStaff({ name: 'B' }),
            makeStaff({ name: 'C' }),
        ];
        const settings = makeSettings((d) => (d === '수' ? { has_night_shift: true } : {}));
        const result = planWeeklyOffDays(staff, WEEK2, [], settings);

        const wed = '2026-07-08';
        const otherWeekdays = ['2026-07-06', '2026-07-07', '2026-07-09', '2026-07-10'];
        for (const s of staff) {
            const offs = result.get(s.id)!;
            expect(offs.has(wed)).toBe(false); // 수요일은 off 배정 안 함
            // 평일 off 1일은 여전히 다른 요일에 배정
            expect(otherWeekdays.filter((d) => offs.has(d))).toHaveLength(1);
        }
    });

    it('각 요일의 min_staff_without_ortho 하한을 지켜 여유 큰 요일로 평일 off를 몰아 배정한다', () => {
        const staff = ['A', 'B', 'C', 'D', 'E'].map((name) => makeStaff({ name }));
        // 목요일만 하한 0, 나머지 평일 하한 5 → 5명 모두 off는 목요일에만 가능
        const settings = makeSettings((d) =>
            d === '목'
                ? { min_staff_without_ortho: 0 }
                : ['월', '화', '수', '금'].includes(d)
                  ? { min_staff_without_ortho: 5 }
                  : {}
        );
        const result = planWeeklyOffDays(staff, WEEK2, [], settings);

        const thu = '2026-07-09';
        for (const s of staff) {
            expect(result.get(s.id)!.has(thu)).toBe(true);
        }
    });

    it('월초 부분주(수요일 시작)는 전월 평일까지 한 주로 채워 목·금 하한을 지킨다', () => {
        // 7월이 수요일(1일)에 시작 → 전월(6/29 월, 6/30 화)까지 한 주로 보충되어야 함.
        // 보충이 없으면 목·금에만 off가 몰려 하한(4) 미달.
        const staff = ['A', 'B', 'C', 'D', 'E'].map((name) => makeStaff({ name }));
        const partialWeek: DoctorDayInfo[] = [
            { date: '2026-07-01', dayOfWeek: 3, doctorAliases: [], isFullAttendance: true }, // 수(야간)
            { date: '2026-07-02', dayOfWeek: 4, doctorAliases: ['Y'], isFullAttendance: false }, // 목
            { date: '2026-07-03', dayOfWeek: 5, doctorAliases: ['Y'], isFullAttendance: false }, // 금
        ];
        const settings = makeSettings((d) =>
            d === '수'
                ? { has_night_shift: true }
                : ['목', '금'].includes(d)
                  ? { min_staff_without_ortho: 4 }
                  : {}
        );
        const result = planWeeklyOffDays(staff, partialWeek, [], settings);

        const offOnThu = staff.filter((s) => result.get(s.id)!.has('2026-07-02')).length;
        const offOnFri = staff.filter((s) => result.get(s.id)!.has('2026-07-03')).length;
        // 5명 중 목·금 하한 4 → 각 요일 off는 1명 이하여야 함 (나머지는 보충된 전월 월·화로 분산)
        expect(offOnThu).toBeLessThanOrEqual(1);
        expect(offOnFri).toBeLessThanOrEqual(1);
        // 수요일(야간)에는 off 없음
        for (const s of staff) {
            expect(result.get(s.id)!.has('2026-07-01')).toBe(false);
        }
    });

    it('같은 seed면 평일 off 배치가 동일하다 (재현성)', () => {
        const staff = ['A', 'B', 'C', 'D', 'E'].map((name) => makeStaff({ name }));
        const r1 = planWeeklyOffDays(staff, WEEK2, [], makeSettings(), 42);
        const r2 = planWeeklyOffDays(staff, WEEK2, [], makeSettings(), 42);
        for (const s of staff) {
            expect([...r1.get(s.id)!].sort()).toEqual([...r2.get(s.id)!].sort());
        }
    });

    it('seed가 다르면 평일 off 요일이 달라질 수 있다', () => {
        const staff = ['A', 'B', 'C', 'D', 'E'].map((name) => makeStaff({ name }));
        const weekdays = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10'];
        const offDateOfA = (seed: number) => {
            const r = planWeeklyOffDays(staff, WEEK2, [], makeSettings(), seed);
            return weekdays.find((d) => r.get(staff[0].id)!.has(d));
        };
        const distinct = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(offDateOfA));
        expect(distinct.size).toBeGreaterThan(1);
    });

    it('연차는 정기 off 배정에 영향을 주지 않는다', () => {
        const 갑 = makeStaff({ name: '갑' });
        // 갑이 수요일(Jul 8)에 연차 → 플래너는 이를 무시하고 평일/주말 off를 정상 배정
        const leaves = [{ date: '2026-07-08', name: '갑', type: '연차' as const }];
        const result = planWeeklyOffDays([갑], WEEK2, leaves);

        const offs = result.get(갑.id)!;
        const week2Weekdays = [
            '2026-07-06',
            '2026-07-07',
            '2026-07-08',
            '2026-07-09',
            '2026-07-10',
        ];
        const weekdayOffs = week2Weekdays.filter((d) => offs.has(d));
        expect(weekdayOffs).toHaveLength(1); // 연차와 별개로 평일 off 1일 배정

        expect(offs.has('2026-07-11') || offs.has('2026-07-12')).toBe(true); // 주말 off도 배정
    });

    it('평일 전체휴진일이 있는 주는 다른 평일에 평일 off를 배정하지 않는다', () => {
        const staff = [
            makeStaff({ name: 'A' }),
            makeStaff({ name: 'B' }),
            makeStaff({ name: 'C' }),
        ];
        // WEEK3의 17일(금)을 전체휴진(진료 없음)으로 — 그 주 평일 off는 휴진일이 흡수
        const week3Closure: DoctorDayInfo[] = [
            makeDay('2026-07-13', 1),
            makeDay('2026-07-14', 2),
            makeDay('2026-07-15', 3),
            makeDay('2026-07-16', 4),
            { date: '2026-07-17', dayOfWeek: 5, doctorAliases: [], isFullAttendance: false },
            makeDay('2026-07-18', 6),
            makeDay('2026-07-19', 0),
        ];
        const result = planWeeklyOffDays(staff, [...WEEK2, ...week3Closure], [], makeSettings());

        const week2Weekdays = [
            '2026-07-06',
            '2026-07-07',
            '2026-07-08',
            '2026-07-09',
            '2026-07-10',
        ];
        const week3Weekdays = [
            '2026-07-13',
            '2026-07-14',
            '2026-07-15',
            '2026-07-16',
            '2026-07-17',
        ];
        for (const s of staff) {
            const offs = result.get(s.id)!;
            // 휴진 주: 평일 off 미배정 (휴진일이 그 주 평일 휴무를 흡수)
            expect(week3Weekdays.filter((d) => offs.has(d))).toHaveLength(0);
            // 정상 주(대조군): 평일 off 1일 배정
            expect(week2Weekdays.filter((d) => offs.has(d))).toHaveLength(1);
        }
    });

    it('평일 전체휴진일이 있으면 weekday_fixed 직원은 주말 1일(토요일)을 대체 근무한다', () => {
        const 언경 = makeStaff({ name: '언경', is_weekday_fixed: true });
        const week3Closure: DoctorDayInfo[] = [
            makeDay('2026-07-13', 1),
            makeDay('2026-07-14', 2),
            makeDay('2026-07-15', 3),
            makeDay('2026-07-16', 4),
            { date: '2026-07-17', dayOfWeek: 5, doctorAliases: [], isFullAttendance: false },
            makeDay('2026-07-18', 6),
            makeDay('2026-07-19', 0),
        ];
        const result = planWeeklyOffDays([언경], week3Closure, [], makeSettings());

        const offs = result.get(언경.id)!;
        expect(offs.has('2026-07-18')).toBe(false); // 토요일 대체 근무
        expect(offs.has('2026-07-19')).toBe(true); // 일요일 off

        // 대조군: 휴진 없는 주는 토·일 모두 off
        const normal = planWeeklyOffDays([언경], WEEK3, [], makeSettings());
        expect(normal.get(언경.id)!.has('2026-07-18')).toBe(true);
        expect(normal.get(언경.id)!.has('2026-07-19')).toBe(true);
    });
});

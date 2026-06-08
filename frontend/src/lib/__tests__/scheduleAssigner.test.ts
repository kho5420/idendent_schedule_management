import { describe, it, expect } from 'vitest';
import { assignDailySchedule } from '../scheduleAssigner';
import type { StaffRow, LeaveRequest, DoctorDayInfo, ScheduleSetting } from '../../types';

let nextId = 1;
function makeStaff(overrides: Partial<StaffRow>): StaffRow {
    return {
        id: nextId++,
        name: '이름없음',
        alias: null,
        use_yn: 'Y',
        employee_type_id: 6,
        career: '중',
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

const 지수 = makeStaff({ name: '지수', career: '고', is_ortho: true });
const 혜수 = makeStaff({ name: '혜수', career: '고', is_ortho: false });
const 미연 = makeStaff({ name: '미연', career: '중', is_ortho: true });
const 서이 = makeStaff({ name: '서이', career: '신규', is_ortho: false });
const 윤정 = makeStaff({ name: '윤정', career: '고', is_ortho: true, is_team_leader: true });
const 언경 = makeStaff({ name: '언경', career: '고', is_ortho: true, is_night_fixed: true });
const 수현 = makeStaff({ name: '수현', career: '저', is_ortho: false });
const 휴직자 = makeStaff({ name: '휴직자', is_on_leave: true });

const 대표원장 = makeStaff({ name: '윤득영', alias: 'Y', employee_type_id: 1, is_ortho: false });
const 오원장 = makeStaff({ name: '오주애', alias: '오', employee_type_id: 2, is_ortho: false });
const 정원장 = makeStaff({ name: '정다운', alias: '정', employee_type_id: 2, is_ortho: true });

const month = { year: 2026, month: 7 };

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const scheduleSettings: ScheduleSetting[] = DAY_NAMES.map((day_name, i) => ({
    id: i + 1,
    day_name,
    sort_order: i,
    min_staff_with_ortho: 0,
    min_staff_without_ortho: 0,
    min_staff_on_leave: 0,
    has_night_shift: day_name === '수',
}));

describe('assignDailySchedule', () => {
    it('휴무 신청 명단의 이름은 직원 별칭(alias)과 매칭한다', () => {
        const 최미연 = makeStaff({ name: '최미연', alias: '미연', career: '중', is_ortho: true });
        const staff = [지수, 최미연];
        const leaveRequests: LeaveRequest[] = [{ date: '2026-07-01', name: '미연', type: '연차' }];
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-01', dayOfWeek: 3, doctorAliases: [], isFullAttendance: true },
        ];

        const [day] = assignDailySchedule(
            staff,
            [대표원장],
            leaveRequests,
            doctorSchedule,
            scheduleSettings,
            month
        );

        expect(day.working).toEqual(['지수']);
        expect(day.fullDayOff).toEqual([{ date: '2026-07-01', name: '미연', type: '연차' }]);
    });

    it('휴무 신청자(연차/주차)를 제외한 출근 명단을 산출한다', () => {
        const staff = [지수, 혜수, 미연, 서이, 윤정];
        const leaveRequests: LeaveRequest[] = [{ date: '2026-07-01', name: '혜수', type: '주차' }];
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-01', dayOfWeek: 3, doctorAliases: [], isFullAttendance: true },
        ];

        const [day] = assignDailySchedule(
            staff,
            [대표원장, 오원장, 정원장],
            leaveRequests,
            doctorSchedule,
            scheduleSettings,
            month
        );

        expect(day.working).toEqual(['지수', '미연', '서이', '윤정']);
        expect(day.fullDayOff).toEqual([{ date: '2026-07-01', name: '혜수', type: '주차' }]);
    });

    it('반차 신청자는 출근 명단에 포함하되 반차 목록에 별도 표기한다', () => {
        const staff = [지수, 언경];
        const leaveRequests: LeaveRequest[] = [{ date: '2026-07-02', name: '언경', type: '반차' }];
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-02', dayOfWeek: 4, doctorAliases: ['오'], isFullAttendance: false },
        ];

        const [day] = assignDailySchedule(
            staff,
            [대표원장, 오원장, 정원장],
            leaveRequests,
            doctorSchedule,
            scheduleSettings,
            month
        );

        expect(day.working).toEqual(['지수', '언경']);
        expect(day.halfDayOff).toEqual([{ date: '2026-07-02', name: '언경', type: '반차' }]);
        expect(day.fullDayOff).toEqual([]);
    });

    it('휴직중인 직원(is_on_leave)은 항상 명단에서 제외한다', () => {
        const staff = [지수, 휴직자];
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-01', dayOfWeek: 3, doctorAliases: [], isFullAttendance: true },
        ];

        const [day] = assignDailySchedule(
            staff,
            [대표원장],
            [],
            doctorSchedule,
            scheduleSettings,
            month
        );

        expect(day.working).toEqual(['지수']);
    });

    it('신규 경력 직원은 일요일 명단에서 제외한다', () => {
        const staff = [지수, 서이];
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-05', dayOfWeek: 0, doctorAliases: ['Y'], isFullAttendance: false },
        ];

        const [day] = assignDailySchedule(
            staff,
            [대표원장],
            [],
            doctorSchedule,
            scheduleSettings,
            month
        );

        expect(day.working).toEqual(['지수']);
    });

    it('교정 원장님(is_ortho) 출근일을 판별하고 출근 명단의 교정 가능 인원 수를 센다', () => {
        const staff = [지수, 혜수, 미연, 서이];

        const orthoDay: DoctorDayInfo = {
            date: '2026-07-04',
            dayOfWeek: 6,
            doctorAliases: ['오', '정'],
            isFullAttendance: false,
        };
        const normalDay: DoctorDayInfo = {
            date: '2026-07-06',
            dayOfWeek: 1,
            doctorAliases: ['오'],
            isFullAttendance: false,
        };
        const fullAttendanceDay: DoctorDayInfo = {
            date: '2026-07-01',
            dayOfWeek: 3,
            doctorAliases: [],
            isFullAttendance: true,
        };

        const [d1, d2, d3] = assignDailySchedule(
            staff,
            [대표원장, 오원장, 정원장],
            [],
            [orthoDay, normalDay, fullAttendanceDay],
            scheduleSettings,
            month
        );

        expect(d1.isOrthoDay).toBe(true);
        expect(d1.orthoStaffCount).toBe(2); // 지수, 미연

        expect(d2.isOrthoDay).toBe(false);

        expect(d3.isOrthoDay).toBe(true); // 전체출근 → is_ortho 원장님도 포함
    });

    it('출근 인원 중 야간 고정(is_night_fixed) 인력을 식별한다', () => {
        const staff = [지수, 언경];
        const leaveRequests: LeaveRequest[] = [{ date: '2026-07-02', name: '언경', type: '연차' }];
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-01', dayOfWeek: 3, doctorAliases: [], isFullAttendance: true },
            { date: '2026-07-02', dayOfWeek: 4, doctorAliases: ['오'], isFullAttendance: false },
        ];

        const [d1, d2] = assignDailySchedule(
            staff,
            [대표원장],
            leaveRequests,
            doctorSchedule,
            scheduleSettings,
            month
        );

        expect(d1.nightFixedStaff).toEqual(['언경']);
        expect(d2.nightFixedStaff).toEqual([]); // 언경 연차로 결근 → 야간 고정 인원 없음
    });

    it('야간 분리 요일에는 is_night_fixed 인원을 야간에 고정하고 나머지는 연차가 섞이도록 분배한다', () => {
        const staff = [지수, 언경, 혜수, 미연, 서이, 윤정, 수현];
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-01', dayOfWeek: 3, doctorAliases: [], isFullAttendance: true },
        ];

        const [day] = assignDailySchedule(
            staff,
            [대표원장],
            [],
            doctorSchedule,
            scheduleSettings,
            month
        );

        // is_night_fixed(언경)는 항상 야간, 나머지는 연차(고/중/저/신규)가 섞이도록 분배되며
        // 야간 인원이 이미 있으므로 주간부터 채워 인원수 균형을 맞춘다
        expect(day.nightShiftStaff).toEqual(['언경', '수현', '혜수']);
        expect(day.dayShiftStaff).toEqual(['지수', '미연', '서이', '윤정']);
    });

    it('야간 분리 요일이 아니면 dayShiftStaff/nightShiftStaff는 비워둔다', () => {
        const staff = [지수, 언경];
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-02', dayOfWeek: 4, doctorAliases: ['오'], isFullAttendance: false },
        ];

        const [day] = assignDailySchedule(
            staff,
            [대표원장],
            [],
            doctorSchedule,
            scheduleSettings,
            month
        );

        expect(day.dayShiftStaff).toEqual([]);
        expect(day.nightShiftStaff).toEqual([]);
    });

    it('has_night_shift(schedule_setting)가 true인 요일은 hasNightShift를 표시한다', () => {
        const staff = [지수, 언경];
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-01', dayOfWeek: 3, doctorAliases: [], isFullAttendance: true }, // 수요일
            { date: '2026-07-02', dayOfWeek: 4, doctorAliases: ['오'], isFullAttendance: false }, // 목요일
        ];

        const [wed, thu] = assignDailySchedule(
            staff,
            [대표원장],
            [],
            doctorSchedule,
            scheduleSettings,
            month
        );

        expect(wed.hasNightShift).toBe(true);
        expect(thu.hasNightShift).toBe(false);
    });

    it('doctorAliases가 비어있고 isFullAttendance가 false이면 병원 전체 휴무로 처리한다', () => {
        const staff = [지수, 혜수];
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-17', dayOfWeek: 5, doctorAliases: [], isFullAttendance: false },
        ];
        const [day] = assignDailySchedule(
            staff,
            [대표원장],
            [],
            doctorSchedule,
            scheduleSettings,
            month
        );
        expect(day.working).toHaveLength(0);
    });

    it('교정과 진료일에 is_ortho 인원이 3명을 초과하면 3명으로 제한한다', () => {
        const o1 = makeStaff({ name: 'o1', is_ortho: true });
        const o2 = makeStaff({ name: 'o2', is_ortho: true });
        const o3 = makeStaff({ name: 'o3', is_ortho: true });
        const o4 = makeStaff({ name: 'o4', is_ortho: true });
        const n1 = makeStaff({ name: 'n1', is_ortho: false });
        const staff = [o1, o2, o3, o4, n1];
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-04', dayOfWeek: 6, doctorAliases: ['정'], isFullAttendance: false },
        ];
        const [day] = assignDailySchedule(
            staff,
            [대표원장, 정원장],
            [],
            doctorSchedule,
            scheduleSettings,
            month
        );
        expect(day.orthoStaffCount).toBe(3);
    });

    it('교정과 진료일에 is_ortho 인원이 3명 미만이면 plannedOff 인원에서 추가한다', () => {
        const o1 = makeStaff({ name: 'o1', is_ortho: true });
        const o2 = makeStaff({ name: 'o2', is_ortho: true }); // plannedOff
        const o3 = makeStaff({ name: 'o3', is_ortho: true }); // plannedOff
        const n1 = makeStaff({ name: 'n1', is_ortho: false });
        const staff = [o1, o2, o3, n1];
        const plannedOff = new Map([
            [o2.id, new Set(['2026-07-04'])],
            [o3.id, new Set(['2026-07-04'])],
        ]);
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-04', dayOfWeek: 6, doctorAliases: ['정'], isFullAttendance: false },
        ];
        const [day] = assignDailySchedule(
            staff,
            [대표원장, 정원장],
            [],
            doctorSchedule,
            scheduleSettings,
            month,
            plannedOff
        );
        expect(day.orthoStaffCount).toBe(3);
    });

    it('야간시프트 요일은 plannedOff(정기 휴무)를 무시하고 전원 출근시킨다', () => {
        const staff = [지수, 혜수];
        const plannedOff = new Map([[혜수.id, new Set(['2026-07-08'])]]);
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-08', dayOfWeek: 3, doctorAliases: ['오'], isFullAttendance: false },
        ];

        const [day] = assignDailySchedule(
            staff,
            [대표원장, 오원장],
            [],
            doctorSchedule,
            scheduleSettings,
            month,
            plannedOff
        );

        // has_night_shift 요일이므로 정기 휴무를 무시하고 모두 출근
        expect(day.working).toContain('혜수');
        expect(day.working).toContain('지수');
    });

    it('야간시프트/전체출근 요일은 교정 3명 제한을 적용하지 않고 전원 출근시킨다', () => {
        // 교정 원장(정) 출근 + 수요일(야간) → 교정일이지만 전원 출근해야 함
        const o = [1, 2, 3, 4, 5].map((i) =>
            makeStaff({ name: `o${i}`, is_ortho: true, career: '고' })
        );
        const n1 = makeStaff({ name: 'n1', is_ortho: false });
        const staff = [...o, n1];
        const wed: DoctorDayInfo = {
            date: '2026-07-01',
            dayOfWeek: 3,
            doctorAliases: ['정'],
            isFullAttendance: false,
        };

        const [day] = assignDailySchedule(
            staff,
            [대표원장, 정원장],
            [],
            [wed],
            scheduleSettings,
            month
        );

        expect(day.isOrthoDay).toBe(true);
        expect(day.working).toHaveLength(6); // 교정 3명 제한 미적용 → 전원
        expect(day.orthoStaffCount).toBe(5);
    });

    it('야간시프트 요일이어도 연차/주차 인원은 제외한다', () => {
        const staff = [지수, 혜수];
        const leaveRequests: LeaveRequest[] = [{ date: '2026-07-08', name: '혜수', type: '연차' }];
        const doctorSchedule: DoctorDayInfo[] = [
            { date: '2026-07-08', dayOfWeek: 3, doctorAliases: ['오'], isFullAttendance: false },
        ];

        const [day] = assignDailySchedule(
            staff,
            [대표원장, 오원장],
            leaveRequests,
            doctorSchedule,
            scheduleSettings,
            month
        );

        expect(day.working).toEqual(['지수']);
    });

    it('일요일에 팀장(is_team_leader) 출근 여부를 표시한다', () => {
        const staffWithLeader = [지수, 윤정];
        const staffWithoutLeader = [지수, 혜수];
        const sunday: DoctorDayInfo = {
            date: '2026-07-05',
            dayOfWeek: 0,
            doctorAliases: ['Y'],
            isFullAttendance: false,
        };

        const [withLeader] = assignDailySchedule(
            staffWithLeader,
            [대표원장],
            [],
            [sunday],
            scheduleSettings,
            month
        );
        const [withoutLeader] = assignDailySchedule(
            staffWithoutLeader,
            [대표원장],
            [],
            [sunday],
            scheduleSettings,
            month
        );

        expect(withLeader.hasTeamLeader).toBe(true);
        expect(withoutLeader.hasTeamLeader).toBe(false);
    });
});

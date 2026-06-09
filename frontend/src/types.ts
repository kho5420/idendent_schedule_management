export type ScheduleMonth = { year: number; month: number };

export type InputMethod = 'excel' | 'google';

export type SheetConnection = {
    sheetId: string;
    tabName: string;
} | null;

export type LeaveType = '연차' | '반차' | '주차';

export type LeaveRequest = {
    date: string; // "YYYY-MM-DD"
    name: string;
    type: LeaveType;
};

export type DoctorDayInfo = {
    date: string; // "YYYY-MM-DD"
    dayOfWeek: number; // 0=일, 1=월, ..., 6=토
    doctorAliases: string[]; // staff.alias 코드 목록 (예: ['Y', '오'])
    isFullAttendance: boolean; // "원장님 전체출근"
};

export type DayAssignment = {
    date: string; // "YYYY-MM-DD"
    dayOfWeek: number; // 0=일, 1=월, ..., 6=토
    doctorAliases: string[]; // 그날 출근하는 원장님 alias 코드 (전체출근이면 빈 배열)
    isFullAttendance: boolean; // 원장님 전체 출근 여부
    working: string[]; // 출근 인원 이름 (반차 포함)
    fullDayOff: LeaveRequest[]; // 연차/주차 (하루 휴무)
    halfDayOff: LeaveRequest[]; // 반차
    isOrthoDay: boolean; // 교정과 원장님(is_ortho) 진료일
    orthoStaffCount: number; // 출근 인원 중 is_ortho 인원 수
    nightFixedStaff: string[]; // 출근 인원 중 야간 고정(is_night_fixed) 인원
    hasTeamLeader: boolean; // 출근 인원 중 팀장(is_team_leader) 존재 여부
    hasNightShift: boolean; // 주간/야간 분리 배정 요일 여부 (schedule_setting.has_night_shift)
    dayShiftStaff: string[]; // 주간 배정 인원 (hasNightShift가 true일 때만 채워짐)
    nightShiftStaff: string[]; // 야간 배정 인원 (hasNightShift가 true일 때만 채워짐, is_night_fixed 인원 포함)
};

export type ExistingDayData = {
    date: string; // "YYYY-MM-DD"
    dayOfWeek: number; // 0=일, 1=월, ..., 6=토
    clinicStaff: string[]; // 진료실 스텝 이름 목록
};

export type ScheduleData = {
    month: ScheduleMonth;
    days: ExistingDayData[];
};

export type WeekRow = {
    weekLabel: string; // "1주차"
    monday: string[] | null;
    tuesday: string[] | null;
    wednesday: 'all' | null; // 수요일은 항상 전체 출근
    thursday: string[] | null;
    friday: string[] | null;
    saturday: string[] | null;
};

export type GeneratedSchedule = {
    year: number;
    month: number;
    weeks: WeekRow[];
};

export type StaffMember = {
    name: string;
    isOrtho: boolean;
};

export type StaffConfig = {
    staff: StaffMember[];
};

export type EmployeeType = {
    id: number;
    name: string;
};

export type CareerLevel = '고' | '중' | '저' | '신규';

export type StaffRow = {
    id: number;
    name: string;
    alias: string | null;
    use_yn: 'Y' | 'N';
    employee_type_id: number | null;
    career: CareerLevel | null;
    team_no: string | null;
    is_ortho: boolean;
    is_team_leader: boolean;
    is_night_fixed: boolean;
    is_weekday_fixed: boolean;
    is_on_leave: boolean;
    is_head_dentist_pick: boolean;
    notes: string | null;
    sort_order: number;
};

export type StaffUpdateData = Partial<
    Pick<
        StaffRow,
        | 'name'
        | 'alias'
        | 'employee_type_id'
        | 'career'
        | 'team_no'
        | 'is_ortho'
        | 'is_team_leader'
        | 'is_night_fixed'
        | 'is_weekday_fixed'
        | 'is_on_leave'
        | 'is_head_dentist_pick'
        | 'notes'
        | 'sort_order'
    >
>;

export type ScheduleSetting = {
    id: number;
    day_name: string;
    sort_order: number;
    min_staff_with_ortho: number;
    min_staff_without_ortho: number;
    min_staff_on_leave: number;
    has_night_shift: boolean;
};

export type ScheduleSettingUpdateData = Partial<
    Pick<
        ScheduleSetting,
        | 'min_staff_with_ortho'
        | 'min_staff_without_ortho'
        | 'min_staff_on_leave'
        | 'has_night_shift'
    >
>;

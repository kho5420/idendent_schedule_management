import type {
    StaffRow,
    LeaveRequest,
    DoctorDayInfo,
    DayAssignment,
    ScheduleSetting,
    CareerLevel,
    ScheduleMonth,
} from '../types';

const NEW_CAREER = '신규';
const SUNDAY = 0;
const FULL_DAY_OFF_TYPES: LeaveRequest['type'][] = ['연차', '주차'];
const DAY_NAME_BY_DOW = ['일', '월', '화', '수', '목', '금', '토'];
const CAREER_ORDER: CareerLevel[] = ['고', '중', '저', '신규'];
const EMPTY_SHIFT_SPLIT = { day: [] as string[], night: [] as string[] };

function hasNightShiftOnDay(dayOfWeek: number, scheduleSettings: ScheduleSetting[]): boolean {
    return (
        scheduleSettings.find((s) => s.day_name === DAY_NAME_BY_DOW[dayOfWeek])?.has_night_shift ??
        false
    );
}

function interleaveByCareer(staff: StaffRow[]): StaffRow[] {
    const byCareer = CAREER_ORDER.map((level) => staff.filter((s) => s.career === level));
    const maxLength = Math.max(0, ...byCareer.map((group) => group.length));
    const interleaved: StaffRow[] = [];
    for (let i = 0; i < maxLength; i++) {
        for (const group of byCareer) {
            if (i < group.length) interleaved.push(group[i]);
        }
    }
    return interleaved;
}

function splitDayNightShift(workingStaff: StaffRow[]): { day: string[]; night: string[] } {
    const night: StaffRow[] = workingStaff.filter((s) => s.is_night_fixed);
    const rest = workingStaff.filter((s) => !s.is_night_fixed);

    const day: StaffRow[] = [];
    for (const staffMember of interleaveByCareer(rest)) {
        if (day.length <= night.length) day.push(staffMember);
        else night.push(staffMember);
    }

    return { day: day.map((s) => s.name), night: night.map((s) => s.name) };
}

function isWorkingThatDay(
    staffMember: StaffRow,
    dayOfWeek: number,
    fullDayOffAliases: Set<string>,
    plannedOffDays: Map<number, Set<string>>,
    date: string
): boolean {
    if (staffMember.is_on_leave) return false;
    if (fullDayOffAliases.has(staffMember.alias ?? staffMember.name)) return false;
    if (dayOfWeek === SUNDAY && staffMember.career === NEW_CAREER) return false;
    if (plannedOffDays.get(staffMember.id)?.has(date)) return false;
    return true;
}

function isOrthoDoctorPresent(doctorInfo: DoctorDayInfo, doctors: StaffRow[]): boolean {
    if (doctorInfo.isFullAttendance) {
        return doctors.some((d) => d.is_ortho);
    }
    return doctorInfo.doctorAliases.some(
        (alias) => doctors.find((d) => d.alias === alias)?.is_ortho
    );
}

const ORTHO_FIXED_COUNT = 3;

const EMPTY_DAY = (doctorInfo: DoctorDayInfo): DayAssignment => ({
    date: doctorInfo.date,
    dayOfWeek: doctorInfo.dayOfWeek,
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
});

export function assignDailySchedule(
    clinicStaff: StaffRow[],
    doctors: StaffRow[],
    leaveRequests: LeaveRequest[],
    doctorSchedule: DoctorDayInfo[],
    scheduleSettings: ScheduleSetting[],
    _month: ScheduleMonth,
    plannedOffDays: Map<number, Set<string>> = new Map()
): DayAssignment[] {
    return doctorSchedule.map((doctorInfo) => {
        // 병원 전체 휴무: 의사 없음 + 전체출근 아님 → 직원 배정 없음
        if (!doctorInfo.isFullAttendance && doctorInfo.doctorAliases.length === 0) {
            return EMPTY_DAY(doctorInfo);
        }

        const leavesForDay = leaveRequests.filter((r) => r.date === doctorInfo.date);
        const fullDayOff = leavesForDay.filter((r) => FULL_DAY_OFF_TYPES.includes(r.type));
        const halfDayOff = leavesForDay.filter((r) => r.type === '반차');
        const fullDayOffAliases = new Set(fullDayOff.map((r) => r.name));

        let workingStaff = clinicStaff.filter((s) =>
            isWorkingThatDay(
                s,
                doctorInfo.dayOfWeek,
                fullDayOffAliases,
                plannedOffDays,
                doctorInfo.date
            )
        );

        // 교정과 진료일: is_ortho 인원 정확히 ORTHO_FIXED_COUNT명
        const isOrthoDay = isOrthoDoctorPresent(doctorInfo, doctors);
        if (isOrthoDay) {
            const orthoWorking = workingStaff.filter((s) => s.is_ortho);
            if (orthoWorking.length > ORTHO_FIXED_COUNT) {
                const nonOrtho = workingStaff.filter((s) => !s.is_ortho);
                workingStaff = [...nonOrtho, ...orthoWorking.slice(0, ORTHO_FIXED_COUNT)];
            } else if (orthoWorking.length < ORTHO_FIXED_COUNT) {
                const needed = ORTHO_FIXED_COUNT - orthoWorking.length;
                const workingIds = new Set(workingStaff.map((s) => s.id));
                // plannedOff는 교정 필수 인원 확보를 위해 override, 명시적 연차/주차는 유지
                const addable = clinicStaff
                    .filter((s) => s.is_ortho && !s.is_on_leave)
                    .filter(
                        (s) => !workingIds.has(s.id) && !fullDayOffAliases.has(s.alias ?? s.name)
                    );
                workingStaff = [...workingStaff, ...addable.slice(0, needed)];
            }
        }

        const hasNightShift = hasNightShiftOnDay(doctorInfo.dayOfWeek, scheduleSettings);
        const shiftSplit = hasNightShift ? splitDayNightShift(workingStaff) : EMPTY_SHIFT_SPLIT;

        return {
            date: doctorInfo.date,
            dayOfWeek: doctorInfo.dayOfWeek,
            working: workingStaff.map((s) => s.name),
            fullDayOff,
            halfDayOff,
            isOrthoDay,
            orthoStaffCount: workingStaff.filter((s) => s.is_ortho).length,
            nightFixedStaff: workingStaff.filter((s) => s.is_night_fixed).map((s) => s.name),
            hasTeamLeader: workingStaff.some((s) => s.is_team_leader),
            hasNightShift,
            dayShiftStaff: shiftSplit.day,
            nightShiftStaff: shiftSplit.night,
        };
    });
}

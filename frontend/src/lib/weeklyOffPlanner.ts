import type { StaffRow, DoctorDayInfo, LeaveRequest, ScheduleSetting } from '../types';

interface WeekDates {
    weekdays: string[]; // Mon-Fri dates
    saturday: string | null;
    sunday: string | null;
}

const MAX_SUNDAYS_PER_MONTH = 2;
const DAY_NAME_BY_DOW = ['일', '월', '화', '수', '목', '금', '토'];
const FULL_DAY_OFF_TYPES: LeaveRequest['type'][] = ['연차', '주차'];

function groupByWeek(doctorSchedule: DoctorDayInfo[]): WeekDates[] {
    const sorted = [...doctorSchedule].sort((a, b) => a.date.localeCompare(b.date));
    const weeks: WeekDates[] = [];
    let current: WeekDates = { weekdays: [], saturday: null, sunday: null };

    function hasContent(): boolean {
        return current.weekdays.length > 0 || current.saturday != null || current.sunday != null;
    }

    for (const d of sorted) {
        if (d.dayOfWeek === 1 && hasContent()) {
            weeks.push(current);
            current = { weekdays: [], saturday: null, sunday: null };
        }
        if (d.dayOfWeek >= 1 && d.dayOfWeek <= 5) current.weekdays.push(d.date);
        else if (d.dayOfWeek === 6) current.saturday = d.date;
        else if (d.dayOfWeek === 0) current.sunday = d.date;
    }

    if (hasContent()) weeks.push(current);
    return weeks;
}

function hasJucha(staff: StaffRow, date: string, leaveRequests: LeaveRequest[]): boolean {
    const key = staff.alias ?? staff.name;
    return leaveRequests.some((r) => r.date === date && r.name === key && r.type === '주차');
}

function settingByDow(
    scheduleSettings: ScheduleSetting[],
    dayOfWeek: number
): ScheduleSetting | undefined {
    return scheduleSettings.find((s) => s.day_name === DAY_NAME_BY_DOW[dayOfWeek]);
}

function shiftDate(date: string, deltaDays: number): string {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

/**
 * 부분주(월 경계) 보충: 데이터 첫 주가 월요일이 아니면 전월 평일을, 마지막 주가 일요일로
 * 끝나지 않으면 다음달 날짜를 정상 진료일로 가정해 채운다. → 평일 off가 한 주 전체에 고르게
 * 분산되어 월초/월말 요일이 하한 아래로 몰리지 않는다. (추후 인접월 데이터 DB화로 대체 예정)
 */
function padScheduleToFullWeeks(doctorSchedule: DoctorDayInfo[]): DoctorDayInfo[] {
    if (doctorSchedule.length === 0) return doctorSchedule;
    const sorted = [...doctorSchedule].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const synth = (date: string, dayOfWeek: number): DoctorDayInfo => ({
        date,
        dayOfWeek,
        doctorAliases: ['Y'], // 정상 진료일(대표원장 출근) 가정
        isFullAttendance: false,
    });

    const lead: DoctorDayInfo[] = [];
    for (let i = (first.dayOfWeek - 1 + 7) % 7; i >= 1; i--) {
        lead.push(synth(shiftDate(first.date, -i), (first.dayOfWeek - i + 70) % 7));
    }
    const trail: DoctorDayInfo[] = [];
    for (let i = 1; i <= (7 - last.dayOfWeek) % 7; i++) {
        trail.push(synth(shiftDate(last.date, i), (last.dayOfWeek + i) % 7));
    }
    return [...lead, ...sorted, ...trail];
}

/** 날짜별 종일 휴무(연차/주차) 인원 수 — 평일 off 균형 계산 시 출근 예상 인원에서 차감 */
function countFullDayLeavesByDate(
    available: StaffRow[],
    leaveRequests: LeaveRequest[]
): Map<string, number> {
    const keys = new Set(available.map((s) => s.alias ?? s.name));
    const counts = new Map<string, number>();
    for (const r of leaveRequests) {
        if (FULL_DAY_OFF_TYPES.includes(r.type) && keys.has(r.name)) {
            counts.set(r.date, (counts.get(r.date) ?? 0) + 1);
        }
    }
    return counts;
}

/**
 * 월별 정기 off 계획을 반환한다. (staffId → 플래너가 배정한 쉬는 날짜 Set)
 *
 * - weekday_fixed: 토·일 전체 off
 * - 신규 career: 일요일 off (토요일만 주말 근무)
 * - 나머지: 매주 평일 1일 off + 주말 1일 off (일요일 월 최대 2회 근무)
 * - 일요일에는 팀장(is_team_leader) 최소 1명 근무
 *
 * 평일 off는 야간시프트(has_night_shift) 요일을 제외한 평일에만 배정하며,
 * 각 요일의 min_staff_without_ortho 하한을 지켜 여유(출근예상−하한)가 큰 요일로 몰아
 * 요일별 출근 인원을 균형 있게 맞춘다.
 *
 * 주차(LeaveRequest.type === '주차')는 정기 off로 간주하여 중복 배정하지 않는다.
 * 연차는 정기 off와 별개이므로 무시하고 정상 배정한다.
 */
export function planWeeklyOffDays(
    clinicStaff: StaffRow[],
    doctorSchedule: DoctorDayInfo[],
    leaveRequests: LeaveRequest[],
    scheduleSettings: ScheduleSetting[] = []
): Map<number, Set<string>> {
    const offDays = new Map<number, Set<string>>();
    for (const s of clinicStaff) offDays.set(s.id, new Set());

    const available = clinicStaff.filter((s) => !s.is_on_leave);
    const weekdayFixed = available.filter((s) => s.is_weekday_fixed);
    const rotatable = available.filter((s) => !s.is_weekday_fixed);
    const teamLeaders = rotatable.filter((s) => s.is_team_leader);

    const fullSchedule = padScheduleToFullWeeks(doctorSchedule);
    const weeks = groupByWeek(fullSchedule);

    // 날짜 → 요일 / 야간여부 / 평일 출근 하한 조회용
    const dowByDate = new Map(fullSchedule.map((d) => [d.date, d.dayOfWeek]));
    const isNightShiftDate = (date: string): boolean => {
        const dow = dowByDate.get(date);
        return dow != null && (settingByDow(scheduleSettings, dow)?.has_night_shift ?? false);
    };
    const floorByDate = (date: string): number => {
        const dow = dowByDate.get(date);
        return dow != null
            ? (settingByDow(scheduleSettings, dow)?.min_staff_without_ortho ?? 0)
            : 0;
    };
    const fullDayLeavesByDate = countFullDayLeavesByDate(available, leaveRequests);
    const weekdayWorkerBase = available.length; // 평일에는 휴직 외 전원이 출근 후보

    const sundayWorked = new Map<number, number>();
    for (const s of rotatable) sundayWorked.set(s.id, 0);

    for (let wi = 0; wi < weeks.length; wi++) {
        const week = weeks[wi];

        // weekday_fixed: 토·일 off
        for (const s of weekdayFixed) {
            if (week.saturday) offDays.get(s.id)?.add(week.saturday);
            if (week.sunday) offDays.get(s.id)?.add(week.sunday);
        }

        // 대표원장(Y)이 없는 평일 탐색 (열린 날 중 Y가 오지 않는 날)
        const headDoctorOffWeekday = week.weekdays.find((d) => {
            const dayInfo = fullSchedule.find((i) => i.date === d);
            if (!dayInfo) return false;
            return (
                !dayInfo.isFullAttendance &&
                !dayInfo.doctorAliases.includes('Y') &&
                dayInfo.doctorAliases.length > 0
            );
        });

        // 회전직원: 평일 1일 off — 야간시프트 요일 제외 + min_staff 하한 기반 균형 배정
        const candidateWeekdays = week.weekdays.filter((d) => !isNightShiftDate(d));
        if (candidateWeekdays.length > 0) {
            // 이번 주 후보 요일별 배정된 off 수 (출근 예상 인원 계산용)
            const offCount = new Map<string, number>(candidateWeekdays.map((d) => [d, 0]));
            const projectedWorking = (d: string): number =>
                weekdayWorkerBase - (offCount.get(d) ?? 0) - (fullDayLeavesByDate.get(d) ?? 0);

            for (const s of rotatable) {
                // 이번 주 평일에 이미 주차가 있으면 그것이 평일 off → 추가 배정 건너뜀
                if (week.weekdays.some((d) => hasJucha(s, d, leaveRequests))) continue;

                let offDate: string;
                if (
                    s.is_head_dentist_pick &&
                    headDoctorOffWeekday &&
                    candidateWeekdays.includes(headDoctorOffWeekday)
                ) {
                    // 대표원장 off일과 맞춤 (가중치 최대 — 무조건은 아니나 상당히 높은 우선순위)
                    offDate = headDoctorOffWeekday;
                } else {
                    // 하한을 지키는 후보 중 여유(출근예상−하한)가 가장 큰 요일.
                    // 모두 하한에 걸리면 출근 예상이 가장 많은 요일로 (하한은 최선 노력).
                    const keepsFloor = candidateWeekdays.filter(
                        (d) => projectedWorking(d) - 1 >= floorByDate(d)
                    );
                    const pool = keepsFloor.length > 0 ? keepsFloor : candidateWeekdays;
                    offDate = pool.reduce((best, d) =>
                        projectedWorking(d) - floorByDate(d) >
                        projectedWorking(best) - floorByDate(best)
                            ? d
                            : best
                    );
                }
                offDays.get(s.id)?.add(offDate);
                offCount.set(offDate, (offCount.get(offDate) ?? 0) + 1);
            }
        }

        // 회전직원: 주말 1일 off
        for (let si = 0; si < rotatable.length; si++) {
            const s = rotatable[si];
            const satJucha = week.saturday != null && hasJucha(s, week.saturday, leaveRequests);
            const sunJucha = week.sunday != null && hasJucha(s, week.sunday, leaveRequests);

            // 이번 주 주말에 이미 주차가 있으면 그것이 주말 off → 추가 배정 건너뜀
            if (satJucha || sunJucha) {
                // 토요일 주차 = 토 off, 일 근무 → 일요일 근무 카운트 증가
                if (satJucha && week.sunday) {
                    sundayWorked.set(s.id, (sundayWorked.get(s.id) ?? 0) + 1);
                }
                continue;
            }

            // 신규: 일요일 고정 off
            if (s.career === '신규') {
                if (week.sunday) offDays.get(s.id)?.add(week.sunday);
                continue;
            }

            const hasSat = week.saturday != null;
            const hasSun = week.sunday != null;
            if (!hasSat && !hasSun) continue;

            if (!hasSat) {
                offDays.get(s.id)?.add(week.sunday!);
                continue;
            }
            if (!hasSun) {
                offDays.get(s.id)?.add(week.saturday!);
                continue;
            }

            const worked = sundayWorked.get(s.id) ?? 0;
            const offSunday = worked >= MAX_SUNDAYS_PER_MONTH || (si + wi) % 2 === 1;

            if (offSunday) {
                offDays.get(s.id)?.add(week.sunday!);
            } else {
                offDays.get(s.id)?.add(week.saturday!);
                sundayWorked.set(s.id, worked + 1);
            }
        }

        // 일요일 팀장 최소 1명 보장
        if (week.sunday && week.saturday && teamLeaders.length > 0) {
            const sun = week.sunday;
            const sat = week.saturday;
            const anyLeaderOn = teamLeaders.some(
                (s) => !offDays.get(s.id)?.has(sun) && !hasJucha(s, sun, leaveRequests)
            );
            if (!anyLeaderOn) {
                for (const leader of teamLeaders) {
                    const offs = offDays.get(leader.id);
                    if (offs?.has(sun)) {
                        offs.delete(sun);
                        offs.add(sat);
                        sundayWorked.set(leader.id, (sundayWorked.get(leader.id) ?? 0) + 1);
                        break;
                    }
                }
            }
        }
    }

    return offDays;
}

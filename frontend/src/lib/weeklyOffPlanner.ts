import type { StaffRow, DoctorDayInfo, LeaveRequest } from '../types';

interface WeekDates {
    weekdays: string[]; // Mon-Fri dates
    saturday: string | null;
    sunday: string | null;
}

const MAX_SUNDAYS_PER_MONTH = 2;
const WEEKDAY_CYCLE_STEP = 3; // coprime with 5 → full rotation over weeks

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

/**
 * 월별 정기 off 계획을 반환한다. (staffId → 플래너가 배정한 쉬는 날짜 Set)
 *
 * - weekday_fixed: 토·일 전체 off
 * - 신규 career: 일요일 off (토요일만 주말 근무)
 * - 나머지: 매주 평일 1일 off + 주말 1일 off (일요일 월 최대 2회 근무)
 * - 일요일에는 팀장(is_team_leader) 최소 1명 근무
 *
 * 주차(LeaveRequest.type === '주차')는 정기 off로 간주하여 중복 배정하지 않는다.
 * 연차는 정기 off와 별개이므로 무시하고 정상 배정한다.
 */
export function planWeeklyOffDays(
    clinicStaff: StaffRow[],
    doctorSchedule: DoctorDayInfo[],
    leaveRequests: LeaveRequest[]
): Map<number, Set<string>> {
    const offDays = new Map<number, Set<string>>();
    for (const s of clinicStaff) offDays.set(s.id, new Set());

    const available = clinicStaff.filter((s) => !s.is_on_leave);
    const weekdayFixed = available.filter((s) => s.is_weekday_fixed);
    const rotatable = available.filter((s) => !s.is_weekday_fixed);
    const teamLeaders = rotatable.filter((s) => s.is_team_leader);

    const weeks = groupByWeek(doctorSchedule);

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
            const dayInfo = doctorSchedule.find((i) => i.date === d);
            if (!dayInfo) return false;
            return (
                !dayInfo.isFullAttendance &&
                !dayInfo.doctorAliases.includes('Y') &&
                dayInfo.doctorAliases.length > 0
            );
        });

        // 회전직원: 평일 1일 off
        if (week.weekdays.length > 0) {
            for (let si = 0; si < rotatable.length; si++) {
                const s = rotatable[si];
                // 이번 주 평일에 이미 주차가 있으면 그것이 평일 off → 추가 배정 건너뜀
                const alreadyHasWeekdayJucha = week.weekdays.some((d) =>
                    hasJucha(s, d, leaveRequests)
                );
                if (alreadyHasWeekdayJucha) continue;

                let offDate: string;
                if (s.is_head_dentist_pick && headDoctorOffWeekday) {
                    // 대표원장 off일과 맞춤 (가중치 최대 — 무조건은 아니나 상당히 높은 우선순위)
                    offDate = headDoctorOffWeekday;
                } else {
                    const dayIdx = (si + wi * WEEKDAY_CYCLE_STEP) % week.weekdays.length;
                    offDate = week.weekdays[dayIdx];
                }
                offDays.get(s.id)?.add(offDate);
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

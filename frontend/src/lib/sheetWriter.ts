import type { DayAssignment, ScheduleMonth } from '../types';
import { formatDayCell } from './scheduleFormatter';
import { groupAssignmentsByWeek } from './weekGrouping';

const DAY_NAME_ROW = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

function dateDoctorCell(a: DayAssignment): string {
    const dayNum = parseInt(a.date.slice(-2), 10);
    if (a.isFullAttendance) return `${dayNum} 원장님 전체출근`;
    if (a.doctorAliases.length > 0) return `${dayNum} ${a.doctorAliases.join(',')}`;
    return `${dayNum}`;
}

/** dayAssignments를 기존 스케줄 시트 양식(헤더 4행 + 주별 5행 블록)의 2차원 셀 배열로 변환 */
export function buildScheduleGrid(assignments: DayAssignment[], month: ScheduleMonth): string[][] {
    const yy = String(month.year).slice(-2);
    const lastDay = new Date(month.year, month.month, 0).getDate();
    const grid: string[][] = [
        [`${month.month}月`],
        [`${yy}.${month.month}.1`],
        [` ~ ${yy}.${month.month}.${lastDay}`],
        [...DAY_NAME_ROW],
    ];

    for (const week of groupAssignmentsByWeek(assignments)) {
        // 블록행0: 날짜 + 원장 코드
        grid.push(week.map((a) => (a ? dateDoctorCell(a) : '')));
        // 블록행1~3: 데스크·실장·위생사 (앱 미관리 → 빈 행)
        grid.push([], [], []);
        // 블록행4: 진료실 (미리보기와 동일한 formatDayCell)
        grid.push(week.map((a) => (a ? formatDayCell(a) : '')));
    }
    return grid;
}

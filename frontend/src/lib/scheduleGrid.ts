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

/**
 * dayAssignments를 기존 스케줄 시트 양식(헤더 4행 + 주별 5행 블록)의 2차원 셀 배열로 변환.
 * A열은 빈 여백으로 두고 요일·날짜·진료실은 B~H열에 배치한다.
 */
export function buildScheduleGrid(assignments: DayAssignment[], month: ScheduleMonth): string[][] {
    const yy = String(month.year).slice(-2);
    const lastDay = new Date(month.year, month.month, 0).getDate();
    const grid: string[][] = [
        ['', `${month.month}月`],
        ['', `${yy}.${month.month}.1`],
        ['', ` ~ ${yy}.${month.month}.${lastDay}`],
        ['', ...DAY_NAME_ROW],
    ];

    for (const week of groupAssignmentsByWeek(assignments)) {
        grid.push(['', ...week.map((a) => (a ? dateDoctorCell(a) : ''))]);
        grid.push([], [], []);
        grid.push(['', ...week.map((a) => (a ? formatDayCell(a) : ''))]);
    }
    return grid;
}

/** 기존 제목과 겹치지 않는 탭 이름 결정 (충돌 시 base2, base3 …) — 순수함수 */
export function pickTabName(existingTitles: string[], baseName: string): string {
    const set = new Set(existingTitles);
    if (!set.has(baseName)) return baseName;
    for (let i = 2; ; i++) {
        const name = `${baseName}${i}`;
        if (!set.has(name)) return name;
    }
}

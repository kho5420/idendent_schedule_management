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
 * 기존 시트 정렬에 맞춰 A열은 빈 여백으로 두고 요일·날짜·진료실은 B~H열에 배치한다.
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
        // 블록행0: 날짜 + 원장 코드 (A열 여백 + B~H 요일)
        grid.push(['', ...week.map((a) => (a ? dateDoctorCell(a) : ''))]);
        // 블록행1~3: 데스크·실장·위생사 (앱 미관리 → 빈 행)
        grid.push([], [], []);
        // 블록행4: 진료실 (미리보기와 동일한 formatDayCell)
        grid.push(['', ...week.map((a) => (a ? formatDayCell(a) : ''))]);
    }
    return grid;
}

const API = 'https://sheets.googleapis.com/v4/spreadsheets';

async function fetchTitles(sheetId: string, token: string): Promise<string[]> {
    const res = await fetch(`${API}/${sheetId}?fields=sheets.properties.title`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`구글 시트 API 오류 (${res.status})`);
    const data = await res.json();
    const sheets: Array<{ properties?: { title?: string } }> = data.sheets ?? [];
    return sheets.map((s) => s.properties?.title ?? '');
}

/** 기존 탭과 겹치지 않는 탭 이름 결정 (충돌 시 base2, base3 …) */
export async function resolveTabName(
    sheetId: string,
    token: string,
    baseName: string
): Promise<string> {
    const titles = new Set(await fetchTitles(sheetId, token));
    if (!titles.has(baseName)) return baseName;
    for (let i = 2; ; i++) {
        const name = `${baseName}${i}`;
        if (!titles.has(name)) return name;
    }
}

/** 새 탭 생성 */
export async function createTab(sheetId: string, token: string, tabName: string): Promise<void> {
    const res = await fetch(`${API}/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName } } }] }),
    });
    if (!res.ok) throw new Error(`구글 시트 API 오류 (${res.status})`);
}

/** 그리드를 탭의 A1부터 RAW로 기록 */
export async function writeGrid(
    sheetId: string,
    token: string,
    tabName: string,
    grid: string[][]
): Promise<void> {
    const range = encodeURIComponent(`${tabName}!A1`);
    const res = await fetch(`${API}/${sheetId}/values/${range}?valueInputOption=RAW`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: grid }),
    });
    if (!res.ok) throw new Error(`구글 시트 API 오류 (${res.status})`);
}

/** 새 탭을 만들어 스케줄을 기록하고, 생성된 탭 이름을 반환 */
export async function writeScheduleToNewTab(
    sheetId: string,
    token: string,
    month: ScheduleMonth,
    assignments: DayAssignment[]
): Promise<string> {
    const baseName = `${String(month.year).slice(-2)}.${String(month.month).padStart(2, '0')}_생성`;
    const tabName = await resolveTabName(sheetId, token, baseName);
    await createTab(sheetId, token, tabName);
    await writeGrid(sheetId, token, tabName, buildScheduleGrid(assignments, month));
    return tabName;
}

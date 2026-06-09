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

const TEMPLATE_TAB = '기본틀';

interface SheetMeta {
    sheetId: number;
    title: string;
}

/** 스프레드시트의 모든 탭 메타(gid·제목) 조회 */
async function fetchSheets(sheetId: string, token: string): Promise<SheetMeta[]> {
    const res = await fetch(`${API}/${sheetId}?fields=sheets.properties(sheetId,title)`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`구글 시트 API 오류 (${res.status})`);
    const data = await res.json();
    const sheets: Array<{ properties?: { sheetId?: number; title?: string } }> = data.sheets ?? [];
    return sheets.map((s) => ({
        sheetId: s.properties?.sheetId ?? -1,
        title: s.properties?.title ?? '',
    }));
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

/**
 * 원본 탭을 복제해 새 탭(newName) 생성 — 서식·열너비·메모를 그대로 유지.
 * insertSheetIndex로 삽입 위치 지정(미지정 시 원본 바로 뒤에 끼워져 찾기 어려움).
 */
export async function duplicateSheet(
    sheetId: string,
    token: string,
    sourceSheetId: number,
    newName: string,
    insertSheetIndex?: number
): Promise<void> {
    const duplicateSheetReq: Record<string, unknown> = {
        sourceSheetId,
        newSheetName: newName,
    };
    if (insertSheetIndex != null) duplicateSheetReq.insertSheetIndex = insertSheetIndex;
    const res = await fetch(`${API}/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ duplicateSheet: duplicateSheetReq }] }),
    });
    if (!res.ok) throw new Error(`구글 시트 API 오류 (${res.status})`);
}

/** 지정 범위의 값만 비운다 (서식은 유지). range 예: 'A1:H60' */
export async function clearRange(
    sheetId: string,
    token: string,
    tabName: string,
    range: string
): Promise<void> {
    const r = encodeURIComponent(`${tabName}!${range}`);
    const res = await fetch(`${API}/${sheetId}/values/${r}:clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
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

/**
 * '기본틀' 탭을 복제(서식 유지)해 새 탭을 만들고 스케줄을 기록한다.
 * 복제본의 데이터 영역(A~H) 값만 비운 뒤 그리드를 써넣어, 서식은 유지하고
 * 템플릿의 샘플 값/그룹 행은 비운다. (J열 메모 등 A~H 밖은 보존)
 * 생성된 탭 이름을 반환.
 */
export async function writeScheduleToNewTab(
    sheetId: string,
    token: string,
    month: ScheduleMonth,
    assignments: DayAssignment[]
): Promise<string> {
    const baseName = `${String(month.year).slice(-2)}.${String(month.month).padStart(2, '0')}_생성`;
    const sheets = await fetchSheets(sheetId, token);
    const tabName = pickTabName(
        sheets.map((s) => s.title),
        baseName
    );
    const template = sheets.find((s) => s.title === TEMPLATE_TAB);
    if (!template) throw new Error(`'${TEMPLATE_TAB}' 탭을 찾을 수 없습니다`);
    // 맨 끝에 삽입해 탭 목록에서 바로 찾을 수 있게 한다
    await duplicateSheet(sheetId, token, template.sheetId, tabName, sheets.length);
    await clearRange(sheetId, token, tabName, 'A1:H60');
    await writeGrid(sheetId, token, tabName, buildScheduleGrid(assignments, month));
    return tabName;
}

import type { DayAssignment, ScheduleMonth } from '../types';
import { buildScheduleGrid, pickTabName } from './scheduleGrid';
import { CLOSURE_LABEL, CLOSURE_BG_HEX, CLOSURE_TEXT_HEX } from './scheduleFormatter';

const API = 'https://sheets.googleapis.com/v4/spreadsheets';

/** 한 주 블록의 행 수: 날짜행 + 데스크·실장·위생사 3행 + 진료실행 */
const WEEK_BLOCK_ROWS = 5;

function hexToSheetColor(hex: string): { red: number; green: number; blue: number } {
    const n = parseInt(hex.slice(1), 16);
    return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}

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

/**
 * 원본 탭을 복제해 새 탭(newName) 생성 — 서식·열너비·메모를 그대로 유지.
 * insertSheetIndex로 삽입 위치 지정(미지정 시 원본 바로 뒤에 끼워져 찾기 어려움).
 * 생성된 새 탭의 sheetId(gid)를 반환.
 */
export async function duplicateSheet(
    sheetId: string,
    token: string,
    sourceSheetId: number,
    newName: string,
    insertSheetIndex?: number
): Promise<number> {
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
    const data = await res.json();
    const newId = data.replies?.[0]?.duplicateSheet?.properties?.sheetId;
    if (newId == null) throw new Error('복제된 탭 정보를 가져오지 못했습니다');
    return newId as number;
}

/** 데이터 영역에 자동 줄바꿈(WRAP) 적용 — 긴 글자가 옆칸으로 넘쳐 테두리를 가리는 것 방지 */
export async function setWrap(sheetId: string, token: string, tabSheetId: number): Promise<void> {
    const res = await fetch(`${API}/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requests: [
                {
                    repeatCell: {
                        range: {
                            sheetId: tabSheetId,
                            startRowIndex: 0,
                            endRowIndex: 60,
                            startColumnIndex: 0,
                            endColumnIndex: 8,
                        },
                        cell: { userEnteredFormat: { wrapStrategy: 'WRAP' } },
                        fields: 'userEnteredFormat.wrapStrategy',
                    },
                },
            ],
        }),
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
 * 그리드에서 '전체 휴진' 칸을 찾아 그 날 열 블록(날짜~진료실 5행)에 배경색을 칠하고,
 * '전체 휴진' 글자 칸은 빨간 굵은 글씨로 표시한다. 전체휴진이 없으면 요청을 보내지 않는다.
 */
export async function applyClosureStyles(
    sheetId: string,
    token: string,
    tabSheetId: number,
    grid: string[][]
): Promise<void> {
    const bgColor = hexToSheetColor(CLOSURE_BG_HEX);
    const textColor = hexToSheetColor(CLOSURE_TEXT_HEX);
    const requests: unknown[] = [];
    grid.forEach((rowVals, ri) => {
        rowVals.forEach((val, ci) => {
            if (val !== CLOSURE_LABEL) return;
            // 열 블록 전체 배경색
            requests.push({
                repeatCell: {
                    range: {
                        sheetId: tabSheetId,
                        startRowIndex: ri - (WEEK_BLOCK_ROWS - 1),
                        endRowIndex: ri + 1,
                        startColumnIndex: ci,
                        endColumnIndex: ci + 1,
                    },
                    cell: { userEnteredFormat: { backgroundColor: bgColor } },
                    fields: 'userEnteredFormat.backgroundColor',
                },
            });
            // '전체 휴진' 글자 칸: 빨간 굵은 글씨
            requests.push({
                repeatCell: {
                    range: {
                        sheetId: tabSheetId,
                        startRowIndex: ri,
                        endRowIndex: ri + 1,
                        startColumnIndex: ci,
                        endColumnIndex: ci + 1,
                    },
                    cell: {
                        userEnteredFormat: {
                            textFormat: { bold: true, foregroundColor: textColor },
                        },
                    },
                    fields: 'userEnteredFormat.textFormat.bold,userEnteredFormat.textFormat.foregroundColor',
                },
            });
        });
    });
    if (requests.length === 0) return;
    const res = await fetch(`${API}/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
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
    const newSheetId = await duplicateSheet(
        sheetId,
        token,
        template.sheetId,
        tabName,
        sheets.length
    );
    const grid = buildScheduleGrid(assignments, month);
    await clearRange(sheetId, token, tabName, 'A1:H60');
    await writeGrid(sheetId, token, tabName, grid);
    await setWrap(sheetId, token, newSheetId);
    await applyClosureStyles(sheetId, token, newSheetId, grid);
    return tabName;
}

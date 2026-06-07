import type { ScheduleData, ScheduleMonth, ExistingDayData } from '../types';

function findSheetTabName(month: ScheduleMonth): string {
    return `${String(month.year).slice(-2)}.${String(month.month).padStart(2, '0')}`;
}

function parseStaffNames(cell: unknown): string[] {
    if (typeof cell !== 'string' || !cell) return [];
    return cell
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function extractDay(cell: unknown): number | null {
    if (cell == null) return null;
    const match = String(cell).match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

export async function checkSheetTab(
    sheetId: string,
    token: string,
    tabName: string
): Promise<boolean> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        throw new Error(`Google Sheets API 오류 (${res.status})`);
    }

    const data = await res.json();
    const sheets: Array<{ properties?: { title?: string } }> = data.sheets ?? [];
    return sheets.some((sheet) => sheet.properties?.title === tabName);
}

export async function fetchSheetData(
    sheetId: string,
    token: string,
    month: ScheduleMonth
): Promise<ScheduleData> {
    const tabName = findSheetTabName(month);
    const range = encodeURIComponent(`${tabName}!A1:H100`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        throw new Error(`Google Sheets API 오류 (${res.status})`);
    }

    const data = await res.json();
    const rows: unknown[][] = data.values ?? [];

    const DAY_COL_TO_DOW: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
    const days: ExistingDayData[] = [];
    let rowIdx = 4;

    while (rowIdx < rows.length) {
        const dateRow = rows[rowIdx];
        const clinicRow = rows[rowIdx + 4];
        if (!dateRow || !clinicRow) break;

        for (const [colStr, dow] of Object.entries(DAY_COL_TO_DOW)) {
            const col = Number(colStr);
            const dayNum = extractDay(dateRow[col]);
            if (!dayNum) continue;

            const dateStr = `${month.year}-${String(month.month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            days.push({
                date: dateStr,
                dayOfWeek: dow,
                clinicStaff: parseStaffNames(clinicRow[col]),
            });
        }

        rowIdx += 5;
    }

    return { month, days };
}

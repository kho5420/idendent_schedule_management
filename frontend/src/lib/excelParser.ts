import * as XLSX from 'xlsx';
import type { ScheduleData, ScheduleMonth, ExistingDayData } from '../types';

function findSheetName(wb: XLSX.WorkBook, month: ScheduleMonth): string {
    const target = `${String(month.year).slice(-2)}.${String(month.month).padStart(2, '0')}`;
    const found = wb.SheetNames.find((name) => name.startsWith(target));
    if (!found) throw new Error(`시트를 찾을 수 없습니다: ${target}`);
    return found;
}

function parseStaffNames(cell: string | null | undefined): string[] {
    if (!cell) return [];
    return cell
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function extractDay(dateCell: string | null | undefined): number | null {
    if (!dateCell) return null;
    const match = String(dateCell).match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

export async function parseScheduleExcel(
    buffer: ArrayBuffer,
    month: ScheduleMonth
): Promise<ScheduleData> {
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const sheetName = findSheetName(wb, month);
    const ws = wb.Sheets[sheetName];
    const rows: (string | null)[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: null,
        blankrows: true,
    }) as (string | null)[][];

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
            const staff = parseStaffNames(clinicRow[col]);
            days.push({ date: dateStr, dayOfWeek: dow, clinicStaff: staff });
        }

        rowIdx += 5;
    }

    return { month, days };
}

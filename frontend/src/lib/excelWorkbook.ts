import * as XLSX from 'xlsx';
import type { DayAssignment, ScheduleMonth } from '../types';
import { buildScheduleGrid, pickTabName } from './scheduleGrid';

/** 업로드한 .xlsx File을 워크북으로 읽는다. */
export async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
    const buffer = await file.arrayBuffer();
    return XLSX.read(new Uint8Array(buffer), { type: 'array' });
}

/** 워크북의 탭(시트) 이름 목록. */
export function listSheetNames(wb: XLSX.WorkBook): string[] {
    return wb.SheetNames;
}

/** 지정 탭을 행 배열(unknown[][])로 변환. 탭이 없으면 에러. */
export function sheetToRows(wb: XLSX.WorkBook, tabName: string): unknown[][] {
    const ws = wb.Sheets[tabName];
    if (!ws) throw new Error(`'${tabName}' 탭을 파일에서 찾을 수 없습니다`);
    return XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
        blankrows: true,
    }) as unknown[][];
}

/**
 * 생성된 스케줄을 'YY.MM_생성' 시트로 워크북에 추가한다(충돌 시 번호 부여).
 * 추가된 시트 이름을 반환.
 */
export function appendScheduleSheet(
    wb: XLSX.WorkBook,
    assignments: DayAssignment[],
    month: ScheduleMonth
): string {
    const baseName = `${String(month.year).slice(-2)}.${String(month.month).padStart(2, '0')}_생성`;
    const tabName = pickTabName(wb.SheetNames, baseName);
    const ws = XLSX.utils.aoa_to_sheet(buildScheduleGrid(assignments, month));
    XLSX.utils.book_append_sheet(wb, ws, tabName);
    return tabName;
}

/** 워크북을 .xlsx로 직렬화해 브라우저 다운로드를 트리거한다. */
export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string): void {
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer | Uint8Array;
    const ab =
        buf instanceof ArrayBuffer
            ? buf
            : (buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    const blob = new Blob([ab], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

import ExcelJS from 'exceljs';
import type { DayAssignment, ScheduleMonth } from '../types';
import { buildScheduleGrid, pickTabName } from './scheduleGrid';

const DATA_COLS = 8; // A~H

/** 업로드한 .xlsx File을 워크북으로 읽는다(서식 포함). */
export async function readWorkbook(file: File): Promise<ExcelJS.Workbook> {
    const buffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    return wb;
}

/** 워크북의 탭(시트) 이름 목록. */
export function listSheetNames(wb: ExcelJS.Workbook): string[] {
    return wb.worksheets.map((ws) => ws.name);
}

/** 지정 탭을 0-based 행 배열(셀 표시문자열)로 변환. 탭이 없으면 에러. */
export function sheetToRows(wb: ExcelJS.Workbook, tabName: string): unknown[][] {
    const ws = wb.getWorksheet(tabName);
    if (!ws) throw new Error(`'${tabName}' 탭을 파일에서 찾을 수 없습니다`);
    const colCount = ws.columnCount;
    const rows: unknown[][] = [];
    for (let r = 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const arr: unknown[] = [];
        for (let c = 1; c <= colCount; c++) {
            arr.push(row.getCell(c).text);
        }
        rows.push(arr);
    }
    return rows;
}

/**
 * 소스 탭(sourceTabName)을 서식째 복제해 'YY.MM_생성' 시트를 만들고,
 * 데이터 영역(A~H)을 비운 뒤 생성 스케줄 그리드를 써넣는다(서식 유지).
 * 추가된 시트 이름을 반환. 소스 탭이 없으면 에러.
 */
export function appendScheduleSheet(
    wb: ExcelJS.Workbook,
    sourceTabName: string,
    assignments: DayAssignment[],
    month: ScheduleMonth
): string {
    const source = wb.getWorksheet(sourceTabName);
    if (!source) throw new Error(`'${sourceTabName}' 탭을 파일에서 찾을 수 없습니다`);

    const baseName = `${String(month.year).slice(-2)}.${String(month.month).padStart(2, '0')}_생성`;
    const tabName = pickTabName(listSheetNames(wb), baseName);
    const dest = wb.addWorksheet(tabName);

    // 열너비 복사
    for (let c = 1; c <= source.columnCount; c++) {
        const w = source.getColumn(c).width;
        if (w != null) dest.getColumn(c).width = w;
    }
    // 행높이 + 셀 서식 복사
    source.eachRow({ includeEmpty: true }, (row, r) => {
        const destRow = dest.getRow(r);
        if (row.height != null) destRow.height = row.height;
        row.eachCell({ includeEmpty: true }, (cell, c) => {
            destRow.getCell(c).style = { ...cell.style };
        });
    });

    // 데이터 영역(A~H) 값 비우기 (서식 유지)
    const grid = buildScheduleGrid(assignments, month);
    const lastRow = Math.max(source.rowCount, grid.length);
    for (let r = 1; r <= lastRow; r++) {
        for (let c = 1; c <= DATA_COLS; c++) {
            dest.getRow(r).getCell(c).value = null;
        }
    }
    // 그리드 기록 (빈 칸은 그대로 비움)
    grid.forEach((rowVals, ri) => {
        rowVals.forEach((val, ci) => {
            if (val !== '') dest.getRow(ri + 1).getCell(ci + 1).value = val;
        });
    });

    // 병합 복사 (값 기록 후 적용)
    const merges: string[] = source.model.merges ?? [];
    for (const range of merges) dest.mergeCells(range);

    return tabName;
}

/** 워크북을 .xlsx로 직렬화해 브라우저 다운로드를 트리거한다. */
export async function downloadWorkbook(wb: ExcelJS.Workbook, fileName: string): Promise<void> {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

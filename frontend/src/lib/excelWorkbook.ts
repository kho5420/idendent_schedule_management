import ExcelJS from 'exceljs';
import type { DayAssignment, ScheduleMonth } from '../types';
import { buildScheduleGrid } from './scheduleGrid';

/**
 * ExcelJS 셀의 표시 문자열을 안전하게 얻는다.
 * 빈 병합 셀(마스터 값이 null)에서 cell.text가 내부적으로 null.toString()을 호출해
 * 던지는 것을 방지한다. 값이 없으면 빈 문자열.
 */
function cellText(cell: ExcelJS.Cell): string {
    if (cell.value == null) return '';
    try {
        return cell.text ?? '';
    } catch {
        return '';
    }
}

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
            arr.push(cellText(row.getCell(c)));
        }
        rows.push(arr);
    }
    return rows;
}

/**
 * 소스 탭(sourceTabName)의 서식만 복제한, 생성 스케줄 시트 하나만 담은
 * **새 워크북**을 만든다. 원본 워크북은 읽기만 하고 다시 쓰지 않으므로
 * 원본의 표·도형·다른 시트가 손상되지 않는다(ExcelJS 라운드트립 회피).
 *
 * 복제: 열너비·행높이·셀 서식·병합. 값은 생성 그리드로 채우고, 앱이 관리하지
 * 않는 행(데스크·실장·위생사)은 빈칸으로 남는다. 소스 탭이 없으면 에러.
 */
export function buildScheduleWorkbook(
    sourceWb: ExcelJS.Workbook,
    sourceTabName: string,
    assignments: DayAssignment[],
    month: ScheduleMonth
): { workbook: ExcelJS.Workbook; sheetName: string } {
    const source = sourceWb.getWorksheet(sourceTabName);
    if (!source) throw new Error(`'${sourceTabName}' 탭을 파일에서 찾을 수 없습니다`);

    const sheetName = `${String(month.year).slice(-2)}.${String(month.month).padStart(2, '0')}_생성`;
    const workbook = new ExcelJS.Workbook();
    const dest = workbook.addWorksheet(sheetName);

    // 열너비 복사
    for (let c = 1; c <= source.columnCount; c++) {
        const w = source.getColumn(c).width;
        if (w != null) dest.getColumn(c).width = w;
    }
    // 행높이 + 셀 서식 복사 (값은 제외 — 아래 그리드로 채움)
    source.eachRow({ includeEmpty: true }, (row, r) => {
        const destRow = dest.getRow(r);
        if (row.height != null) destRow.height = row.height;
        row.eachCell({ includeEmpty: true }, (cell, c) => {
            destRow.getCell(c).style = { ...cell.style };
        });
    });

    // 생성 그리드 기록 (관리 행만 값이 들어가고 미관리 행은 빈칸 유지)
    const grid = buildScheduleGrid(assignments, month);
    grid.forEach((rowVals, ri) => {
        rowVals.forEach((val, ci) => {
            if (val !== '') dest.getRow(ri + 1).getCell(ci + 1).value = val;
        });
    });

    // 병합 복사 (값 기록 후 적용)
    const merges: string[] = source.model.merges ?? [];
    for (const range of merges) dest.mergeCells(range);

    return { workbook, sheetName };
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

import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { sheetToRows, listSheetNames, buildScheduleWorkbook } from '../excelWorkbook';
import { parseDoctorSchedule } from '../doctorScheduleParser';
import type { DayAssignment, ScheduleMonth } from '../../types';

const month: ScheduleMonth = { year: 2026, month: 7 };

function wbWithSheet(name: string, aoa: unknown[][]): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(name);
    aoa.forEach((row, r) => {
        row.forEach((v, c) => {
            ws.getRow(r + 1).getCell(c + 1).value = v as ExcelJS.CellValue;
        });
    });
    return wb;
}

function mkDay(over: Partial<DayAssignment> & { date: string; dayOfWeek: number }): DayAssignment {
    return {
        doctorAliases: [],
        isFullAttendance: false,
        working: [],
        fullDayOff: [],
        halfDayOff: [],
        isOrthoDay: false,
        orthoStaffCount: 0,
        nightFixedStaff: [],
        hasTeamLeader: false,
        hasNightShift: false,
        dayShiftStaff: [],
        nightShiftStaff: [],
        ...over,
    };
}

describe('listSheetNames', () => {
    it('워크북의 탭 이름 목록을 반환한다', () => {
        const wb = wbWithSheet('26.07', [['a']]);
        expect(listSheetNames(wb)).toEqual(['26.07']);
    });
});

describe('sheetToRows', () => {
    it('지정 탭을 0-based 행 배열(셀 표시문자열)로 변환한다', () => {
        const wb = wbWithSheet('26.07', [
            ['', '1 Y', '2 오'],
            ['', '성민', '이은'],
        ]);
        const rows = sheetToRows(wb, '26.07');
        expect(rows[0]).toEqual(['', '1 Y', '2 오']);
        expect(rows[1]).toEqual(['', '성민', '이은']);
    });

    it('탭이 없으면 에러를 던진다', () => {
        const wb = wbWithSheet('26.07', [['a']]);
        expect(() => sheetToRows(wb, '없는탭')).toThrow('없는탭');
    });

    it('빈 병합 셀이 있어도 던지지 않고 빈 문자열로 읽는다', () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('26.07');
        ws.getCell('B2').value = '값';
        ws.mergeCells('A1:C1'); // 마스터(A1)가 비어있는 병합 — 슬레이브 cell.text가 던지던 케이스

        const rows = sheetToRows(wb, '26.07');
        expect(rows[0][0]).toBe(''); // A1 (빈 마스터)
        expect(rows[0][1]).toBe(''); // B1 (빈 병합 슬레이브)
        expect(rows[1][1]).toBe('값'); // B2 (일반 셀)
    });

    it('읽은 행을 parseDoctorSchedule에 넣으면 정상 파싱된다 (왕복)', () => {
        const wb = wbWithSheet('26.07', [
            ['', '1 Y', '2 오', '3 원장님 전체출근', '4 오', '5 Y', '6 오', '7 Y'],
        ]);
        const rows = sheetToRows(wb, '26.07');
        const parsed = parseDoctorSchedule(rows, month);
        expect(parsed).toHaveLength(7);
        expect(parsed[0]).toMatchObject({ date: '2026-07-01', doctorAliases: ['Y'] });
        expect(parsed[2]).toMatchObject({ date: '2026-07-03', isFullAttendance: true });
    });
});

describe('buildScheduleWorkbook', () => {
    it('소스 탭 서식을 복제한, 생성 시트만 담긴 새 워크북을 만든다', () => {
        const srcWb = new ExcelJS.Workbook();
        const src = srcWb.addWorksheet('26.07');
        src.getColumn(2).width = 17;
        const headerCell = src.getRow(1).getCell(2);
        headerCell.value = '기존제목';
        headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        src.getRow(6).getCell(2).value = '데스크인원'; // 미관리 행(데스크) — 비워져야 함

        const wed = mkDay({ date: '2026-07-01', dayOfWeek: 3, isFullAttendance: true });
        const { workbook, sheetName } = buildScheduleWorkbook(srcWb, '26.07', [wed], month);

        expect(sheetName).toBe('26.07_생성');
        // 새 워크북엔 생성 시트만 (원본 시트들은 들어가지 않음 → 표·도형 손상 없음)
        expect(workbook.worksheets.map((ws) => ws.name)).toEqual(['26.07_생성']);
        // 원본 워크북은 손대지 않음
        expect(srcWb.worksheets.map((ws) => ws.name)).toEqual(['26.07']);

        const dest = workbook.getWorksheet('26.07_생성')!;
        // 서식 복제
        expect(dest.getColumn(2).width).toBe(17);
        expect(dest.getRow(1).getCell(2).fill).toMatchObject({ pattern: 'solid' });
        // 그리드 기록: B1 = '7月', 날짜+원장 행(시트 5행) D열 = '1 원장님 전체출근'
        expect(dest.getRow(1).getCell(2).text).toBe('7月');
        expect(dest.getRow(5).getCell(4).text).toBe('1 원장님 전체출근');
        // 미관리 행(데스크, 시트 6행)은 비워짐
        expect(dest.getRow(6).getCell(2).text).toBe('');
    });

    it('소스 탭이 없으면 에러를 던진다', () => {
        const srcWb = wbWithSheet('26.07', [['a']]);
        expect(() => buildScheduleWorkbook(srcWb, '없는탭', [], month)).toThrow('없는탭');
    });
});

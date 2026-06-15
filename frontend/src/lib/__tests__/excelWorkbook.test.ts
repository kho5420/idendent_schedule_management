import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { sheetToRows, listSheetNames, appendScheduleSheet } from '../excelWorkbook';
import { parseDoctorSchedule } from '../doctorScheduleParser';
import type { DayAssignment, ScheduleMonth } from '../../types';

const month: ScheduleMonth = { year: 2026, month: 7 };

function wbWithSheet(name: string, aoa: unknown[][]): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
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
    it('지정 탭을 행 배열로 변환한다', () => {
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

describe('appendScheduleSheet', () => {
    it('생성 시트를 추가하고 그리드 내용을 기록한다', () => {
        const wb = wbWithSheet('26.07', [['원본']]);
        const wed = mkDay({ date: '2026-07-01', dayOfWeek: 3, isFullAttendance: true });
        const name = appendScheduleSheet(wb, [wed], month);
        expect(name).toBe('26.07_생성');
        expect(listSheetNames(wb)).toContain('26.07_생성');
        const rows = sheetToRows(wb, '26.07_생성');
        expect(rows[0].slice(0, 2)).toEqual(['', '7月']);
        expect(rows[4][3]).toBe('1 원장님 전체출근');
    });

    it('생성 시트명이 이미 있으면 번호를 붙인다', () => {
        const wb = wbWithSheet('26.07_생성', [['a']]);
        const name = appendScheduleSheet(wb, [], month);
        expect(name).toBe('26.07_생성2');
    });
});

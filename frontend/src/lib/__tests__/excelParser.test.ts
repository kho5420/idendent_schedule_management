import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseScheduleExcel } from '../excelParser';

function makeWorkbook(sheetName: string, rows: (string | number | null)[][]): ArrayBuffer {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const raw = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    // XLSX.write returns Uint8Array or ArrayBuffer depending on environment
    if (raw instanceof ArrayBuffer) return raw;
    return (raw as Uint8Array).buffer as ArrayBuffer;
}

describe('parseScheduleExcel', () => {
    it('대상 월의 진료실 스텝을 파싱한다', async () => {
        const rows: (string | number | null)[][] = [
            [null, '6月'],
            [null, '26.6.1'],
            [null, ' ~ 26.6.30'],
            [null, '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
            [null, '2 Y,신', '3 Y,오', '4 전체', '5 오', '6 Y,우', '7 신', null],
            [null, '매니저A', '매니저B', '매니저C', '매니저D', '매니저E', '매니저F', null],
            [null, '데스크A', '데스크B', '데스크C', '데스크D', '데스크E', '데스크F', null],
            [null, '기공A', '기공B', '기공C', '기공D', '기공E', '기공F', null],
            [null, '이은,성민', '박민,혜수', '전체출근', '언경,은경', '미연,예진', '지수', null],
        ];
        const buf = makeWorkbook('26.06', rows);
        const result = await parseScheduleExcel(buf, { year: 2026, month: 6 });

        expect(result.month).toEqual({ year: 2026, month: 6 });
        expect(result.days.length).toBeGreaterThan(0);
        const monday = result.days.find((d) => d.dayOfWeek === 1);
        expect(monday?.clinicStaff).toEqual(['이은', '성민']);
    });

    it('대상 월 시트가 없으면 에러를 던진다', async () => {
        const rows: (string | number | null)[][] = [[null, '샘플']];
        const buf = makeWorkbook('기본틀', rows);
        await expect(parseScheduleExcel(buf, { year: 2026, month: 6 })).rejects.toThrow(
            '시트를 찾을 수 없습니다'
        );
    });
});

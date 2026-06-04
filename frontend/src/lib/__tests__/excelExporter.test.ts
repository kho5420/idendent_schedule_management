import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { exportScheduleToExcel } from '../excelExporter';
import type { GeneratedSchedule } from '../../types';

describe('exportScheduleToExcel', () => {
    it('유효한 .xlsx ArrayBuffer를 반환한다', () => {
        const schedule: GeneratedSchedule = {
            year: 2026,
            month: 7,
            weeks: [
                {
                    weekLabel: '1주차',
                    monday: ['이은', '성민'],
                    tuesday: ['박민'],
                    wednesday: 'all',
                    thursday: ['언경'],
                    friday: ['미연', '예진'],
                    saturday: ['지수'],
                },
            ],
        };

        const buf = exportScheduleToExcel(schedule);
        expect(buf).toBeInstanceOf(ArrayBuffer);

        const wb = XLSX.read(buf, { type: 'array' });
        expect(wb.SheetNames.length).toBeGreaterThan(0);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        expect(rows.length).toBeGreaterThan(0);
    });
});

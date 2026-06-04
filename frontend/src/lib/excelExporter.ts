import * as XLSX from 'xlsx';
import type { GeneratedSchedule } from '../types';

export function exportScheduleToExcel(schedule: GeneratedSchedule): ArrayBuffer {
    const { year, month, weeks } = schedule;
    const wb = XLSX.utils.book_new();

    const header = ['주차', '월', '화', '수', '목', '금', '토'];
    const dataRows = weeks.map((w) => [
        w.weekLabel,
        w.monday?.join(', ') ?? '',
        w.tuesday?.join(', ') ?? '',
        w.wednesday === 'all' ? '전체 출근' : '',
        w.thursday?.join(', ') ?? '',
        w.friday?.join(', ') ?? '',
        w.saturday?.join(', ') ?? '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    ws['!cols'] = [
        { wch: 8 },
        { wch: 20 },
        { wch: 20 },
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
    ];

    const sheetName = `${year}.${String(month).padStart(2, '0')}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array | ArrayBuffer;
    if (buf instanceof ArrayBuffer) {
        return buf;
    }
    const u8 = buf as Uint8Array;
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

export function downloadExcel(schedule: GeneratedSchedule): void {
    const buf = exportScheduleToExcel(schedule);
    const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eden_schedule_${schedule.year}_${String(schedule.month).padStart(2, '0')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}

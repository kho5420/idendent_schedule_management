import type { ScheduleMonth, DoctorDayInfo } from '../types';

const FULL_ATTENDANCE_PATTERN = /원장님\s*전체\s*출근/;
const DATE_CELL_PATTERN = /^(\d{1,2})\s*(.*)$/;

const DOW_BY_COL: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 0 };

function parseDateCell(cell: unknown): { day: number; rest: string } | null {
    if (typeof cell !== 'string' && typeof cell !== 'number') return null;
    const match = String(cell).trim().match(DATE_CELL_PATTERN);
    if (!match) return null;
    const day = parseInt(match[1], 10);
    if (day < 1 || day > 31) return null;
    return { day, rest: match[2].trim() };
}

function parseDoctorAliases(rest: string): string[] {
    if (!rest) return [];
    return rest
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function isDateRow(row: unknown[]): boolean {
    let count = 0;
    for (let col = 1; col <= 7; col++) {
        if (parseDateCell(row[col])) count++;
    }
    return count >= 3;
}

export function parseDoctorSchedule(rows: unknown[][], month: ScheduleMonth): DoctorDayInfo[] {
    const result: DoctorDayInfo[] = [];

    for (const row of rows) {
        if (!isDateRow(row)) continue;

        for (let col = 1; col <= 7; col++) {
            const parsed = parseDateCell(row[col]);
            if (!parsed) continue;

            const { day, rest } = parsed;
            const date = `${month.year}-${String(month.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isFullAttendance = FULL_ATTENDANCE_PATTERN.test(rest);

            result.push({
                date,
                dayOfWeek: DOW_BY_COL[col],
                doctorAliases: isFullAttendance ? [] : parseDoctorAliases(rest),
                isFullAttendance,
            });
        }
    }

    return result;
}

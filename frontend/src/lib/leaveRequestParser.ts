import type { ScheduleMonth, LeaveRequest, LeaveType } from '../types';

const LEAVE_TYPES: LeaveType[] = ['연차', '반차', '주차'];

// 이름은 최소 매칭(2,4?)으로 잡아 '언경오후반차' 같은 표기에서 '오전/오후'가 이름에 흡수되지 않도록 한다.
const ENTRY_PATTERN = new RegExp(
    `^\\s*\\d{0,2}\\.?\\s*([가-힣]{2,4}?)\\s*(오전|오후)?\\s*(${LEAVE_TYPES.join('|')})\\s*[-\\s]*(?:마감|적용완료|교정있음)?[-\\s]*$`
);

function parseDayNumber(cell: unknown): number | null {
    if (typeof cell !== 'string' && typeof cell !== 'number') return null;
    const match = String(cell).match(/^(\d{1,2})/);
    if (!match) return null;
    const day = parseInt(match[1], 10);
    return day >= 1 && day <= 31 ? day : null;
}

function parseDateRow(row: unknown[]): (number | null)[] | null {
    const dayNumbers = Array.from({ length: 7 }, (_, col) => parseDayNumber(row[col]));
    const found = dayNumbers.filter((n): n is number => n !== null);
    if (found.length < 3) return null;
    for (let i = 1; i < found.length; i++) {
        if (found[i] <= found[i - 1]) return null;
    }
    return dayNumbers;
}

function parseEntry(
    cell: unknown
): { name: string; type: LeaveType; half?: '오전' | '오후' } | null {
    if (typeof cell !== 'string') return null;
    const match = cell.match(ENTRY_PATTERN);
    if (!match) return null;
    const half = match[2] as '오전' | '오후' | undefined;
    const type = match[3] as LeaveType;
    // 오전/오후는 반차에만 의미가 있고, 구분이 없는 '반차'는 오후반차로 간주한다.
    return type === '반차'
        ? { name: match[1], type, half: half ?? '오후' }
        : { name: match[1], type };
}

export function parseLeaveRequests(rows: unknown[][], month: ScheduleMonth): LeaveRequest[] {
    const requests: LeaveRequest[] = [];
    let dayNumbers: (number | null)[] | null = null;

    for (const row of rows) {
        const dateRow = parseDateRow(row);
        if (dateRow) {
            dayNumbers = dateRow;
            continue;
        }
        if (!dayNumbers) continue;

        for (let col = 0; col < 7; col++) {
            const day = dayNumbers[col];
            if (day === null) continue;

            const entry = parseEntry(row[col]);
            if (!entry) continue;

            const date = `${month.year}-${String(month.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            requests.push({ date, ...entry });
        }
    }

    return requests;
}

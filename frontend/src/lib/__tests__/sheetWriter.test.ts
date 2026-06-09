import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    buildScheduleGrid,
    pickTabName,
    duplicateSheet,
    clearRange,
    writeGrid,
    setWrap,
} from '../sheetWriter';
import type { DayAssignment, ScheduleMonth } from '../../types';

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
const month: ScheduleMonth = { year: 2026, month: 7 };

describe('buildScheduleGrid', () => {
    it('헤더 4행을 기존 양식대로 만든다 (A열 여백, 요일은 B~H)', () => {
        const grid = buildScheduleGrid([], month);
        expect(grid[0]).toEqual(['', '7月']);
        expect(grid[1]).toEqual(['', '26.7.1']);
        expect(grid[2]).toEqual(['', ' ~ 26.7.31']);
        expect(grid[3]).toEqual([
            '',
            '월요일',
            '화요일',
            '수요일',
            '목요일',
            '금요일',
            '토요일',
            '일요일',
        ]);
    });

    it('전체출근일은 날짜+원장 행에 "일 원장님 전체출근", 진료실 행은 formatDayCell', () => {
        const wed = mkDay({
            date: '2026-07-01',
            dayOfWeek: 3,
            isFullAttendance: true,
            working: ['성민', '이은'],
        });
        const grid = buildScheduleGrid([wed], month);
        expect(grid[4][0]).toBe(''); // A열 여백
        expect(grid[4][3]).toBe('1 원장님 전체출근'); // 수=B~H 기준 4번째(col3)
        expect(grid[5]).toEqual([]); // 그룹행 빈칸
        expect(grid[6]).toEqual([]);
        expect(grid[7]).toEqual([]);
        expect(grid[8][3]).toContain('성민,이은'); // 진료실=formatDayCell
    });

    it('원장 코드가 있으면 "일 코드,코드" 형식으로 표기한다', () => {
        const thu = mkDay({ date: '2026-07-02', dayOfWeek: 4, doctorAliases: ['오', '신'] });
        const grid = buildScheduleGrid([thu], month);
        expect(grid[4][4]).toBe('2 오,신'); // 목=col4
    });
});

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('pickTabName', () => {
    it('충돌이 없으면 baseName 그대로 반환', () => {
        expect(pickTabName(['26.06', '기본틀'], '26.07_생성')).toBe('26.07_생성');
    });

    it('충돌하면 다음 번호를 붙인다', () => {
        expect(pickTabName(['26.07_생성', '26.07_생성2'], '26.07_생성')).toBe('26.07_생성3');
    });
});

describe('duplicateSheet', () => {
    it('insertSheetIndex 포함 요청을 POST하고 새 탭 sheetId를 반환한다', async () => {
        const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({
                replies: [{ duplicateSheet: { properties: { sheetId: 777 } } }],
            }),
        } as Response);
        const newId = await duplicateSheet('SID', 'TOK', 99, '26.07_생성', 48);
        expect(newId).toBe(777);
        const [url, opts] = spy.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/SID:batchUpdate');
        expect(opts.method).toBe('POST');
        expect(JSON.parse(opts.body as string)).toEqual({
            requests: [
                {
                    duplicateSheet: {
                        sourceSheetId: 99,
                        newSheetName: '26.07_생성',
                        insertSheetIndex: 48,
                    },
                },
            ],
        });
    });
});

describe('setWrap', () => {
    it('데이터 영역에 WRAP 서식을 repeatCell로 적용한다', async () => {
        const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as Response);
        await setWrap('SID', 'TOK', 777);
        const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
        expect(body.requests[0].repeatCell.range.sheetId).toBe(777);
        expect(body.requests[0].repeatCell.cell.userEnteredFormat.wrapStrategy).toBe('WRAP');
    });
});

describe('clearRange', () => {
    it('지정 범위의 값을 clear로 비운다 (서식 유지)', async () => {
        const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as Response);
        await clearRange('SID', 'TOK', '26.07_생성', 'A1:H60');
        const [url, opts] = spy.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/SID/values/');
        expect(url).toContain(':clear');
        expect(opts.method).toBe('POST');
    });
});

describe('writeGrid', () => {
    it('RAW 옵션으로 values를 PUT한다', async () => {
        const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as Response);
        await writeGrid('SID', 'TOK', '26.07_생성', [['a']]);
        const [url, opts] = spy.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/SID/values/');
        expect(url).toContain('valueInputOption=RAW');
        expect(opts.method).toBe('PUT');
        expect(JSON.parse(opts.body as string)).toEqual({ values: [['a']] });
    });

    it('실패 시 상태코드를 담아 throw', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 401,
        } as Response);
        await expect(writeGrid('S', 'T', 'x', [])).rejects.toThrow('401');
    });
});

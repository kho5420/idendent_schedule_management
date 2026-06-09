import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildScheduleGrid, resolveTabName, createTab, writeGrid } from '../sheetWriter';
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

describe('resolveTabName', () => {
    it('충돌이 없으면 baseName 그대로 반환', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ sheets: [{ properties: { title: '26.06' } }] }),
        } as Response);
        expect(await resolveTabName('id', 'tok', '26.07_생성')).toBe('26.07_생성');
    });

    it('충돌하면 다음 번호를 붙인다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                sheets: [
                    { properties: { title: '26.07_생성' } },
                    { properties: { title: '26.07_생성2' } },
                ],
            }),
        } as Response);
        expect(await resolveTabName('id', 'tok', '26.07_생성')).toBe('26.07_생성3');
    });
});

describe('createTab', () => {
    it('addSheet 요청을 POST한다', async () => {
        const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as Response);
        await createTab('SID', 'TOK', '새탭');
        const [url, opts] = spy.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/SID:batchUpdate');
        expect(opts.method).toBe('POST');
        expect(JSON.parse(opts.body as string)).toEqual({
            requests: [{ addSheet: { properties: { title: '새탭' } } }],
        });
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

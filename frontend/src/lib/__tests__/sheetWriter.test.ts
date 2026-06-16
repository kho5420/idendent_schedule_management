import { describe, it, expect, vi, beforeEach } from 'vitest';
import { duplicateSheet, clearRange, writeGrid, setWrap, applyClosureStyles } from '../sheetWriter';

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('applyClosureStyles', () => {
    it("'전체 휴진' 칸이 있으면 열 블록 배경색 + 글자칸 빨간 굵은 글씨 repeatCell을 보낸다", async () => {
        const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as Response);
        // grid[8] = 첫 주 진료실 행. 5번째 열(인덱스5, F)에 전체 휴진
        const grid: string[][] = Array.from({ length: 9 }, () => []);
        grid[8] = ['', '', '', '', '', '전체 휴진', '', ''];

        await applyClosureStyles('SID', 'TOK', 77, grid);

        const body = JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string);
        expect(body.requests).toHaveLength(2);

        // 1) 열 블록(날짜~진료실 5행) 배경색
        const bg = body.requests[0].repeatCell;
        expect(bg.range).toMatchObject({
            sheetId: 77,
            startRowIndex: 4,
            endRowIndex: 9,
            startColumnIndex: 5,
            endColumnIndex: 6,
        });
        expect(bg.fields).toBe('userEnteredFormat.backgroundColor');
        expect(bg.cell.userEnteredFormat.backgroundColor).toHaveProperty('red');

        // 2) '전체 휴진' 글자 칸만 빨간 굵은 글씨
        const text = body.requests[1].repeatCell;
        expect(text.range).toMatchObject({
            startRowIndex: 8,
            endRowIndex: 9,
            startColumnIndex: 5,
            endColumnIndex: 6,
        });
        expect(text.cell.userEnteredFormat.textFormat.bold).toBe(true);
        expect(text.cell.userEnteredFormat.textFormat.foregroundColor).toHaveProperty('red');
    });

    it('전체 휴진이 없으면 요청을 보내지 않는다', async () => {
        const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as Response);
        await applyClosureStyles('SID', 'TOK', 77, [['', '성민'], []]);
        expect(spy).not.toHaveBeenCalled();
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

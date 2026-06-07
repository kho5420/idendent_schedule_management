import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSheetData, fetchSheetRows, fetchLeaveSheetRows, checkSheetTab } from '../sheetsApi';

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('fetchSheetRows', () => {
    it('지정한 시트/탭의 원본 행 데이터를 그대로 반환한다', async () => {
        const mockValues = [
            ['A', 'B'],
            ['C', 'D'],
        ];

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ values: mockValues }),
        } as Response);

        const result = await fetchSheetRows('sheet-id-123', 'token-abc', '26.07');
        expect(result).toEqual(mockValues);
    });

    it('값이 없으면 빈 배열을 반환한다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        } as Response);

        const result = await fetchSheetRows('sheet-id-123', 'token-abc', '26.07');
        expect(result).toEqual([]);
    });

    it('API 오류 시 에러를 던진다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 403,
            json: async () => ({ error: { message: 'Forbidden' } }),
        } as Response);

        await expect(fetchSheetRows('id', 'token', '26.07')).rejects.toThrow(
            'Google Sheets API 오류'
        );
    });
});

describe('fetchLeaveSheetRows', () => {
    function makeCell(text: string, strikethrough: boolean) {
        return {
            formattedValue: text,
            effectiveFormat: { textFormat: { strikethrough } },
        };
    }

    it('취소선(strikethrough)이 있는 셀을 빈 문자열로 대체한다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                sheets: [
                    {
                        data: [
                            {
                                rowData: [
                                    {
                                        values: [
                                            makeCell('미연 연차', false),
                                            makeCell('지수 주차', true),
                                        ],
                                    },
                                    { values: [makeCell('8월 10일', false)] },
                                ],
                            },
                        ],
                    },
                ],
            }),
        } as Response);

        const result = await fetchLeaveSheetRows('sheet-id', 'token', '26.07');
        expect(result[0]).toEqual(['미연 연차', '']);
        expect(result[1]).toEqual(['8월 10일']);
    });

    it('포맷 정보가 없는 셀은 텍스트를 그대로 반환한다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                sheets: [
                    {
                        data: [
                            {
                                rowData: [{ values: [{ formattedValue: '미연 연차' }] }],
                            },
                        ],
                    },
                ],
            }),
        } as Response);

        const result = await fetchLeaveSheetRows('sheet-id', 'token', '26.07');
        expect(result[0]).toEqual(['미연 연차']);
    });

    it('API 오류 시 에러를 던진다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 403,
            json: async () => ({}),
        } as Response);

        await expect(fetchLeaveSheetRows('id', 'token', '26.07')).rejects.toThrow(
            'Google Sheets API 오류'
        );
    });
});

describe('fetchSheetData', () => {
    it('API 응답을 ScheduleData로 변환한다', async () => {
        const mockValues = [
            [null, '6月'],
            [null, '26.6.1'],
            [null, '~ 26.6.30'],
            [null, '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
            [null, '2 Y,신', '3 Y,오', '4 전체', '5 오', '6 Y', '7 신', null],
            [null, '매A', '매B', '매C', '매D', '매E', '매F', null],
            [null, '데A', '데B', '데C', '데D', '데E', '데F', null],
            [null, '기A', '기B', '기C', '기D', '기E', '기F', null],
            [null, '이은,성민', '박민', '전체', '언경', '미연', '지수', null],
        ];

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ values: mockValues }),
        } as Response);

        const result = await fetchSheetData('sheet-id-123', 'token-abc', { year: 2026, month: 6 });
        expect(result.month).toEqual({ year: 2026, month: 6 });
        expect(result.days.some((d) => d.clinicStaff.includes('이은'))).toBe(true);
    });

    it('API 오류 시 에러를 던진다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 403,
            json: async () => ({ error: { message: 'Forbidden' } }),
        } as Response);

        await expect(fetchSheetData('id', 'token', { year: 2026, month: 6 })).rejects.toThrow(
            'Google Sheets API 오류'
        );
    });
});

describe('checkSheetTab', () => {
    it('탭 제목 목록에 포함되어 있으면 true를 반환한다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                sheets: [{ properties: { title: '26.06' } }, { properties: { title: '26.07' } }],
            }),
        } as Response);

        const result = await checkSheetTab('sheet-id', 'token', '26.07');
        expect(result).toBe(true);
    });

    it('탭 제목 목록에 없으면 false를 반환한다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ sheets: [{ properties: { title: '26.06' } }] }),
        } as Response);

        const result = await checkSheetTab('sheet-id', 'token', '26.07');
        expect(result).toBe(false);
    });

    it('API 오류 시 에러를 던진다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 403,
            json: async () => ({ error: { message: 'Forbidden' } }),
        } as Response);

        await expect(checkSheetTab('id', 'token', '26.07')).rejects.toThrow(
            'Google Sheets API 오류'
        );
    });
});

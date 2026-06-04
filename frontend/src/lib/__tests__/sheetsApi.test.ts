import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSheetData } from '../sheetsApi';

beforeEach(() => {
    vi.restoreAllMocks();
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

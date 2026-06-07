import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabaseClient', () => ({
    supabase: { from: vi.fn() },
}));

import { supabase } from '../supabaseClient';
import { fetchScheduleSettings, updateScheduleSettings } from '../scheduleSettingApi';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('fetchScheduleSettings', () => {
    it('sort_order 순으로 schedule_setting 목록을 반환한다', async () => {
        const data = [
            {
                id: 1,
                day_name: '월',
                sort_order: 1,
                min_staff_with_ortho: 9,
                min_staff_without_ortho: 8,
                min_staff_on_leave: 7,
                has_night_shift: false,
            },
        ];
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data, error: null }),
            }),
        });
        expect(await fetchScheduleSettings()).toEqual(data);
        expect(mockFrom).toHaveBeenCalledWith('schedule_setting');
    });

    it('에러 시 throw한다', async () => {
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
            }),
        });
        await expect(fetchScheduleSettings()).rejects.toThrow('db error');
    });
});

describe('updateScheduleSettings', () => {
    it('각 항목을 id로 개별 update한다', async () => {
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ update: mockUpdate });

        await updateScheduleSettings([
            { id: 1, data: { min_staff_with_ortho: 10 } },
            { id: 2, data: { has_night_shift: true } },
        ]);

        expect(mockFrom).toHaveBeenCalledTimes(2);
        expect(mockUpdate).toHaveBeenCalledWith({ min_staff_with_ortho: 10 });
        expect(mockUpdate).toHaveBeenCalledWith({ has_night_shift: true });
        expect(mockEq).toHaveBeenCalledWith('id', 1);
        expect(mockEq).toHaveBeenCalledWith('id', 2);
    });

    it('빈 배열이면 아무것도 하지 않는다', async () => {
        await updateScheduleSettings([]);
        expect(mockFrom).not.toHaveBeenCalled();
    });
});

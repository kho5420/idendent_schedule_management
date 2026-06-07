import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabaseClient', () => ({
    supabase: { from: vi.fn() },
}));

import { supabase } from '../supabaseClient';
import {
    fetchStaff,
    fetchEmployeeTypes,
    updateStaff,
    createStaff,
    deleteStaff,
    bulkUpdateStaff,
    updateSortOrders,
} from '../staffApi';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('fetchStaff', () => {
    it('use_yn=Y인 staff 목록을 반환한다', async () => {
        const data = [{ id: 1, name: '노이은', is_ortho: false }];
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data, error: null }),
                }),
            }),
        });
        expect(await fetchStaff()).toEqual(data);
        expect(mockFrom).toHaveBeenCalledWith('staff');
    });

    it('에러 시 throw한다', async () => {
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
                }),
            }),
        });
        await expect(fetchStaff()).rejects.toThrow('db error');
    });
});

describe('fetchEmployeeTypes', () => {
    it('use_yn=Y인 목록을 반환한다', async () => {
        const data = [{ id: 6, name: '진료실' }];
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data, error: null }),
                }),
            }),
        });
        expect(await fetchEmployeeTypes()).toEqual(data);
        expect(mockFrom).toHaveBeenCalledWith('employee_type');
    });
});

describe('updateStaff', () => {
    it('id로 staff를 업데이트한다', async () => {
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ update: mockUpdate });
        await updateStaff(1, { name: '새이름' });
        expect(mockUpdate).toHaveBeenCalledWith({ name: '새이름' });
        expect(mockEq).toHaveBeenCalledWith('id', 1);
    });
});

describe('createStaff', () => {
    it('기존 직원이 있으면 MAX(sort_order)+1을 자동 할당하여 insert한다', async () => {
        mockFrom.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                        limit: vi
                            .fn()
                            .mockResolvedValue({ data: [{ sort_order: 5 }], error: null }),
                    }),
                }),
            }),
        });
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        mockFrom.mockReturnValueOnce({ insert: mockInsert });

        const data = {
            name: '신규',
            alias: null,
            use_yn: 'Y' as const,
            employee_type_id: null,
            career: null,
            team_no: null,
            is_ortho: false,
            is_team_leader: false,
            is_night_fixed: false,
            is_weekday_fixed: false,
            is_on_leave: false,
            is_head_dentist_pick: false,
            notes: null,
        };
        await createStaff(data);
        expect(mockInsert).toHaveBeenCalledWith({ ...data, sort_order: 6 });
    });

    it('기존 직원이 없으면 sort_order=1로 insert한다', async () => {
        mockFrom.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                }),
            }),
        });
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        mockFrom.mockReturnValueOnce({ insert: mockInsert });

        const data = {
            name: '신규',
            alias: null,
            use_yn: 'Y' as const,
            employee_type_id: null,
            career: null,
            team_no: null,
            is_ortho: false,
            is_team_leader: false,
            is_night_fixed: false,
            is_weekday_fixed: false,
            is_on_leave: false,
            is_head_dentist_pick: false,
            notes: null,
        };
        await createStaff(data);
        expect(mockInsert).toHaveBeenCalledWith({ ...data, sort_order: 1 });
    });
});

describe('deleteStaff', () => {
    it('use_yn을 N으로 soft delete한다', async () => {
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ update: mockUpdate });
        await deleteStaff(1);
        expect(mockUpdate).toHaveBeenCalledWith({ use_yn: 'N' });
        expect(mockEq).toHaveBeenCalledWith('id', 1);
    });
});

describe('bulkUpdateStaff', () => {
    it('여러 id를 in()으로 일괄 업데이트한다', async () => {
        const mockIn = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
        mockFrom.mockReturnValue({ update: mockUpdate });
        await bulkUpdateStaff([1, 2], { is_ortho: true });
        expect(mockUpdate).toHaveBeenCalledWith({ is_ortho: true });
        expect(mockIn).toHaveBeenCalledWith('id', [1, 2]);
    });
});

describe('updateSortOrders', () => {
    it('각 항목의 sort_order를 개별 update한다', async () => {
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ update: mockUpdate });

        await updateSortOrders([
            { id: 1, sort_order: 1 },
            { id: 2, sort_order: 2 },
        ]);

        expect(mockFrom).toHaveBeenCalledTimes(2);
        expect(mockUpdate).toHaveBeenCalledWith({ sort_order: 1 });
        expect(mockUpdate).toHaveBeenCalledWith({ sort_order: 2 });
        expect(mockEq).toHaveBeenCalledWith('id', 1);
        expect(mockEq).toHaveBeenCalledWith('id', 2);
    });

    it('빈 배열이면 아무것도 하지 않는다', async () => {
        await updateSortOrders([]);
        expect(mockFrom).not.toHaveBeenCalled();
    });
});

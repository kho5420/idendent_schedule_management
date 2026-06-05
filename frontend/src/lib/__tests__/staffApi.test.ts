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
    it('새 직원을 insert한다', async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        mockFrom.mockReturnValue({ insert: mockInsert });
        const data = {
            name: '신규',
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
        expect(mockInsert).toHaveBeenCalledWith(data);
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

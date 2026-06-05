import { supabase } from './supabaseClient';
import type { StaffRow, EmployeeType, StaffUpdateData } from '../types';

export async function fetchStaff(): Promise<StaffRow[]> {
    const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('use_yn', 'Y')
        .order('sort_order');
    if (error) throw error;
    return data as StaffRow[];
}

export async function fetchEmployeeTypes(): Promise<EmployeeType[]> {
    const { data, error } = await supabase
        .from('employee_type')
        .select('id, name')
        .eq('use_yn', 'Y')
        .order('id');
    if (error) throw error;
    return data as EmployeeType[];
}

export async function updateStaff(id: number, data: StaffUpdateData): Promise<void> {
    const { error } = await supabase.from('staff').update(data).eq('id', id);
    if (error) throw error;
}

export async function createStaff(data: Omit<StaffRow, 'id' | 'sort_order'>): Promise<void> {
    const { data: maxData } = await supabase
        .from('staff')
        .select('sort_order')
        .eq('use_yn', 'Y')
        .order('sort_order', { ascending: false })
        .limit(1);
    const nextSortOrder =
        maxData && maxData.length > 0 ? (maxData[0] as { sort_order: number }).sort_order + 1 : 1;
    const { error } = await supabase.from('staff').insert({ ...data, sort_order: nextSortOrder });
    if (error) throw error;
}

export async function deleteStaff(id: number): Promise<void> {
    const { error } = await supabase.from('staff').update({ use_yn: 'N' }).eq('id', id);
    if (error) throw error;
}

export async function bulkUpdateStaff(ids: number[], data: StaffUpdateData): Promise<void> {
    const { error } = await supabase.from('staff').update(data).in('id', ids);
    if (error) throw error;
}

export async function updateSortOrders(
    updates: { id: number; sort_order: number }[]
): Promise<void> {
    await Promise.all(
        updates.map(({ id, sort_order }) =>
            supabase.from('staff').update({ sort_order }).eq('id', id)
        )
    );
}

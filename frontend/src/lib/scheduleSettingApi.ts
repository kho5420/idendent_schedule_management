import { supabase } from './supabaseClient';
import type { ScheduleSetting, ScheduleSettingUpdateData } from '../types';

export async function fetchScheduleSettings(): Promise<ScheduleSetting[]> {
    const { data, error } = await supabase.from('schedule_setting').select('*').order('sort_order');
    if (error) throw error;
    return data as ScheduleSetting[];
}

export async function updateScheduleSettings(
    updates: { id: number; data: ScheduleSettingUpdateData }[]
): Promise<void> {
    await Promise.all(
        updates.map(({ id, data }) => supabase.from('schedule_setting').update(data).eq('id', id))
    );
}

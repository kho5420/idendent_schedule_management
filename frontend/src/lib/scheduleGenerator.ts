import type { ScheduleData, ScheduleMonth, GeneratedSchedule } from '../types';

export function generateSchedule(_data: ScheduleData, month: ScheduleMonth): GeneratedSchedule {
    // TODO: 실제 스케줄 생성 로직 구현 예정
    return { year: month.year, month: month.month, weeks: [] };
}

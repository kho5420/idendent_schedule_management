export type ScheduleMonth = { year: number; month: number };

export type InputMethod = 'excel' | 'google';

export type ExistingDayData = {
    date: string; // "YYYY-MM-DD"
    dayOfWeek: number; // 0=일, 1=월, ..., 6=토
    clinicStaff: string[]; // 진료실 스텝 이름 목록
};

export type ScheduleData = {
    month: ScheduleMonth;
    days: ExistingDayData[];
};

export type WeekRow = {
    weekLabel: string; // "1주차"
    monday: string[] | null;
    tuesday: string[] | null;
    wednesday: 'all' | null; // 수요일은 항상 전체 출근
    thursday: string[] | null;
    friday: string[] | null;
    saturday: string[] | null;
};

export type GeneratedSchedule = {
    year: number;
    month: number;
    weeks: WeekRow[];
};

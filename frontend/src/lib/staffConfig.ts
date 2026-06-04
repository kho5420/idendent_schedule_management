import type { StaffConfig, StaffMember } from '../types';

const STORAGE_KEY = 'clinic_staff_config';

const DEFAULT_STAFF: StaffMember[] = [
    { name: '노이은', isOrtho: false },
    { name: '강성민', isOrtho: false },
    { name: '박민주', isOrtho: false },
    { name: '김혜수', isOrtho: true },
    { name: '김윤정', isOrtho: true },
    { name: '하지수', isOrtho: true },
    { name: '최미연', isOrtho: true },
    { name: '차언경', isOrtho: true },
    { name: '강예진', isOrtho: true },
    { name: '김은경', isOrtho: true },
    { name: '전수현', isOrtho: false },
    { name: '임서이', isOrtho: false },
];

export function loadStaffConfig(): StaffConfig {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { staff: DEFAULT_STAFF };
    try {
        return JSON.parse(raw) as StaffConfig;
    } catch {
        return { staff: DEFAULT_STAFF };
    }
}

export function saveStaffConfig(config: StaffConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

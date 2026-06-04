import { describe, it, expect, beforeEach } from 'vitest';
import { loadStaffConfig, saveStaffConfig } from '../staffConfig';

beforeEach(() => {
    localStorage.clear();
});

describe('loadStaffConfig', () => {
    it('localStorage가 비어있으면 기본 직원 목록을 반환한다', () => {
        const config = loadStaffConfig();
        expect(config.staff.length).toBeGreaterThan(0);
        expect(config.staff[0]).toHaveProperty('name');
        expect(config.staff[0]).toHaveProperty('isOrtho');
    });

    it('저장된 값이 있으면 해당 값을 반환한다', () => {
        const saved = { staff: [{ name: '테스트', isOrtho: true }] };
        localStorage.setItem('clinic_staff_config', JSON.stringify(saved));
        const config = loadStaffConfig();
        expect(config.staff).toEqual(saved.staff);
    });

    it('localStorage 값이 손상된 경우 기본값을 반환한다', () => {
        localStorage.setItem('clinic_staff_config', 'invalid json{{{');
        const config = loadStaffConfig();
        expect(config.staff.length).toBeGreaterThan(0);
    });
});

describe('saveStaffConfig', () => {
    it('설정을 localStorage에 저장한다', () => {
        const config = { staff: [{ name: '홍길동', isOrtho: false }] };
        saveStaffConfig(config);
        const raw = localStorage.getItem('clinic_staff_config');
        expect(JSON.parse(raw!)).toEqual(config);
    });
});

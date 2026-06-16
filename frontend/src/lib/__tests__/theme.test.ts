import { describe, it, expect, beforeEach } from 'vitest';
import { THEMES, loadTheme, saveTheme, applyTheme } from '../theme';

describe('theme', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    });

    it('THEMES에 기본과 spotify가 포함된다', () => {
        const ids = THEMES.map((t) => t.id);
        expect(ids).toContain('default');
        expect(ids).toContain('spotify');
    });

    it('저장한 테마를 그대로 복원한다', () => {
        saveTheme('spotify');
        expect(loadTheme()).toBe('spotify');
    });

    it('저장값이 없으면 default를 반환한다', () => {
        expect(loadTheme()).toBe('default');
    });

    it('잘못된 저장값이면 default로 폴백한다', () => {
        localStorage.setItem('app-theme', 'banana');
        expect(loadTheme()).toBe('default');
    });

    it('applyTheme가 html의 data-theme을 설정한다', () => {
        applyTheme('spotify');
        expect(document.documentElement.dataset.theme).toBe('spotify');
    });

    it('applyTheme("default")가 html의 data-theme을 default로 설정한다', () => {
        applyTheme('default');
        expect(document.documentElement.dataset.theme).toBe('default');
    });
});

export interface ThemeMeta {
    id: string;
    label: string;
    /** 패널 미리보기 스와치 (배경, 카드/표면, 강조색) */
    swatch: readonly [string, string, string];
}

export const THEMES = [
    { id: 'default', label: '기본', swatch: ['#f0fdf4', '#ffffff', '#16a34a'] },
    { id: 'spotify', label: 'Spotify', swatch: ['#121212', '#181818', '#1ed760'] },
    { id: 'snowflake', label: 'Snowflake', swatch: ['#f5f8fa', '#ffffff', '#29b5e8'] },
    { id: 'posthog', label: 'PostHog', swatch: ['#eeefe9', '#ffffff', '#f7a501'] },
] as const satisfies readonly ThemeMeta[];

export type ThemeId = (typeof THEMES)[number]['id'];

const STORAGE_KEY = 'app-theme';

function isThemeId(value: string | null): value is ThemeId {
    return value !== null && THEMES.some((t) => t.id === value);
}

export function loadTheme(): ThemeId {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return isThemeId(stored) ? stored : 'default';
    } catch {
        return 'default';
    }
}

export function saveTheme(id: ThemeId): void {
    try {
        localStorage.setItem(STORAGE_KEY, id);
    } catch {
        // localStorage 불가 환경은 무시 (세션 한정 동작)
    }
}

export function applyTheme(id: ThemeId): void {
    document.documentElement.dataset.theme = id;
}

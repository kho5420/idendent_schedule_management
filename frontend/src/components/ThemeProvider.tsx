import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadTheme, saveTheme, applyTheme, type ThemeId } from '../lib/theme';

interface ThemeContextValue {
    theme: ThemeId;
    setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeId>(loadTheme);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    function setTheme(id: ThemeId) {
        saveTheme(id);
        setThemeState(id);
    }

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}

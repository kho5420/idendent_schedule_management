import { THEMES } from '../lib/theme';
import { useTheme } from './ThemeProvider';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function ThemePanel({ isOpen, onClose }: Props) {
    const { theme, setTheme } = useTheme();
    if (!isOpen) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: 16,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border-hover)',
                    borderRadius: 'var(--radius-card)',
                    boxShadow: 'var(--shadow-card)',
                    padding: 24,
                    width: '100%',
                    maxWidth: 360,
                    maxHeight: '80dvh',
                    overflowY: 'auto',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 20,
                    }}
                >
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
                        테마 선택
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-sub)',
                            fontSize: 18,
                            cursor: 'pointer',
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {THEMES.map((t) => {
                        const selected = t.id === theme;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setTheme(t.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '12px 14px',
                                    borderRadius: 12,
                                    cursor: 'pointer',
                                    background: 'var(--color-tag-bg)',
                                    border: selected
                                        ? '2px solid var(--color-accent-to)'
                                        : '1px solid var(--color-border)',
                                    color: 'var(--color-text)',
                                    textAlign: 'left',
                                }}
                            >
                                <span style={{ display: 'flex', gap: 3 }}>
                                    {t.swatch.map((c, i) => (
                                        <span
                                            key={i}
                                            style={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                background: c,
                                                border: '1px solid rgba(0,0,0,0.15)',
                                            }}
                                        />
                                    ))}
                                </span>
                                <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                                    {t.label}
                                </span>
                                {selected && (
                                    <span style={{ color: 'var(--color-accent-to)' }}>✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

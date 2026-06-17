import { versions } from '../lib/changelog';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: Props) {
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
                    borderRadius: 16,
                    boxShadow: 'var(--shadow-card)',
                    padding: 24,
                    width: '100%',
                    maxWidth: 420,
                    maxHeight: '80vh',
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
                        업데이트 내역
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {versions.map((v, i) => (
                        <div key={v.version}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginBottom: 8,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: 'var(--color-text)',
                                    }}
                                >
                                    {v.version}
                                </span>
                                {i === 0 && (
                                    <span
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            background:
                                                'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
                                            color: 'var(--color-on-accent)',
                                            borderRadius: 10,
                                            padding: '2px 7px',
                                        }}
                                    >
                                        NEW
                                    </span>
                                )}
                                <span
                                    style={{
                                        fontSize: 12,
                                        color: 'var(--color-text-sub)',
                                        marginLeft: 'auto',
                                    }}
                                >
                                    {v.date}
                                </span>
                            </div>
                            <ul
                                style={{
                                    margin: 0,
                                    padding: 0,
                                    listStyle: 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4,
                                }}
                            >
                                {v.items.map((item, j) => (
                                    <li
                                        key={j}
                                        style={{
                                            display: 'flex',
                                            gap: 6,
                                            fontSize: 13,
                                            color: 'var(--color-text-sub)',
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        <span aria-hidden="true" style={{ flexShrink: 0 }}>
                                            -
                                        </span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            {i < versions.length - 1 && (
                                <div
                                    style={{
                                        height: 1,
                                        background: 'var(--color-border)',
                                        marginTop: 20,
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

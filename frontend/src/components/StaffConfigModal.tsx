import { useState } from 'react';
import type { StaffConfig } from '../types';

interface Props {
    isOpen: boolean;
    config: StaffConfig;
    onChange: (config: StaffConfig) => void;
    onClose: () => void;
}

export function StaffConfigModal({ isOpen, config, onChange, onClose }: Props) {
    const [nameInput, setNameInput] = useState('');

    if (!isOpen) return null;

    function handleOrthoToggle(index: number) {
        onChange({
            staff: config.staff.map((s, i) => (i === index ? { ...s, isOrtho: !s.isOrtho } : s)),
        });
    }

    function handleRemove(index: number) {
        onChange({ staff: config.staff.filter((_, i) => i !== index) });
    }

    function handleAdd() {
        const name = nameInput.trim();
        if (!name || config.staff.some((s) => s.name === name)) return;
        onChange({ staff: [...config.staff, { name, isOrtho: false }] });
        setNameInput('');
    }

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
                    padding: 20,
                    width: '100%',
                    maxWidth: 400,
                    maxHeight: '80vh',
                    overflowY: 'auto',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 16,
                    }}
                >
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
                        직원 설정
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

                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--color-text-sub)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: 8,
                    }}
                >
                    진료실 스텝
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                    {config.staff.map((member, i) => (
                        <div
                            key={member.name}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: 'var(--color-bg)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 8,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: 'var(--color-text)',
                                }}
                            >
                                {member.name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <label
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: 'var(--color-text-sub)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={member.isOrtho}
                                        onChange={() => handleOrthoToggle(i)}
                                        style={{
                                            accentColor: 'var(--color-accent-from)',
                                            cursor: 'pointer',
                                        }}
                                    />
                                    교정과
                                </label>
                                <button
                                    onClick={() => handleRemove(i)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-text)',
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                    <input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder="이름 입력"
                        style={{
                            flex: 1,
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border-hover)',
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: 13,
                            color: 'var(--color-text)',
                        }}
                    />
                    <button
                        onClick={handleAdd}
                        style={{
                            background:
                                'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 14px',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'white',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        + 추가
                    </button>
                </div>
            </div>
        </div>
    );
}

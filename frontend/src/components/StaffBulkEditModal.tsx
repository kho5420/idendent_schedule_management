import { useState, useEffect } from 'react';
import type { StaffRow, CareerLevel } from '../types';
import { bulkUpdateStaff } from '../lib/staffApi';

type Props = {
    selectedStaff: StaffRow[];
    onSave: () => void;
    onClose: () => void;
};

type BulkKey =
    | 'career'
    | 'team_no'
    | 'is_ortho'
    | 'is_night_fixed'
    | 'is_weekday_fixed'
    | 'is_head_dentist_pick'
    | 'is_on_leave';

type BulkValues = {
    career: CareerLevel;
    team_no: string | null;
    is_ortho: boolean;
    is_night_fixed: boolean;
    is_weekday_fixed: boolean;
    is_head_dentist_pick: boolean;
    is_on_leave: boolean;
};

const CAREER_LEVELS: CareerLevel[] = ['고', '중', '저', '신규'];

const BOOL_FIELDS: { key: BulkKey; label: string }[] = [
    { key: 'is_ortho', label: '교정과' },
    { key: 'is_night_fixed', label: '야간고정' },
    { key: 'is_weekday_fixed', label: '평일고정' },
    { key: 'is_head_dentist_pick', label: '윤팀' },
    { key: 'is_on_leave', label: '휴직 중' },
];

const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '8px 10px',
};

const selectStyle: React.CSSProperties = {
    background: 'var(--color-card)',
    border: '1px solid var(--color-border-hover)',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 12,
    color: 'var(--color-text)',
};

export function StaffBulkEditModal({ selectedStaff, onSave, onClose }: Props) {
    const [enabled, setEnabled] = useState<Set<BulkKey>>(new Set());
    const [values, setValues] = useState<BulkValues>({
        career: '중',
        team_no: null,
        is_ortho: false,
        is_night_fixed: false,
        is_weekday_fixed: false,
        is_head_dentist_pick: false,
        is_on_leave: false,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    function toggleField(key: BulkKey) {
        setEnabled((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }

    function setValue<K extends BulkKey>(key: K, val: BulkValues[K]) {
        setValues((prev) => ({ ...prev, [key]: val }));
    }

    async function handleSave() {
        if (enabled.size === 0) return;
        setSaving(true);
        const data: Partial<BulkValues> = {};
        for (const key of enabled) {
            (data as Record<string, unknown>)[key] = values[key];
        }
        try {
            await bulkUpdateStaff(
                selectedStaff.map((s) => s.id),
                data
            );
            onSave();
        } catch {
            alert('일괄 저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
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
                    borderRadius: 16,
                    padding: 20,
                    width: '100%',
                    maxWidth: 360,
                    maxHeight: '90dvh',
                    overflowY: 'auto',
                }}
            >
                {/* 헤더 */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                    }}
                >
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
                        일괄 편집 — {selectedStaff.length}명
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

                {/* 선택된 직원 목록 */}
                <div
                    style={{
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 12,
                        color: 'var(--color-text-sub)',
                        marginBottom: 16,
                    }}
                >
                    {selectedStaff.map((s) => s.name).join(', ')}
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>
                        체크한 항목만 일괄 적용됩니다
                    </div>
                </div>

                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--text-indigo)',
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        marginBottom: 10,
                    }}
                >
                    적용할 항목 선택
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                    {/* 경력 수준 */}
                    <div style={rowStyle}>
                        <input
                            type="checkbox"
                            checked={enabled.has('career')}
                            onChange={() => toggleField('career')}
                            style={{ accentColor: 'var(--text-indigo)', cursor: 'pointer' }}
                        />
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text)' }}>
                            경력 수준
                        </span>
                        <select
                            value={values.career}
                            onChange={(e) =>
                                setValue('career', e.target.value as BulkValues['career'])
                            }
                            disabled={!enabled.has('career')}
                            style={{ ...selectStyle, opacity: enabled.has('career') ? 1 : 0.35 }}
                        >
                            {CAREER_LEVELS.map((v) => (
                                <option key={v} value={v}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 팀 번호 */}
                    <div style={rowStyle}>
                        <input
                            type="checkbox"
                            checked={enabled.has('team_no')}
                            onChange={() => toggleField('team_no')}
                            style={{ accentColor: 'var(--text-indigo)', cursor: 'pointer' }}
                        />
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text)' }}>
                            팀
                        </span>
                        <select
                            value={values.team_no ?? ''}
                            onChange={(e) => setValue('team_no', e.target.value || null)}
                            disabled={!enabled.has('team_no')}
                            style={{ ...selectStyle, opacity: enabled.has('team_no') ? 1 : 0.35 }}
                        >
                            <option value="">없음</option>
                            <option value="A">A팀</option>
                            <option value="B">B팀</option>
                        </select>
                    </div>

                    {/* Boolean 필드 */}
                    {BOOL_FIELDS.map((f) => (
                        <div key={f.key} style={rowStyle}>
                            <input
                                type="checkbox"
                                checked={enabled.has(f.key)}
                                onChange={() => toggleField(f.key)}
                                style={{ accentColor: 'var(--text-indigo)', cursor: 'pointer' }}
                            />
                            <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text)' }}>
                                {f.label}
                            </span>
                            <select
                                value={values[f.key] ? 'true' : 'false'}
                                onChange={(e) =>
                                    setValues((prev) => ({
                                        ...prev,
                                        [f.key]: e.target.value === 'true',
                                    }))
                                }
                                disabled={!enabled.has(f.key)}
                                style={{ ...selectStyle, opacity: enabled.has(f.key) ? 1 : 0.35 }}
                            >
                                <option value="true">ON</option>
                                <option value="false">OFF</option>
                            </select>
                        </div>
                    ))}
                </div>

                {/* 액션 버튼 */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            fontSize: 13,
                            color: 'var(--color-text-sub)',
                            background: 'none',
                            border: '1px solid var(--color-border)',
                            borderRadius: 8,
                            padding: '10px',
                            cursor: 'pointer',
                        }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || enabled.size === 0}
                        style={{
                            flex: 2,
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--color-on-accent)',
                            background:
                                'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
                            border: 'none',
                            borderRadius: 8,
                            padding: '10px',
                            cursor: 'pointer',
                            opacity: enabled.size === 0 ? 0.5 : 1,
                        }}
                    >
                        {saving ? '저장 중...' : '일괄 저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import type { StaffRow, EmployeeType, CareerLevel } from '../types';
import { createStaff, updateStaff, deleteStaff } from '../lib/staffApi';
import { RoleIcon } from './RoleIcon';

type Props = {
    staff: StaffRow | null;
    employeeTypes: EmployeeType[];
    onSave: () => void;
    onClose: () => void;
};

const CAREER_LEVELS: CareerLevel[] = ['고', '중', '저', '신규'];

type FormData = Omit<StaffRow, 'id' | 'sort_order'>;

const EMPTY: FormData = {
    name: '',
    use_yn: 'Y',
    employee_type_id: null,
    career: null,
    team_no: null,
    is_ortho: false,
    is_team_leader: false,
    is_night_fixed: false,
    is_weekday_fixed: false,
    is_on_leave: false,
    is_head_dentist_pick: false,
    notes: null,
};

const ATTRS: [keyof FormData, string, boolean][] = [
    ['is_ortho', '교정과', false],
    ['is_team_leader', '팀장', false],
    ['is_night_fixed', '야간고정', false],
    ['is_weekday_fixed', '평일고정', false],
    ['is_head_dentist_pick', '윤팀', false],
    ['is_on_leave', '휴직 중', true],
];

const selectStyle: React.CSSProperties = {
    width: '100%',
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    padding: '9px 8px',
    fontSize: 12,
    fontWeight: 600,
    color: '#1e293b',
    cursor: 'pointer',
    fontFamily: 'inherit',
    outline: 'none',
};

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 3, height: 14, background: '#16a34a', borderRadius: 2 }} />
            <span
                style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#16a34a',
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                }}
            >
                {children}
            </span>
        </div>
    );
}

export function StaffEditModal({ staff, employeeTypes, onSave, onClose }: Props) {
    const [form, setForm] = useState<FormData>(staff ? { ...staff } : { ...EMPTY });
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const roleName = employeeTypes.find((t) => t.id === form.employee_type_id)?.name ?? '';

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    function set<K extends keyof FormData>(key: K, val: FormData[K]) {
        setForm((prev) => ({ ...prev, [key]: val }));
    }

    async function handleSave() {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            if (staff) {
                await updateStaff(staff.id, form);
            } else {
                await createStaff(form);
            }
            onSave();
        } catch {
            alert('저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!staff) return;
        setSaving(true);
        try {
            await deleteStaff(staff.id);
            onSave();
        } catch {
            alert('삭제에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            {/* ── 삭제 확인 모달 ── */}
            {confirmDelete && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 200,
                        padding: 24,
                    }}
                >
                    <div
                        className="staff-modal-card"
                        style={{
                            background: 'white',
                            borderRadius: 20,
                            overflow: 'hidden',
                            width: '100%',
                            maxWidth: 320,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                        }}
                    >
                        <div
                            style={{
                                background: '#fef2f2',
                                padding: '28px 24px 20px',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                style={{
                                    width: 52,
                                    height: 52,
                                    background: '#fee2e2',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 14px',
                                    fontSize: 22,
                                }}
                            >
                                🗑
                            </div>
                            <div
                                style={{
                                    fontSize: 17,
                                    fontWeight: 800,
                                    color: '#dc2626',
                                    marginBottom: 8,
                                }}
                            >
                                직원 삭제
                            </div>
                            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                                <span style={{ fontWeight: 700, color: '#111827' }}>
                                    {form.name}
                                </span>{' '}
                                직원을 목록에서 제거하시겠습니까?
                            </div>
                        </div>
                        <div style={{ padding: '16px 20px', display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => setConfirmDelete(false)}
                                style={{
                                    flex: 1,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#6b7280',
                                    background: '#f3f4f6',
                                    border: 'none',
                                    borderRadius: 10,
                                    padding: '11px',
                                    cursor: 'pointer',
                                }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={saving}
                                style={{
                                    flex: 1,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: 'white',
                                    background: 'linear-gradient(135deg, #f87171, #dc2626)',
                                    border: 'none',
                                    borderRadius: 10,
                                    padding: '11px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(220,38,38,0.35)',
                                }}
                            >
                                {saving ? '삭제 중...' : '삭제'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 메인 모달 ── */}
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
                    className="staff-modal-card"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'white',
                        borderRadius: 22,
                        width: '100%',
                        maxWidth: 420,
                        maxHeight: '92dvh',
                        overflowY: 'auto',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                    }}
                >
                    {/* ── 헤더 (다크 그린 그라디언트) ── */}
                    <div
                        style={{
                            background:
                                'linear-gradient(145deg, #052e16 0%, #064e3b 50%, #065f46 100%)',
                            borderRadius: '22px 22px 0 0',
                            padding: '22px 20px 26px',
                            position: 'relative',
                        }}
                    >
                        {/* 닫기 버튼 */}
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: 14,
                                right: 14,
                                width: 30,
                                height: 30,
                                background: 'rgba(255,255,255,0.12)',
                                border: '1px solid rgba(255,255,255,0.18)',
                                borderRadius: '50%',
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: 13,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            ✕
                        </button>

                        {/* 직책 라벨 + 이름 */}
                        <div style={{ paddingRight: 44 }}>
                            {roleName ? (
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: 'rgba(255,255,255,0.12)',
                                        border: '1px solid rgba(255,255,255,0.22)',
                                        borderRadius: 20,
                                        padding: '5px 12px 5px 9px',
                                        marginBottom: 9,
                                        color: '#a7f3d0',
                                    }}
                                >
                                    <RoleIcon role={roleName} size={13} />
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: 'rgba(236,253,245,0.92)',
                                            letterSpacing: '0.02em',
                                        }}
                                    >
                                        {roleName}
                                    </span>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: 'rgba(167,243,208,0.75)',
                                        letterSpacing: 1.2,
                                        textTransform: 'uppercase',
                                        marginBottom: 7,
                                    }}
                                >
                                    {staff ? '직원 편집' : '새 직원 추가'}
                                </div>
                            )}
                            <div>
                                <input
                                    value={form.name}
                                    onChange={(e) => set('name', e.target.value)}
                                    placeholder="이름 입력"
                                    style={{
                                        width: '100%',
                                        fontSize: 22,
                                        fontWeight: 800,
                                        color: 'white',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: 10,
                                        padding: '7px 12px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── 바디 ── */}
                    <div style={{ padding: '20px 20px 0' }}>
                        {/* 기본 정보 */}
                        <SectionLabel>기본 정보</SectionLabel>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: 8,
                                marginBottom: 20,
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        letterSpacing: 0.5,
                                        marginBottom: 5,
                                    }}
                                >
                                    직원 유형
                                </div>
                                <select
                                    value={form.employee_type_id ?? ''}
                                    onChange={(e) =>
                                        set(
                                            'employee_type_id',
                                            e.target.value ? Number(e.target.value) : null
                                        )
                                    }
                                    style={selectStyle}
                                >
                                    <option value="">선택</option>
                                    {employeeTypes.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        letterSpacing: 0.5,
                                        marginBottom: 5,
                                    }}
                                >
                                    경력 수준
                                </div>
                                <select
                                    value={form.career ?? ''}
                                    onChange={(e) =>
                                        set('career', (e.target.value as CareerLevel) || null)
                                    }
                                    style={selectStyle}
                                >
                                    <option value="">선택</option>
                                    {CAREER_LEVELS.map((v) => (
                                        <option key={v} value={v}>
                                            {v}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: '#94a3b8',
                                        letterSpacing: 0.5,
                                        marginBottom: 5,
                                    }}
                                >
                                    팀
                                </div>
                                <select
                                    value={form.team_no ?? ''}
                                    onChange={(e) => set('team_no', e.target.value || null)}
                                    style={selectStyle}
                                >
                                    <option value="">없음</option>
                                    <option value="A">A팀</option>
                                    <option value="B">B팀</option>
                                </select>
                            </div>
                        </div>

                        {/* 속성 */}
                        <SectionLabel>속성</SectionLabel>
                        <div
                            style={{
                                border: '1.5px solid #e2e8f0',
                                borderRadius: 14,
                                overflow: 'hidden',
                                marginBottom: 20,
                            }}
                        >
                            {ATTRS.map(([key, label, danger], i) => {
                                const checked = form[key] as boolean;
                                let background = 'white';
                                if (checked) background = danger ? '#fff5f5' : '#f0fdf4';
                                const labelColor = danger && checked ? '#dc2626' : '#374151';
                                return (
                                    <label
                                        key={key}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '12px 14px',
                                            borderBottom:
                                                i < ATTRS.length - 1 ? '1px solid #f1f5f9' : 'none',
                                            background,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <span
                                            style={{
                                                flex: 1,
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color: labelColor,
                                            }}
                                        >
                                            {label}
                                        </span>
                                        <input
                                            type="checkbox"
                                            className={`staff-toggle${danger ? ' staff-toggle-danger' : ''}`}
                                            checked={checked}
                                            onChange={(e) =>
                                                set(key, e.target.checked as FormData[typeof key])
                                            }
                                        />
                                    </label>
                                );
                            })}
                        </div>

                        {/* 메모 */}
                        <SectionLabel>메모</SectionLabel>
                        <textarea
                            value={form.notes ?? ''}
                            onChange={(e) => set('notes', e.target.value || null)}
                            placeholder="비고 입력..."
                            style={{
                                width: '100%',
                                background: '#f8fafc',
                                border: '1.5px solid #e2e8f0',
                                borderRadius: 12,
                                padding: '10px 12px',
                                fontSize: 13,
                                color: '#374151',
                                resize: 'none',
                                height: 72,
                                boxSizing: 'border-box',
                                fontFamily: 'inherit',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* ── 푸터 액션 ── */}
                    <div
                        style={{
                            position: 'sticky',
                            bottom: 0,
                            background: 'white',
                            borderTop: '1px solid #f1f5f9',
                            padding: '14px 20px 20px',
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            marginTop: 16,
                        }}
                    >
                        {staff && (
                            <button
                                onClick={() => setConfirmDelete(true)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 15,
                                    color: '#ef4444',
                                    background: '#fff5f5',
                                    border: '1.5px solid #fca5a5',
                                    borderRadius: 10,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                }}
                            >
                                🗑
                            </button>
                        )}
                        <div style={{ flex: 1 }} />
                        <button
                            onClick={onClose}
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#6b7280',
                                background: '#f3f4f6',
                                border: 'none',
                                borderRadius: 10,
                                padding: '10px 18px',
                                cursor: 'pointer',
                            }}
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !form.name.trim()}
                            style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: 'white',
                                background: form.name.trim()
                                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                    : '#d1d5db',
                                border: 'none',
                                borderRadius: 10,
                                padding: '10px 24px',
                                cursor: form.name.trim() ? 'pointer' : 'not-allowed',
                                boxShadow: form.name.trim()
                                    ? '0 2px 10px rgba(22,163,74,0.4)'
                                    : 'none',
                            }}
                        >
                            {saving ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

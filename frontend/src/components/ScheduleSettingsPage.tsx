import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ScheduleSetting, ScheduleSettingUpdateData } from '../types';
import { fetchScheduleSettings, updateScheduleSettings } from '../lib/scheduleSettingApi';

const WEEKEND_DAYS = ['토', '일'];

type StepperProps = { value: number; onChange: (next: number) => void };

function Stepper({ value, onChange }: StepperProps) {
    return (
        <span className="schedule-setting-stepper">
            <button type="button" onClick={() => onChange(Math.max(0, value - 1))}>
                −
            </button>
            <span className="value">{value}</span>
            <button type="button" onClick={() => onChange(value + 1)}>
                +
            </button>
        </span>
    );
}

export function ScheduleSettingsPage() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<ScheduleSetting[]>([]);
    const [original, setOriginal] = useState<ScheduleSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchScheduleSettings();
            setSettings(data);
            setOriginal(data);
        } catch {
            setError('데이터를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void (async () => {
            await load();
        })();
    }, []);

    function setMinWithOrtho(id: number, value: number) {
        setSettings((prev) =>
            prev.map((s) => (s.id === id ? { ...s, min_staff_with_ortho: value } : s))
        );
    }
    function setMinWithoutOrtho(id: number, value: number) {
        setSettings((prev) =>
            prev.map((s) => (s.id === id ? { ...s, min_staff_without_ortho: value } : s))
        );
    }
    function setMinOnLeave(id: number, value: number) {
        setSettings((prev) =>
            prev.map((s) => (s.id === id ? { ...s, min_staff_on_leave: value } : s))
        );
    }
    function toggleNightShift(id: number) {
        setSettings((prev) =>
            prev.map((s) => (s.id === id ? { ...s, has_night_shift: !s.has_night_shift } : s))
        );
    }

    const isDirty = settings.some((s) => {
        const orig = original.find((o) => o.id === s.id);
        if (!orig) return false;
        return (
            s.min_staff_with_ortho !== orig.min_staff_with_ortho ||
            s.min_staff_without_ortho !== orig.min_staff_without_ortho ||
            s.min_staff_on_leave !== orig.min_staff_on_leave ||
            s.has_night_shift !== orig.has_night_shift
        );
    });

    async function handleSave() {
        const updates = settings.flatMap((s) => {
            const orig = original.find((o) => o.id === s.id);
            if (!orig) return [];
            const data: ScheduleSettingUpdateData = {};
            if (s.min_staff_with_ortho !== orig.min_staff_with_ortho) {
                data.min_staff_with_ortho = s.min_staff_with_ortho;
            }
            if (s.min_staff_without_ortho !== orig.min_staff_without_ortho) {
                data.min_staff_without_ortho = s.min_staff_without_ortho;
            }
            if (s.min_staff_on_leave !== orig.min_staff_on_leave) {
                data.min_staff_on_leave = s.min_staff_on_leave;
            }
            if (s.has_night_shift !== orig.has_night_shift) {
                data.has_night_shift = s.has_night_shift;
            }
            return Object.keys(data).length > 0 ? [{ id: s.id, data }] : [];
        });
        if (updates.length === 0) return;

        setSaving(true);
        setError(null);
        setSaveMessage(null);
        try {
            await updateScheduleSettings(updates);
            setOriginal(settings);
            setSaveMessage('저장되었습니다.');
        } catch {
            setError('저장하지 못했습니다. 다시 시도해 주세요.');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div
                className="app-container"
                style={{
                    textAlign: 'center',
                    paddingTop: 60,
                    color: 'var(--color-text-sub)',
                    fontSize: 14,
                }}
            >
                불러오는 중...
            </div>
        );
    }

    if (error && settings.length === 0) {
        return (
            <div
                className="app-container"
                style={{ textAlign: 'center', paddingTop: 60, color: '#dc2626', fontSize: 14 }}
            >
                {error}
                <br />
                <button
                    onClick={load}
                    style={{
                        marginTop: 12,
                        fontSize: 13,
                        color: 'var(--color-text-sub)',
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        padding: '6px 14px',
                        cursor: 'pointer',
                    }}
                >
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--color-accent-to)',
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                            marginBottom: 4,
                        }}
                    >
                        언제나이든치과
                    </div>
                    <h1
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: 'var(--color-text)',
                            margin: 0,
                        }}
                    >
                        스케줄 설정
                    </h1>
                </div>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        color: 'var(--color-text-sub)',
                        cursor: 'pointer',
                    }}
                >
                    ← 메인
                </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 14 }}>
                요일별로 필요한 최소 인원과 야간진료 여부를 설정합니다. 변경 후 하단의 저장 버튼을
                눌러주세요.
            </p>

            <div className="schedule-setting-card">
                <div className="schedule-setting-head">
                    <span>요일</span>
                    <span>교정 없는 날</span>
                    <span>교정 있는 날</span>
                    <span>휴무 시 최소</span>
                    <span>야간진료</span>
                </div>
                {settings.map((s) => {
                    const isWeekend = WEEKEND_DAYS.includes(s.day_name);
                    return (
                        <div
                            key={s.id}
                            className={`schedule-setting-row${isWeekend ? ' weekend' : ''}`}
                        >
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                                <span
                                    className={`schedule-setting-dot${isWeekend ? ' weekend' : ''}`}
                                />
                                <span
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: 'var(--color-text)',
                                    }}
                                >
                                    {s.day_name}
                                </span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Stepper
                                    value={s.min_staff_without_ortho}
                                    onChange={(next) => setMinWithoutOrtho(s.id, next)}
                                />
                                <span style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>
                                    명 이상
                                </span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Stepper
                                    value={s.min_staff_with_ortho}
                                    onChange={(next) => setMinWithOrtho(s.id, next)}
                                />
                                <span style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>
                                    명 이상
                                </span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Stepper
                                    value={s.min_staff_on_leave}
                                    onChange={(next) => setMinOnLeave(s.id, next)}
                                />
                                <span style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>
                                    명 이상
                                </span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                    type="button"
                                    className={`schedule-setting-toggle${s.has_night_shift ? ' on' : ''}`}
                                    onClick={() => toggleNightShift(s.id)}
                                    aria-label={`${s.day_name}요일 야간진료 ${s.has_night_shift ? '끄기' : '켜기'}`}
                                />
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: 'var(--color-text-sub)',
                                    }}
                                >
                                    {s.has_night_shift ? '있음' : '없음'}
                                </span>
                            </span>
                        </div>
                    );
                })}
            </div>

            {error && settings.length > 0 && (
                <p style={{ fontSize: 12, color: '#dc2626', marginTop: 12 }}>{error}</p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
                <button
                    onClick={() => void handleSave()}
                    disabled={!isDirty || saving}
                    style={{
                        background:
                            isDirty && !saving
                                ? 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))'
                                : 'var(--color-border)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '9px 20px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isDirty && !saving ? 'pointer' : 'not-allowed',
                    }}
                >
                    {saving ? '저장 중...' : '저장'}
                </button>
                {saveMessage && (
                    <span style={{ fontSize: 12, color: 'var(--color-success)' }}>
                        {saveMessage}
                    </span>
                )}
            </div>
        </div>
    );
}

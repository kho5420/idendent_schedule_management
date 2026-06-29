import { useState } from 'react';
import type { DayAssignment, StaffRow } from '../types';
import { groupAssignmentsByWeek } from '../lib/weekGrouping';
import { isClosureDay } from '../lib/scheduleFormatter';
import { eligibleMovers, displayName } from '../lib/personnelTrade';

interface Props {
    assignments: DayAssignment[];
    fromDate: string;
    clinicStaff: StaffRow[];
    onTrade: (fromDate: string, toDate: string, staffId: number) => void;
    onClose: () => void;
}

const DOW_LABEL = ['일', '월', '화', '수', '목', '금', '토'];

function dayNum(date: string): number {
    return parseInt(date.slice(-2), 10);
}

/** 인원의 직종/역할을 한눈에 보여주는 작은 태그 라벨 */
function staffTags(s: StaffRow): string[] {
    const tags: string[] = [];
    if (s.career) tags.push(s.career);
    if (s.is_team_leader) tags.push('팀장');
    if (s.is_ortho) tags.push('교정');
    if (s.is_night_fixed) tags.push('야간고정');
    if (s.is_weekday_fixed) tags.push('평일고정');
    return tags;
}

export function PersonnelTradeModal({
    assignments,
    fromDate,
    clinicStaff,
    onTrade,
    onClose,
}: Props) {
    const [toDate, setToDate] = useState<string | null>(null);

    const from = assignments.find((d) => d.date === fromDate);
    if (!from) return null;

    const weeks = groupAssignmentsByWeek(assignments);
    const week = weeks.find((w) => w.some((d) => d?.date === fromDate)) ?? [];
    const toOptions = week.filter(
        (d): d is DayAssignment => d != null && d.date !== fromDate && !isClosureDay(d)
    );

    const to = toDate ? assignments.find((d) => d.date === toDate) : undefined;
    const movers = to ? eligibleMovers(from, to, clinicStaff) : [];

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
                    maxWidth: 440,
                    maxHeight: '85dvh',
                    overflowY: 'auto',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                    }}
                >
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
                        인원 이동 — {dayNum(fromDate)}일 ({DOW_LABEL[from.dayOfWeek]})
                    </span>
                    <button
                        aria-label="닫기"
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
                        color: 'var(--color-text-sub)',
                        marginBottom: 16,
                        lineHeight: 1.5,
                    }}
                >
                    현재 {from.working.length}명 근무. 옮길 날짜를 고르면 이동 가능한 인원이
                    표시됩니다.
                </div>

                {/* To 날짜 선택 (같은 주) */}
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--color-text-sub)',
                        marginBottom: 8,
                    }}
                >
                    어느 날로 옮길까요?
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                    {toOptions.map((d) => {
                        const selected = d.date === toDate;
                        const weekend = d.dayOfWeek === 0 || d.dayOfWeek === 6;
                        return (
                            <button
                                key={d.date}
                                onClick={() => setToDate(d.date)}
                                style={{
                                    minWidth: 56,
                                    padding: '8px 10px',
                                    borderRadius: 10,
                                    border: selected
                                        ? '2px solid var(--color-accent-to)'
                                        : '1px solid var(--color-border)',
                                    background: selected
                                        ? 'var(--color-tag-bg)'
                                        : 'var(--color-card)',
                                    color: weekend ? 'var(--text-danger)' : 'var(--color-text)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    lineHeight: 1.3,
                                }}
                            >
                                <div style={{ fontSize: 13, fontWeight: 700 }}>
                                    {dayNum(d.date)}일
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--color-text-sub)' }}>
                                    {DOW_LABEL[d.dayOfWeek]} · {d.working.length}명
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* 이동 가능 인원 명단 */}
                {to && (
                    <>
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--color-text-sub)',
                                marginBottom: 8,
                            }}
                        >
                            {dayNum(fromDate)}일 → {dayNum(to.date)}일 이동 가능 인원
                        </div>
                        {movers.length === 0 ? (
                            <div
                                style={{
                                    fontSize: 13,
                                    color: 'var(--color-text-sub)',
                                    padding: '14px 0',
                                    textAlign: 'center',
                                }}
                            >
                                옮길 수 있는 인원이 없습니다.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {movers.map((s) => (
                                    <div
                                        key={s.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '8px 12px',
                                            background: 'var(--color-bg)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 8,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                flexWrap: 'wrap',
                                                minWidth: 0,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    color: 'var(--color-text)',
                                                }}
                                            >
                                                {displayName(s)}
                                            </span>
                                            {staffTags(s).map((t) => (
                                                <span
                                                    key={t}
                                                    style={{
                                                        fontSize: 10,
                                                        color: 'var(--color-tag-text)',
                                                        background: 'var(--color-tag-bg)',
                                                        borderRadius: 6,
                                                        padding: '1px 6px',
                                                    }}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => onTrade(fromDate, to.date, s.id)}
                                            style={{
                                                background:
                                                    'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
                                                border: 'none',
                                                borderRadius: 8,
                                                padding: '8px 14px',
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: 'var(--color-on-accent)',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                            }}
                                        >
                                            옮기기 →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

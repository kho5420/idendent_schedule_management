import { Fragment, useState } from 'react';
import type { DayAssignment, StaffRow } from '../types';
import type { WeekValidation } from '../lib/scheduleValidator';
import {
    formatDayCell,
    isClosureDay,
    CLOSURE_BG_HEX,
    CLOSURE_TEXT_HEX,
    ALBA_COLOR,
} from '../lib/scheduleFormatter';
import { groupAssignmentsByWeek } from '../lib/weekGrouping';
import { PersonnelTradeModal } from './PersonnelTradeModal';

interface Props {
    assignments: DayAssignment[];
    validations?: WeekValidation[];
    // 아래 편집 props가 주어지면 셀 클릭으로 인원 이동·알바 편집이 활성화된다
    clinicStaff?: StaffRow[];
    albaRoster?: StaffRow[];
    onTrade?: (fromDate: string, toDate: string, staffId: number) => void;
    onAddAlba?: (date: string, staffId: number) => void;
    onRemoveAlba?: (date: string, staffId: number) => void;
    onMoveAlba?: (fromDate: string, toDate: string, staffId: number) => void;
}

const DAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일'];

/** 셀 텍스트에서 알바 이름(쉼표·줄바꿈으로 구분된 온전한 토큰)만 주황색으로 렌더 */
function renderCellText(text: string, albaNames: string[]): React.ReactNode {
    if (albaNames.length === 0) return text;
    const set = new Set(albaNames);
    const escaped = albaNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // 이름이 한 항목 전체일 때만(앞뒤가 줄머리/줄끝/쉼표/줄바꿈) 색칠 — 부분 일치 방지
    const re = new RegExp(`(?<![^\\n,])(${escaped.join('|')})(?![^\\n,])`, 'g');
    const parts = text.split(re);
    return parts.map((p, i) =>
        set.has(p) ? (
            <span key={i} style={{ color: ALBA_COLOR, fontWeight: 600 }}>
                {p}
            </span>
        ) : (
            <Fragment key={i}>{p}</Fragment>
        )
    );
}

function CalendarCell({
    assignment,
    col,
    onSelect,
}: {
    assignment: DayAssignment | null;
    col: number;
    onSelect?: (date: string) => void;
}) {
    const isWeekend = col >= 5; // 5=토, 6=일
    const tdStyle: React.CSSProperties = {
        width: `${100 / 7}%`,
        verticalAlign: 'top',
        padding: '6px 4px',
        borderRight: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        fontSize: 11,
        minWidth: 0,
    };

    if (!assignment) {
        return (
            <td
                style={{
                    ...tdStyle,
                    background: isWeekend ? 'var(--surface-weekend)' : 'var(--color-tag-bg)',
                }}
            />
        );
    }

    const dayNum = parseInt(assignment.date.slice(-2), 10);
    const closure = isClosureDay(assignment);
    // 평일은 옮길 인원이 있어야, 주말은 알바 추가를 위해 비어 있어도 클릭 가능
    const clickable = !!onSelect && !closure && (assignment.working.length > 0 || isWeekend);
    // 그날 출근 원장님 (스케줄 시트처럼 검증용 표시)
    const doctorLine = assignment.isFullAttendance
        ? '원장 전체출근'
        : assignment.doctorAliases.length > 0
          ? `원장 ${assignment.doctorAliases.join(',')}`
          : null;

    const cellBg = closure
        ? CLOSURE_BG_HEX
        : isWeekend
          ? 'var(--surface-weekend)'
          : 'var(--color-card)';

    return (
        <td
            className={clickable ? 'trade-cell' : undefined}
            onClick={clickable ? () => onSelect!(assignment.date) : undefined}
            title={clickable ? '클릭해 인원 이동' : undefined}
            style={{ ...tdStyle, background: cellBg, cursor: clickable ? 'pointer' : undefined }}
        >
            <div
                style={{
                    fontSize: 12,
                    fontWeight: 700,
                    marginBottom: 4,
                    color: isWeekend ? 'var(--text-danger)' : 'var(--color-text)',
                }}
            >
                {dayNum}
            </div>
            {doctorLine && (
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--text-info)',
                        marginBottom: 4,
                        lineHeight: 1.4,
                        wordBreak: 'break-all',
                    }}
                >
                    {doctorLine}
                </div>
            )}
            <pre
                style={{
                    margin: 0,
                    fontFamily: 'inherit',
                    fontSize: 11,
                    lineHeight: 1.5,
                    color: closure ? CLOSURE_TEXT_HEX : 'var(--color-text)',
                    fontWeight: closure ? 700 : 400,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                }}
            >
                {renderCellText(formatDayCell(assignment), assignment.albaWorking ?? [])}
            </pre>
        </td>
    );
}

function ValidationRow({ validation }: { validation: WeekValidation }) {
    const warns = validation.issues.filter((i) => i.severity === 'warn');
    const infos = validation.issues.filter((i) => i.severity === 'info');
    const ok = warns.length === 0;

    return (
        <td
            colSpan={7}
            style={{
                padding: '6px 10px',
                fontSize: 11,
                lineHeight: 1.6,
                borderBottom: '2px solid var(--color-border)',
                // 이상 없음은 테마 브랜드 표면색(tag), 경고는 위험색
                background: ok ? 'var(--color-tag-bg)' : 'var(--surface-danger)',
                color: ok ? 'var(--color-tag-text)' : 'var(--text-danger)',
            }}
        >
            <b>
                {ok ? '✅' : '⚠️'} {validation.weekLabel}
                {ok ? ' 이상 없음' : ''}
            </b>
            {warns.length > 0 && <span> · {warns.map((i) => i.message).join(' · ')}</span>}
            {infos.length > 0 && (
                <span style={{ color: 'var(--color-text-sub)' }}>
                    {' '}
                    · {infos.map((i) => i.message).join(' · ')}
                </span>
            )}
        </td>
    );
}

export function AssignmentPreview({
    assignments,
    validations,
    clinicStaff,
    albaRoster,
    onTrade,
    onAddAlba,
    onRemoveAlba,
    onMoveAlba,
}: Props) {
    const weeks = groupAssignmentsByWeek(assignments);
    const [fromDate, setFromDate] = useState<string | null>(null);
    const editable = !!(onTrade && clinicStaff);

    return (
        <div
            style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-text)',
                }}
            >
                생성 결과 미리보기 (검증용)
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table
                    style={{
                        width: '100%',
                        minWidth: 700,
                        borderCollapse: 'collapse',
                        tableLayout: 'fixed',
                    }}
                >
                    <thead>
                        <tr>
                            {DAY_HEADERS.map((label, i) => {
                                const weekend = i >= 5; // 5=토, 6=일
                                return (
                                    <th
                                        key={label}
                                        style={{
                                            padding: '8px 4px',
                                            textAlign: 'center',
                                            fontSize: 12,
                                            fontWeight: weekend ? 700 : 600,
                                            color: weekend
                                                ? 'var(--text-danger)'
                                                : 'var(--color-text-sub)',
                                            background: weekend
                                                ? 'var(--surface-weekend)'
                                                : 'var(--color-tag-bg)',
                                            borderRight: '1px solid var(--color-border)',
                                            borderBottom: '1px solid var(--color-border)',
                                        }}
                                    >
                                        {label}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {weeks.map((week, i) => (
                            <Fragment key={i}>
                                <tr>
                                    {week.map((a, col) => (
                                        <CalendarCell
                                            key={col}
                                            assignment={a}
                                            col={col}
                                            onSelect={editable ? setFromDate : undefined}
                                        />
                                    ))}
                                </tr>
                                {validations?.[i] && (
                                    <tr>
                                        <ValidationRow validation={validations[i]} />
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {editable && fromDate && (
                <PersonnelTradeModal
                    assignments={assignments}
                    fromDate={fromDate}
                    clinicStaff={clinicStaff!}
                    albaRoster={albaRoster ?? []}
                    onTrade={onTrade!}
                    onAddAlba={onAddAlba}
                    onRemoveAlba={onRemoveAlba}
                    onMoveAlba={onMoveAlba}
                    onClose={() => setFromDate(null)}
                />
            )}
        </div>
    );
}

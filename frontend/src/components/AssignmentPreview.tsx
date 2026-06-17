import type { DayAssignment } from '../types';
import {
    formatDayCell,
    isClosureDay,
    CLOSURE_BG_HEX,
    CLOSURE_TEXT_HEX,
} from '../lib/scheduleFormatter';
import { groupAssignmentsByWeek } from '../lib/weekGrouping';

interface Props {
    assignments: DayAssignment[];
}

const DAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일'];

function CalendarCell({ assignment, col }: { assignment: DayAssignment | null; col: number }) {
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
        <td style={{ ...tdStyle, background: cellBg }}>
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
                {formatDayCell(assignment)}
            </pre>
        </td>
    );
}

export function AssignmentPreview({ assignments }: Props) {
    const weeks = groupAssignmentsByWeek(assignments);

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
                            <tr key={i}>
                                {week.map((a, col) => (
                                    <CalendarCell key={col} assignment={a} col={col} />
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

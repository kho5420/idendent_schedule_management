import type { GeneratedSchedule } from '../types';
import { downloadExcel } from '../lib/excelExporter';

interface Props {
    schedule: GeneratedSchedule;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_LABELS = ['월', '화', '수', '목', '금', '토'];

function StaffTag({ name }: { name: string }) {
    return (
        <span
            style={{
                display: 'inline-block',
                background: 'var(--color-tag-bg)',
                color: 'var(--color-tag-text)',
                borderRadius: 4,
                padding: '1px 6px',
                fontSize: 10,
                margin: '1px 2px 1px 0',
            }}
        >
            {name}
        </span>
    );
}

const thStyle: React.CSSProperties = {
    background: '#16162a',
    color: 'var(--color-text-sub)',
    padding: '7px 10px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: 10,
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--color-border)',
};

const tdStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderBottom: '1px solid #1a1a2e',
    verticalAlign: 'top',
};

export function SchedulePreview({ schedule }: Props) {
    return (
        <div
            style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                overflow: 'hidden',
            }}
        >
            {/* 헤더 */}
            <div
                style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <span
                        style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: 'var(--color-success)',
                            display: 'inline-block',
                        }}
                    />
                    {schedule.year}년 {schedule.month}월 스케줄 미리보기
                </div>
                <button
                    onClick={() => downloadExcel(schedule)}
                    style={{
                        background:
                            'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 14px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    ⬇ 엑셀 다운로드
                </button>
            </div>

            {/* 테이블 */}
            <div style={{ overflowX: 'auto', padding: 16 }}>
                {schedule.weeks.length === 0 ? (
                    <p
                        style={{
                            fontSize: 13,
                            color: 'var(--color-text-sub)',
                            textAlign: 'center',
                            padding: 24,
                        }}
                    >
                        스케줄 생성 로직 구현 후 데이터가 표시됩니다.
                    </p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>주차</th>
                                {DAY_LABELS.map((d) => (
                                    <th key={d} style={thStyle}>
                                        {d}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {schedule.weeks.map((week, i) => (
                                <tr key={i}>
                                    <td
                                        style={{
                                            ...tdStyle,
                                            color: 'var(--color-accent-from)',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {week.weekLabel}
                                    </td>
                                    {DAYS.map((day) => {
                                        const value = week[day];
                                        return (
                                            <td key={day} style={tdStyle}>
                                                {value === 'all' ? (
                                                    <span
                                                        style={{
                                                            fontSize: 10,
                                                            color: 'var(--color-text-sub)',
                                                            fontStyle: 'italic',
                                                        }}
                                                    >
                                                        전체 출근
                                                    </span>
                                                ) : value ? (
                                                    value.map((name) => (
                                                        <StaffTag key={name} name={name} />
                                                    ))
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

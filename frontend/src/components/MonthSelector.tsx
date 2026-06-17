import type { ScheduleMonth } from '../types';

interface Props {
    selected: ScheduleMonth;
    onChange: (month: ScheduleMonth) => void;
}

function getMonthRange(): ScheduleMonth[] {
    const months: ScheduleMonth[] = [];
    for (let offset = 0; offset <= 3; offset++) {
        const d = new Date();
        d.setMonth(d.getMonth() + offset);
        months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return months;
}

function formatChip({ year, month }: ScheduleMonth): string {
    return `${year % 100}.${String(month).padStart(2, '0')}`;
}

export function MonthSelector({ selected, onChange }: Props) {
    const months = getMonthRange();

    return (
        <div
            className="month-selector-wrap"
            style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                padding: '14px 20px',
                marginBottom: 20,
            }}
        >
            <span
                style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-text-sub)',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.04em',
                }}
            >
                대상 월 선택
            </span>
            <div className="month-chips">
                {months.map((m) => {
                    const isSelected = m.year === selected.year && m.month === selected.month;
                    return (
                        <button
                            key={`${m.year}-${m.month}`}
                            onClick={() => onChange(m)}
                            className="month-chip"
                            style={{
                                padding: '6px 16px',
                                fontSize: 13,
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                                ...(isSelected && {
                                    border: 'none',
                                    background:
                                        'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
                                    color: 'var(--color-on-accent)',
                                }),
                            }}
                        >
                            {formatChip(m)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

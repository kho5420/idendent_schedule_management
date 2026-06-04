import type { ScheduleMonth } from '../types';

interface Props {
    selected: ScheduleMonth;
    onChange: (month: ScheduleMonth) => void;
}

function getMonthRange(): ScheduleMonth[] {
    const months: ScheduleMonth[] = [];
    for (let offset = -2; offset <= 3; offset++) {
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
                    fontSize: 12,
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
                            style={{
                                padding: '6px 16px',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: isSelected ? 600 : 400,
                                border: isSelected ? 'none' : '1px solid var(--color-border)',
                                background: isSelected
                                    ? 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))'
                                    : 'transparent',
                                color: isSelected ? 'white' : 'var(--color-text-sub)',
                                cursor: 'pointer',
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

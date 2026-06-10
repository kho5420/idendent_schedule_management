type RoleIconProps = { role: string; size?: number };

export function RoleIcon({ role, size = 14 }: RoleIconProps) {
    if (role === '대표원장' || role === '원장') {
        const iconSize = Math.max(size, 18);

        return (
            <img
                src={import.meta.env.BASE_URL + 'dentist.svg'}
                width={iconSize}
                height={iconSize}
                alt={role}
                style={{ display: 'block', objectFit: 'contain' }}
            />
        );
    }
    if (role === '진료실') {
        const iconSize = Math.max(size, 18);

        return (
            <img
                src={import.meta.env.BASE_URL + 'treatment-room.svg'}
                width={iconSize}
                height={iconSize}
                alt={role}
                style={{ display: 'block', objectFit: 'contain' }}
            />
        );
    }
    if (role === '알바') {
        return (
            <svg
                viewBox="0 0 24 24"
                width={size}
                height={size}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8.2V12l2.6 1.6" />
            </svg>
        );
    }
    return (
        <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="7" />
        </svg>
    );
}

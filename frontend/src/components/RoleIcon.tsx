type RoleIconProps = { role: string; size?: number };

export function RoleIcon({ role, size = 14 }: RoleIconProps) {
    if (role === '대표원장' || role === '원장') {
        return (
            <svg
                viewBox="0 0 24 24"
                width={size}
                height={size}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinejoin="round"
            >
                <path d="M12 4l8 8-8 8-8-8z" />
            </svg>
        );
    }
    if (role === '진료실') {
        return (
            <svg
                viewBox="0 0 24 24"
                width={size}
                height={size}
                fill="none"
                stroke="currentColor"
                strokeWidth={3.2}
                strokeLinecap="round"
            >
                <path d="M12 5v14M5 12h14" />
            </svg>
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

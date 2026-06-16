interface Props {
    month: { year: number; month: number };
    isReady: boolean;
    isLoading: boolean;
    onClick: () => void;
}

export function GenerateButton({ month, isReady, isLoading, onClick }: Props) {
    return (
        <button
            onClick={onClick}
            disabled={!isReady || isLoading}
            style={{
                width: '100%',
                background: isReady
                    ? 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))'
                    : 'var(--color-border)',
                color: isReady ? 'white' : 'var(--color-text-sub)',
                border: 'none',
                borderRadius: 'var(--radius-btn)',
                padding: 14,
                fontSize: 15,
                fontWeight: 600,
                cursor: isReady && !isLoading ? 'pointer' : 'not-allowed',
                marginBottom: 24,
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
            }}
        >
            {isLoading ? (
                <>
                    <span
                        style={{
                            width: 16,
                            height: 16,
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: 'white',
                            borderRadius: '50%',
                            display: 'inline-block',
                            animation: 'spin 0.8s linear infinite',
                        }}
                    />
                    생성 중...
                </>
            ) : (
                `⚡ ${month.month}월 스케줄 생성`
            )}
        </button>
    );
}

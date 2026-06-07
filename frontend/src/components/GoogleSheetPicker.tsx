import { useEffect, useState } from 'react';
import { SheetConnectionField } from './SheetConnectionField';
import type { SheetConnection } from '../types';

const TOKEN_KEY = 'google_access_token';

interface Props {
    token: string | null;
    onTokenChange: (token: string | null) => void;
    onScheduleSheetChange: (connection: SheetConnection) => void;
    onLeaveRequestSheetChange: (connection: SheetConnection) => void;
}

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (response: { access_token?: string; error?: string }) => void;
                    }) => { requestAccessToken: () => void };
                };
            };
        };
    }
}

export function GoogleSheetPicker({
    token,
    onTokenChange,
    onScheduleSheetChange,
    onLeaveRequestSheetChange,
}: Props) {
    const [comingSoon, setComingSoon] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(TOKEN_KEY);
        if (saved && !token) onTokenChange(saved);
    }, []);

    function login() {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId || !window.google) {
            setComingSoon(true);
            setTimeout(() => setComingSoon(false), 2000);
            return;
        }
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: (res) => {
                if (res.access_token) {
                    localStorage.setItem(TOKEN_KEY, res.access_token);
                    onTokenChange(res.access_token);
                }
            },
        });
        client.requestAccessToken();
    }

    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        onTokenChange(null);
        onScheduleSheetChange(null);
        onLeaveRequestSheetChange(null);
    }

    if (!token) {
        return (
            <div>
                <button
                    onClick={login}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: 'var(--color-border)',
                        border: '1px solid var(--color-border-hover)',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: 13,
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        width: '100%',
                    }}
                >
                    🔑 Google로 로그인
                </button>
                {comingSoon && (
                    <div
                        style={{
                            fontSize: 13,
                            color: 'var(--color-text-sub)',
                            textAlign: 'center',
                            marginTop: 6,
                        }}
                    >
                        🚧 준비 중입니다
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--color-success)' }}>✅ 로그인됨</div>
                <button
                    onClick={logout}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 12,
                        color: 'var(--color-text-sub)',
                        cursor: 'pointer',
                    }}
                >
                    로그아웃
                </button>
            </div>
            <SheetConnectionField
                label="📅 스케줄 시트"
                token={token}
                tabPlaceholder="탭 이름 (예: 26.07)"
                onConnectionChange={onScheduleSheetChange}
            />
            <SheetConnectionField
                label="🌴 휴무신청 시트 (선택)"
                token={token}
                tabPlaceholder="탭 이름"
                onConnectionChange={onLeaveRequestSheetChange}
            />
        </div>
    );
}

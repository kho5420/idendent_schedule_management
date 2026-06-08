import { useEffect, useState } from 'react';
import { SheetConnectionField } from './SheetConnectionField';
import type { SheetConnection } from '../types';

const CLIENT_ID_KEY = 'google_client_id';
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
    const [clientId, setClientId] = useState(() => localStorage.getItem(CLIENT_ID_KEY) ?? '');
    const [inputValue, setInputValue] = useState('');
    const [loginError, setLoginError] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem(TOKEN_KEY);
        if (saved && !token) onTokenChange(saved);
    }, []);

    function saveClientId() {
        const trimmed = inputValue.trim();
        if (!trimmed) return;
        localStorage.setItem(CLIENT_ID_KEY, trimmed);
        setClientId(trimmed);
        setInputValue('');
    }

    function resetClientId() {
        localStorage.removeItem(CLIENT_ID_KEY);
        setClientId('');
        logout();
    }

    function login() {
        if (!window.google) {
            setLoginError('Google 스크립트 로딩 중입니다. 잠시 후 다시 시도해 주세요.');
            return;
        }
        setLoginError(null);
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

    if (!clientId) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-sub)', lineHeight: 1.5 }}>
                    Google Cloud에서 발급받은 OAuth 클라이언트 ID를 입력하세요.
                </div>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveClientId()}
                    placeholder="xxxx.apps.googleusercontent.com"
                    style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        border: '1px solid var(--color-border-hover)',
                        borderRadius: 6,
                        padding: '6px 8px',
                        fontSize: 12,
                        color: 'var(--color-text)',
                        background: 'var(--color-card)',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={saveClientId}
                    disabled={!inputValue.trim()}
                    style={{
                        background: inputValue.trim()
                            ? 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))'
                            : 'var(--color-border)',
                        border: 'none',
                        borderRadius: 6,
                        padding: '7px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'white',
                        cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                    }}
                >
                    저장
                </button>
            </div>
        );
    }

    if (!token) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                {loginError && (
                    <div style={{ fontSize: 11, color: '#dc2626', textAlign: 'center' }}>
                        {loginError}
                    </div>
                )}
                <button
                    onClick={resetClientId}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 11,
                        color: 'var(--color-text-sub)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0,
                        textAlign: 'center',
                    }}
                >
                    클라이언트 ID 변경
                </button>
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
                storageKey="google_sheet_connection_schedule"
                onConnectionChange={onScheduleSheetChange}
            />
            <SheetConnectionField
                label="🌴 휴무신청 시트 (선택)"
                token={token}
                tabPlaceholder="탭 이름"
                storageKey="google_sheet_connection_leave_request"
                onConnectionChange={onLeaveRequestSheetChange}
            />
        </div>
    );
}

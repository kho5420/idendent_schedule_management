import { useEffect, useRef, useState } from 'react';
import { SheetConnectionField } from './SheetConnectionField';
import type { SheetConnection } from '../types';

const CLIENT_ID_KEY = 'google_client_id';
const TOKEN_KEY = 'google_access_token';
const TOKEN_EXPIRY_KEY = 'google_access_token_expiry';
// 토큰 만료 5분 전에 미리 갱신
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

interface Props {
    token: string | null;
    onTokenChange: (token: string | null) => void;
    onScheduleSheetChange: (connection: SheetConnection) => void;
    onLeaveRequestSheetChange: (connection: SheetConnection) => void;
}

interface TokenClient {
    requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (response: {
                            access_token?: string;
                            expires_in?: number;
                            error?: string;
                        }) => void;
                    }) => TokenClient;
                };
            };
        };
    }
}

// GIS 스크립트가 async 로드라 아직 준비 안 됐을 수 있어 잠시 대기 후 콜백 실행
function whenGoogleReady(cb: () => void, attempts = 20) {
    if (window.google) {
        cb();
        return;
    }
    if (attempts <= 0) return;
    window.setTimeout(() => whenGoogleReady(cb, attempts - 1), 250);
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

    const tokenClientRef = useRef<TokenClient | null>(null);
    const refreshTimerRef = useRef<number | null>(null);

    // 만료 시각에 맞춰 백그라운드 갱신을 예약
    function scheduleRefresh(expiresAt: number) {
        if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
        const delay = Math.max(0, expiresAt - Date.now() - REFRESH_MARGIN_MS);
        refreshTimerRef.current = window.setTimeout(() => {
            silentRefresh();
        }, delay);
    }

    // clientId 기준으로 토큰 클라이언트를 한 번만 생성해 재사용
    function getTokenClient(): TokenClient | null {
        if (tokenClientRef.current) return tokenClientRef.current;
        if (!window.google || !clientId) return null;
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: (res) => {
                if (res.access_token) {
                    const expiresAt = Date.now() + (res.expires_in ?? 3600) * 1000;
                    localStorage.setItem(TOKEN_KEY, res.access_token);
                    localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiresAt));
                    onTokenChange(res.access_token);
                    scheduleRefresh(expiresAt);
                    setLoginError(null);
                } else {
                    // 조용한 갱신 실패(세션 만료 등) 또는 로그인 취소 → 재로그인 필요
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(TOKEN_EXPIRY_KEY);
                    onTokenChange(null);
                }
            },
        });
        tokenClientRef.current = client;
        return client;
    }

    // 로그인 창 없이 토큰만 조용히 재발급
    function silentRefresh() {
        whenGoogleReady(() => {
            const client = getTokenClient();
            if (client) client.requestAccessToken({ prompt: '' });
        });
    }

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
        tokenClientRef.current = null;
        logout();
    }

    function login() {
        const client = getTokenClient();
        if (!client) {
            setLoginError('Google 스크립트 로딩 중입니다. 잠시 후 다시 시도해 주세요.');
            return;
        }
        setLoginError(null);
        // 최초 로그인은 기본 동의 흐름 (계정 선택/동의 창 노출)
        client.requestAccessToken();
    }

    function logout() {
        if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        onTokenChange(null);
        onScheduleSheetChange(null);
        onLeaveRequestSheetChange(null);
    }

    // 마운트/새로고침 시: 저장된 토큰이 유효하면 그대로 쓰고 갱신 예약,
    // 만료됐거나 임박했으면 조용히 재발급 시도
    useEffect(() => {
        const saved = localStorage.getItem(TOKEN_KEY);
        const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) ?? 0);
        if (saved && Date.now() < expiresAt - REFRESH_MARGIN_MS) {
            if (!token) onTokenChange(saved);
            scheduleRefresh(expiresAt);
        } else if (saved || expiresAt) {
            silentRefresh();
        }
        return () => {
            if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 탭이 다시 활성화될 때(절전 복귀 등) 만료 임박이면 갱신
    useEffect(() => {
        function onVisible() {
            if (document.visibilityState !== 'visible') return;
            if (!localStorage.getItem(TOKEN_KEY)) return;
            const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) ?? 0);
            if (Date.now() >= expiresAt - REFRESH_MARGIN_MS) silentRefresh();
        }
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                        color: 'var(--color-on-accent)',
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
                    <div style={{ fontSize: 11, color: 'var(--text-danger)', textAlign: 'center' }}>
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
            <div
                style={{
                    minHeight: 34,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
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

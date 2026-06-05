import { useEffect, useState } from 'react';

const TOKEN_KEY = 'google_access_token';

interface Props {
    token: string | null;
    sheetId: string | null;
    onTokenChange: (token: string | null) => void;
    onSheetIdChange: (id: string | null) => void;
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

function extractSheetId(input: string): string | null {
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim();
    return null;
}

export function GoogleSheetPicker({ token, sheetId, onTokenChange, onSheetIdChange }: Props) {
    const [urlInput, setUrlInput] = useState('');
    const [urlError, setUrlError] = useState('');
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
            scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
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
        onSheetIdChange(null);
        setUrlInput('');
    }

    function handleUrlSubmit() {
        const id = extractSheetId(urlInput);
        if (!id) {
            setUrlError('올바른 구글 스프레드시트 URL이나 ID를 입력해주세요.');
            return;
        }
        setUrlError('');
        onSheetIdChange(id);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--color-success)' }}>✅ 로그인됨</div>
            {sheetId ? (
                <div style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>
                    시트 ID: {sheetId.slice(0, 20)}…
                </div>
            ) : (
                <>
                    <input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="스프레드시트 URL 또는 ID 입력"
                        style={{
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border-hover)',
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 13,
                            color: 'var(--color-text)',
                            width: '100%',
                        }}
                    />
                    {urlError && <div style={{ fontSize: 12, color: '#dc2626' }}>{urlError}</div>}
                    <button
                        onClick={handleUrlSubmit}
                        style={{
                            background: 'var(--color-border)',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px',
                            fontSize: 13,
                            color: 'var(--color-text)',
                            cursor: 'pointer',
                        }}
                    >
                        확인
                    </button>
                </>
            )}
            <button
                onClick={logout}
                style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 12,
                    color: 'var(--color-text-sub)',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                로그아웃
            </button>
        </div>
    );
}

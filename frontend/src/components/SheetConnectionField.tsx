import { useState } from 'react';
import { checkSheetTab } from '../lib/sheetsApi';
import type { SheetConnection } from '../types';

type Status = 'idle' | 'checking' | 'connected' | 'error';

interface Props {
    label: string;
    token: string;
    tabPlaceholder: string;
    onConnectionChange: (connection: SheetConnection) => void;
}

function extractSheetId(input: string): string | null {
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim();
    return null;
}

export function SheetConnectionField({ label, token, tabPlaceholder, onConnectionChange }: Props) {
    const [urlInput, setUrlInput] = useState('');
    const [tabNameInput, setTabNameInput] = useState('');
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState('');

    async function handleCheck() {
        const sheetId = extractSheetId(urlInput);
        if (!sheetId) {
            setStatus('error');
            setMessage('올바른 구글 스프레드시트 URL이나 ID를 입력해주세요.');
            onConnectionChange(null);
            return;
        }

        const tabName = tabNameInput.trim();
        if (!tabName) {
            setStatus('error');
            setMessage('탭 이름을 입력해주세요.');
            onConnectionChange(null);
            return;
        }

        setStatus('checking');
        setMessage('');
        try {
            const exists = await checkSheetTab(sheetId, token, tabName);
            if (exists) {
                setStatus('connected');
                setMessage(`연결됨 — ${tabName} 탭`);
                onConnectionChange({ sheetId, tabName });
            } else {
                setStatus('error');
                setMessage(`${tabName} 탭을 찾을 수 없습니다.`);
                onConnectionChange(null);
            }
        } catch (e) {
            setStatus('error');
            setMessage(e instanceof Error ? e.message : '연결 확인 중 오류가 발생했습니다.');
            onConnectionChange(null);
        }
    }

    const inputStyle = {
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border-hover)',
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: 13,
        color: 'var(--color-text)',
        width: '100%',
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: 12,
            }}
        >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{label}</div>
            <div style={{ display: 'flex', gap: 6 }}>
                <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="시트 URL 또는 ID 입력"
                    style={inputStyle}
                />
                <button
                    onClick={handleCheck}
                    disabled={status === 'checking'}
                    style={{
                        background: 'var(--color-border)',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 13,
                        color: 'var(--color-text)',
                        cursor: status === 'checking' ? 'default' : 'pointer',
                        opacity: status === 'checking' ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                    }}
                >
                    확인
                </button>
            </div>
            <input
                value={tabNameInput}
                onChange={(e) => setTabNameInput(e.target.value)}
                placeholder={tabPlaceholder}
                style={inputStyle}
            />
            <div
                style={{
                    fontSize: 12,
                    color:
                        status === 'connected'
                            ? 'var(--color-success)'
                            : status === 'error'
                              ? '#dc2626'
                              : 'var(--color-text-sub)',
                }}
            >
                {status === 'idle' && '⬜ 아직 연결 안 됨'}
                {status === 'checking' && '⏳ 확인 중...'}
                {status === 'connected' && `✅ ${message}`}
                {status === 'error' && `⚠️ ${message}`}
            </div>
        </div>
    );
}

import { useState } from 'react';
import { ExcelUploader } from './ExcelUploader';
import { readWorkbook, listSheetNames } from '../lib/excelWorkbook';
import type { ExcelConnection } from '../types';

type Status = 'idle' | 'checking' | 'connected' | 'error';

interface Props {
    label: string;
    storageKey: string;
    tabPlaceholder: string;
    onConnectionChange: (connection: ExcelConnection) => void;
}

export function ExcelFileField({ label, storageKey, tabPlaceholder, onConnectionChange }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [tabName, setTabName] = useState(() => localStorage.getItem(storageKey) ?? '');
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState('');

    function handleFile(f: File | null) {
        setFile(f);
        setStatus('idle');
        setMessage('');
        onConnectionChange(null);
    }

    async function runCheck() {
        if (!file) {
            setStatus('error');
            setMessage('먼저 .xlsx 파일을 올려주세요.');
            onConnectionChange(null);
            return;
        }
        const tab = tabName.trim();
        if (!tab) {
            setStatus('error');
            setMessage('탭 이름을 입력해주세요.');
            onConnectionChange(null);
            return;
        }
        setStatus('checking');
        setMessage('');
        try {
            const wb = await readWorkbook(file);
            if (listSheetNames(wb).includes(tab)) {
                setStatus('connected');
                setMessage(`연결됨 — ${tab} 탭`);
                onConnectionChange({ file, tabName: tab });
                localStorage.setItem(storageKey, tab);
            } else {
                setStatus('error');
                setMessage(`'${tab}' 탭을 파일에서 찾을 수 없습니다.`);
                onConnectionChange(null);
            }
        } catch {
            setStatus('error');
            setMessage('파일을 읽지 못했습니다. .xlsx 파일인지 확인해주세요.');
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
        boxSizing: 'border-box' as const,
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
            <ExcelUploader file={file} onFileChange={handleFile} />
            <div style={{ display: 'flex', gap: 6 }}>
                <input
                    value={tabName}
                    onChange={(e) => setTabName(e.target.value)}
                    placeholder={tabPlaceholder}
                    style={inputStyle}
                />
                <button
                    onClick={() => void runCheck()}
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
            <div
                style={{
                    minHeight: 32,
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

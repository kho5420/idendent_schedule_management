import { useState } from 'react';
import type { ScheduleMonth, InputMethod, GeneratedSchedule } from './types';
import { MonthSelector } from './components/MonthSelector';
import { InputMethodCard } from './components/InputMethodCard';
import { GenerateButton } from './components/GenerateButton';
import { SchedulePreview } from './components/SchedulePreview';
import './index.css';

function getDefaultMonth(): ScheduleMonth {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function App() {
    const [selectedMonth, setSelectedMonth] = useState<ScheduleMonth>(getDefaultMonth);
    const [inputMethod, setInputMethod] = useState<InputMethod | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [googleToken, setGoogleToken] = useState<string | null>(null);
    const [sheetId, setSheetId] = useState<string | null>(null);
    const [generatedSchedule] = useState<GeneratedSchedule | null>(null);
    const [isGenerating] = useState(false);
    const [error] = useState<string | null>(null);
    const [comingSoon, setComingSoon] = useState(false);

    const isReady =
        inputMethod === 'excel'
            ? uploadedFile !== null
            : inputMethod === 'google'
              ? googleToken !== null && sheetId !== null
              : false;

    async function handleGenerate() {
        if (!isReady || !inputMethod) return;
        setComingSoon(true);
        setTimeout(() => setComingSoon(false), 2000);
    }

    return (
        <div style={{ padding: '32px 24px', maxWidth: 820, margin: '0 auto' }}>
            {/* 헤더 */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div
                    style={{
                        display: 'inline-block',
                        background:
                            'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
                        color: 'white',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: 1,
                        padding: '4px 14px',
                        borderRadius: 20,
                        marginBottom: 10,
                    }}
                >
                    언제나이든치과
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: 'white', marginBottom: 6 }}>
                    진료실 스케줄 관리
                </h1>
                <p style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>
                    엑셀 또는 구글 스프레드시트를 업로드하여 월별 스케줄을 자동 생성합니다
                </p>
            </div>

            <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} />

            <div
                style={{
                    fontSize: 12,
                    color: 'var(--color-text-sub)',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: 10,
                }}
            >
                입력 방식 선택
            </div>

            <InputMethodCard
                selected={inputMethod}
                uploadedFile={uploadedFile}
                googleToken={googleToken}
                sheetId={sheetId}
                isLoading={isGenerating}
                onMethodSelect={setInputMethod}
                onFileChange={setUploadedFile}
                onTokenChange={setGoogleToken}
                onSheetIdChange={setSheetId}
            />

            <GenerateButton
                month={selectedMonth}
                isReady={isReady}
                isLoading={isGenerating}
                onClick={handleGenerate}
            />

            {comingSoon && (
                <div
                    style={{
                        textAlign: 'center',
                        fontSize: 13,
                        color: 'var(--color-text-sub)',
                        marginTop: -16,
                        marginBottom: 16,
                    }}
                >
                    🚧 준비 중입니다
                </div>
            )}

            {error && (
                <div
                    style={{
                        background: '#1e1010',
                        border: '1px solid #7f1d1d',
                        borderRadius: 8,
                        padding: '10px 14px',
                        fontSize: 13,
                        color: '#fca5a5',
                        marginBottom: 16,
                    }}
                >
                    ⚠️ {error}
                </div>
            )}

            {generatedSchedule && <SchedulePreview schedule={generatedSchedule} />}
        </div>
    );
}

export default App;

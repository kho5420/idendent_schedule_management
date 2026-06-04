import { useState } from 'react';
import type { ScheduleMonth, InputMethod, ScheduleData, GeneratedSchedule } from './types';
import { MonthSelector } from './components/MonthSelector';
import { InputMethodCard } from './components/InputMethodCard';
import { GenerateButton } from './components/GenerateButton';
import { SchedulePreview } from './components/SchedulePreview';
import { parseScheduleExcel } from './lib/excelParser';
import { fetchSheetData } from './lib/sheetsApi';
import { generateSchedule } from './lib/scheduleGenerator';
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
    const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isReady =
        inputMethod === 'excel'
            ? uploadedFile !== null
            : inputMethod === 'google'
              ? googleToken !== null && sheetId !== null
              : false;

    async function handleGenerate() {
        if (!isReady || !inputMethod) return;
        setIsGenerating(true);
        setError(null);
        try {
            let data: ScheduleData;
            if (inputMethod === 'excel' && uploadedFile) {
                const buf = await uploadedFile.arrayBuffer();
                data = await parseScheduleExcel(buf, selectedMonth);
            } else if (inputMethod === 'google' && googleToken && sheetId) {
                data = await fetchSheetData(sheetId, googleToken, selectedMonth);
            } else {
                throw new Error('입력 데이터가 준비되지 않았습니다.');
            }
            const result = generateSchedule(data, selectedMonth);
            setGeneratedSchedule(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.');
        } finally {
            setIsGenerating(false);
        }
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
                    EDEN
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

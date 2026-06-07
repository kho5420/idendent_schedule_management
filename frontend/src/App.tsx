import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import type { ScheduleMonth, InputMethod, GeneratedSchedule, SheetConnection } from './types';
import { MonthSelector } from './components/MonthSelector';
import { InputMethodCard } from './components/InputMethodCard';
import { GenerateButton } from './components/GenerateButton';
import { SchedulePreview } from './components/SchedulePreview';
import { ChangelogModal } from './components/ChangelogModal';
import { StaffSettingsPage } from './components/StaffSettingsPage';
import { ScheduleSettingsPage } from './components/ScheduleSettingsPage';
import { hasNewVersion, markAsSeen } from './lib/changelog';
import './index.css';

function getDefaultMonth(): ScheduleMonth {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function MainPage() {
    const navigate = useNavigate();
    const [selectedMonth, setSelectedMonth] = useState<ScheduleMonth>(getDefaultMonth);
    const [inputMethod, setInputMethod] = useState<InputMethod | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [googleToken, setGoogleToken] = useState<string | null>(null);
    const [scheduleSheet, setScheduleSheet] = useState<SheetConnection>(null);
    const [leaveRequestSheet, setLeaveRequestSheet] = useState<SheetConnection>(null);
    const [generatedSchedule] = useState<GeneratedSchedule | null>(null);
    const [isGenerating] = useState(false);
    const [error] = useState<string | null>(null);
    const [comingSoon, setComingSoon] = useState(false);
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [showBadge, setShowBadge] = useState(() => hasNewVersion());

    const isReady =
        inputMethod === 'excel'
            ? uploadedFile !== null
            : inputMethod === 'google'
              ? googleToken !== null && scheduleSheet !== null
              : false;

    async function handleGenerate() {
        if (!isReady || !inputMethod) return;
        setComingSoon(true);
        setTimeout(() => setComingSoon(false), 2000);
    }

    return (
        <div className="app-container">
            <div style={{ marginBottom: 32 }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 6,
                        marginBottom: 16,
                    }}
                >
                    <button
                        onClick={() => {
                            setIsChangelogOpen(true);
                            setShowBadge(false);
                            markAsSeen();
                        }}
                        className="header-action-btn"
                        style={{
                            position: 'relative',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 12,
                            cursor: 'pointer',
                        }}
                    >
                        📋 업데이트
                        {showBadge && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: -6,
                                    right: -6,
                                    background: '#ef4444',
                                    color: 'white',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    borderRadius: 8,
                                    padding: '2px 5px',
                                    lineHeight: 1,
                                }}
                            >
                                NEW
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => navigate('/staff')}
                        className="header-action-btn"
                        style={{
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 12,
                            cursor: 'pointer',
                        }}
                    >
                        ⚙ 직원 설정
                    </button>
                    <button
                        onClick={() => navigate('/schedule-settings')}
                        className="header-action-btn"
                        style={{
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 12,
                            cursor: 'pointer',
                        }}
                    >
                        📅 스케줄 설정
                    </button>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div
                        style={{
                            display: 'inline-block',
                            background:
                                'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
                            color: 'white',
                            fontSize: 12,
                            fontWeight: 600,
                            letterSpacing: 1,
                            padding: '4px 14px',
                            borderRadius: 20,
                            marginBottom: 10,
                        }}
                    >
                        언제나이든치과
                    </div>
                    <h1
                        style={{
                            fontSize: 26,
                            fontWeight: 700,
                            color: 'var(--color-text)',
                            marginBottom: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                        }}
                    >
                        <img
                            src={`${import.meta.env.BASE_URL}favicon.png`}
                            alt=""
                            style={{ width: 48, height: 48 }}
                        />
                        진료실 스케줄 관리
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-sub)' }}>
                        엑셀 또는 구글 스프레드시트를 업로드하여 월별 스케줄을 자동 생성합니다
                    </p>
                </div>
            </div>

            <MonthSelector selected={selectedMonth} onChange={setSelectedMonth} />

            <div
                style={{
                    fontSize: 13,
                    fontWeight: 600,
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
                scheduleSheet={scheduleSheet}
                leaveRequestSheet={leaveRequestSheet}
                isLoading={isGenerating}
                onMethodSelect={setInputMethod}
                onFileChange={setUploadedFile}
                onTokenChange={setGoogleToken}
                onScheduleSheetChange={setScheduleSheet}
                onLeaveRequestSheetChange={setLeaveRequestSheet}
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
                        background: '#fef2f2',
                        border: '1px solid #fca5a5',
                        borderRadius: 8,
                        padding: '10px 14px',
                        fontSize: 13,
                        color: '#dc2626',
                        marginBottom: 16,
                    }}
                >
                    ⚠️ {error}
                </div>
            )}

            {generatedSchedule && <SchedulePreview schedule={generatedSchedule} />}

            <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
        </div>
    );
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/staff" element={<StaffSettingsPage />} />
            <Route path="/schedule-settings" element={<ScheduleSettingsPage />} />
        </Routes>
    );
}

export default App;

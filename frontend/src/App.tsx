import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import type {
    ScheduleMonth,
    InputMethod,
    GeneratedSchedule,
    SheetConnection,
    DayAssignment,
} from './types';
import { MonthSelector } from './components/MonthSelector';
import { InputMethodCard } from './components/InputMethodCard';
import { GenerateButton } from './components/GenerateButton';
import { SchedulePreview } from './components/SchedulePreview';
import { AssignmentPreview } from './components/AssignmentPreview';
import { ChangelogModal } from './components/ChangelogModal';
import { SheetGuideModal } from './components/SheetGuideModal';
import { StaffSettingsPage } from './components/StaffSettingsPage';
import { ScheduleSettingsPage } from './components/ScheduleSettingsPage';
import { hasNewVersion, markAsSeen } from './lib/changelog';
import { fetchStaff } from './lib/staffApi';
import { fetchScheduleSettings } from './lib/scheduleSettingApi';
import { fetchSheetRows } from './lib/sheetsApi';
import { parseLeaveRequests } from './lib/leaveRequestParser';
import { parseDoctorSchedule } from './lib/doctorScheduleParser';
import { assignDailySchedule } from './lib/scheduleAssigner';
import { planWeeklyOffDays } from './lib/weeklyOffPlanner';
import './index.css';

const DOCTOR_EMPLOYEE_TYPE_IDS = [1, 2];
const CLINIC_STAFF_EMPLOYEE_TYPE_ID = 6;

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
    const [dayAssignments, setDayAssignments] = useState<DayAssignment[] | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [comingSoon, setComingSoon] = useState(false);
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [isSheetGuideOpen, setIsSheetGuideOpen] = useState(false);
    const [showBadge, setShowBadge] = useState(() => hasNewVersion());

    const isReady =
        inputMethod === 'excel'
            ? uploadedFile !== null
            : inputMethod === 'google'
              ? googleToken !== null && scheduleSheet !== null
              : false;

    async function handleGenerate() {
        if (!isReady || !inputMethod) return;

        if (inputMethod !== 'google' || !googleToken || !scheduleSheet) {
            setComingSoon(true);
            setTimeout(() => setComingSoon(false), 2000);
            return;
        }

        setError(null);
        setDayAssignments(null);
        setIsGenerating(true);
        try {
            const [staff, scheduleSettings, scheduleRows, leaveRequestRows] = await Promise.all([
                fetchStaff(),
                fetchScheduleSettings(),
                fetchSheetRows(scheduleSheet.sheetId, googleToken, scheduleSheet.tabName),
                leaveRequestSheet
                    ? fetchSheetRows(
                          leaveRequestSheet.sheetId,
                          googleToken,
                          leaveRequestSheet.tabName
                      )
                    : Promise.resolve([]),
            ]);

            const clinicStaff = staff.filter(
                (s) => s.employee_type_id === CLINIC_STAFF_EMPLOYEE_TYPE_ID
            );
            const doctors = staff.filter(
                (s) =>
                    s.employee_type_id != null &&
                    DOCTOR_EMPLOYEE_TYPE_IDS.includes(s.employee_type_id)
            );

            const doctorSchedule = parseDoctorSchedule(scheduleRows, selectedMonth);
            const leaveRequests = parseLeaveRequests(leaveRequestRows, selectedMonth);

            const plannedOffDays = planWeeklyOffDays(
                clinicStaff,
                doctorSchedule,
                leaveRequests,
                scheduleSettings
            );
            setDayAssignments(
                assignDailySchedule(
                    clinicStaff,
                    doctors,
                    leaveRequests,
                    doctorSchedule,
                    scheduleSettings,
                    selectedMonth,
                    plannedOffDays
                )
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : '스케줄 생성 중 오류가 발생했습니다');
        } finally {
            setIsGenerating(false);
        }
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

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#fefce8',
                    border: '1px solid #fde68a',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 12,
                }}
            >
                <span style={{ fontSize: 12, color: '#92400e' }}>
                    구글 시트 연동이 처음이신가요?
                </span>
                <button
                    onClick={() => setIsSheetGuideOpen(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#2563eb',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0,
                    }}
                >
                    설정 가이드 보기 →
                </button>
            </div>

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

            {dayAssignments && <AssignmentPreview assignments={dayAssignments} />}

            <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
            <SheetGuideModal isOpen={isSheetGuideOpen} onClose={() => setIsSheetGuideOpen(false)} />
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

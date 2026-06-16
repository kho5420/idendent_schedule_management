import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import type {
    ScheduleMonth,
    InputMethod,
    SheetConnection,
    ExcelConnection,
    DayAssignment,
} from './types';
import { MonthSelector } from './components/MonthSelector';
import { InputMethodCard } from './components/InputMethodCard';
import { GenerateButton } from './components/GenerateButton';
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
import { writeScheduleToNewTab } from './lib/sheetWriter';
import {
    readWorkbook,
    sheetToRows,
    buildScheduleWorkbook,
    downloadWorkbook,
} from './lib/excelWorkbook';
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
    const [excelScheduleConn, setExcelScheduleConn] = useState<ExcelConnection>(null);
    const [excelLeaveConn, setExcelLeaveConn] = useState<ExcelConnection>(null);
    const [googleToken, setGoogleToken] = useState<string | null>(null);
    const [scheduleSheet, setScheduleSheet] = useState<SheetConnection>(null);
    const [leaveRequestSheet, setLeaveRequestSheet] = useState<SheetConnection>(null);
    const [dayAssignments, setDayAssignments] = useState<DayAssignment[] | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [seed, setSeed] = useState(0);
    const [isWriting, setIsWriting] = useState(false);
    const [writeMsg, setWriteMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [isSheetGuideOpen, setIsSheetGuideOpen] = useState(false);
    const [showBadge, setShowBadge] = useState(() => hasNewVersion());

    const isReady =
        inputMethod === 'excel'
            ? excelScheduleConn !== null
            : inputMethod === 'google'
              ? googleToken !== null && scheduleSheet !== null
              : false;

    async function handleGenerate(genSeed: number = seed) {
        if (!isReady || !inputMethod) return;

        setError(null);
        setDayAssignments(null);
        setIsGenerating(true);
        try {
            const [staff, scheduleSettings] = await Promise.all([
                fetchStaff(),
                fetchScheduleSettings(),
            ]);

            let scheduleRows: unknown[][];
            let leaveRequestRows: unknown[][];

            if (inputMethod === 'google') {
                if (!googleToken || !scheduleSheet) return;
                [scheduleRows, leaveRequestRows] = await Promise.all([
                    fetchSheetRows(scheduleSheet.sheetId, googleToken, scheduleSheet.tabName),
                    leaveRequestSheet
                        ? fetchSheetRows(
                              leaveRequestSheet.sheetId,
                              googleToken,
                              leaveRequestSheet.tabName
                          )
                        : Promise.resolve([] as unknown[][]),
                ]);
            } else {
                if (!excelScheduleConn) return;
                const scheduleWb = await readWorkbook(excelScheduleConn.file);
                scheduleRows = sheetToRows(scheduleWb, excelScheduleConn.tabName);
                if (excelLeaveConn) {
                    const leaveWb = await readWorkbook(excelLeaveConn.file);
                    leaveRequestRows = sheetToRows(leaveWb, excelLeaveConn.tabName);
                } else {
                    leaveRequestRows = [];
                }
            }

            const clinicStaff = staff.filter(
                (s) => s.employee_type_id === CLINIC_STAFF_EMPLOYEE_TYPE_ID
            );
            const doctors = staff.filter(
                (s) =>
                    s.employee_type_id != null &&
                    DOCTOR_EMPLOYEE_TYPE_IDS.includes(s.employee_type_id)
            );

            const doctorSchedule = parseDoctorSchedule(scheduleRows, selectedMonth);
            if (doctorSchedule.length === 0) {
                throw new Error('스케줄을 읽지 못했어요. 탭 이름·양식을 확인해 주세요');
            }
            const leaveRequests = parseLeaveRequests(leaveRequestRows, selectedMonth);

            const plannedOffDays = planWeeklyOffDays(
                clinicStaff,
                doctorSchedule,
                leaveRequests,
                scheduleSettings,
                genSeed
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

    function handleDownloadExcel() {
        if (!dayAssignments || !excelScheduleConn) return;
        setWriteMsg(null);
        setIsWriting(true);
        void (async () => {
            try {
                const sourceWb = await readWorkbook(excelScheduleConn.file);
                const { workbook, sheetName } = buildScheduleWorkbook(
                    sourceWb,
                    excelScheduleConn.tabName,
                    dayAssignments,
                    selectedMonth
                );
                const fileName = `언제나이든치과_스케줄_${selectedMonth.year}_${String(
                    selectedMonth.month
                ).padStart(2, '0')}.xlsx`;
                await downloadWorkbook(workbook, fileName);
                setWriteMsg({ ok: true, text: `'${sheetName}' 시트로 새 엑셀 파일을 받았어요` });
            } catch (e) {
                setWriteMsg({
                    ok: false,
                    text: e instanceof Error ? e.message : '다운로드 중 오류가 발생했습니다',
                });
            } finally {
                setIsWriting(false);
            }
        })();
    }

    async function handleWriteToSheet() {
        if (!dayAssignments || !googleToken || !scheduleSheet) return;
        setWriteMsg(null);
        setIsWriting(true);
        try {
            const tab = await writeScheduleToNewTab(
                scheduleSheet.sheetId,
                googleToken,
                selectedMonth,
                dayAssignments
            );
            setWriteMsg({ ok: true, text: `'${tab}' 탭에 입력 완료` });
        } catch (e) {
            const msg = e instanceof Error ? e.message : '시트 입력 중 오류가 발생했습니다';
            setWriteMsg({
                ok: false,
                text: msg.includes('(401)') ? '구글 로그인이 만료됐어요. 다시 연결해 주세요' : msg,
            });
        } finally {
            setIsWriting(false);
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
                googleToken={googleToken}
                scheduleSheet={scheduleSheet}
                leaveRequestSheet={leaveRequestSheet}
                onMethodSelect={setInputMethod}
                onExcelScheduleChange={setExcelScheduleConn}
                onExcelLeaveChange={setExcelLeaveConn}
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
                onClick={() => void handleGenerate()}
            />

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

            {dayAssignments && (
                <>
                    <div
                        style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: 8,
                            padding: '10px 12px',
                            marginBottom: 12,
                            fontSize: 12,
                            color: 'var(--color-text-sub)',
                            lineHeight: 1.65,
                        }}
                    >
                        <div
                            style={{ fontWeight: 700, marginBottom: 4, color: 'var(--color-text)' }}
                        >
                            💡 두 버튼은 이렇게 달라요
                        </div>
                        <div>
                            <b>🔀 다시 섞기</b> : 지금 짜인 표가 마음에 안 들 때 눌러요. 규칙(휴무
                            일수·요일 등)은 그대로 지키면서 <b>사람 배치만 다르게</b> 새로 짜드려요.
                        </div>
                        <div style={{ marginTop: 2 }}>
                            원하는 모양이 나올 때까지 여러 번 눌러도 됩니다.
                        </div>
                        <div style={{ marginTop: 2 }}>
                            <b>스케줄 생성</b>(맨 위) : 입력(휴무 신청·원장님 일정)을 <b>고친 뒤</b>{' '}
                            그 내용을 반영해 다시 만들 때 써요.
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            marginBottom: 12,
                        }}
                    >
                        {inputMethod === 'google' ? (
                            <button
                                onClick={() => void handleWriteToSheet()}
                                disabled={isWriting || isGenerating}
                                className="header-action-btn"
                                style={{
                                    borderRadius: 8,
                                    padding: '8px 14px',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    marginRight: 8,
                                    cursor: isWriting || isGenerating ? 'default' : 'pointer',
                                    opacity: isWriting || isGenerating ? 0.6 : 1,
                                }}
                            >
                                {isWriting ? '입력 중…' : '📝 시트에 입력'}
                            </button>
                        ) : (
                            <button
                                onClick={handleDownloadExcel}
                                disabled={isWriting || isGenerating}
                                className="header-action-btn"
                                style={{
                                    borderRadius: 8,
                                    padding: '8px 14px',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    marginRight: 8,
                                    cursor: isWriting || isGenerating ? 'default' : 'pointer',
                                    opacity: isWriting || isGenerating ? 0.6 : 1,
                                }}
                            >
                                {isWriting ? '다운로드 중…' : '📥 엑셀로 다운로드'}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                const next = Math.floor(Math.random() * 1_000_000_000) + 1;
                                setSeed(next);
                                void handleGenerate(next);
                            }}
                            disabled={isGenerating}
                            className="header-action-btn"
                            style={{
                                borderRadius: 8,
                                padding: '8px 14px',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: isGenerating ? 'default' : 'pointer',
                                opacity: isGenerating ? 0.6 : 1,
                            }}
                        >
                            🔀 다시 섞기
                        </button>
                    </div>
                    {writeMsg && (
                        <div
                            style={{
                                background: writeMsg.ok ? '#f0fdf4' : '#fef2f2',
                                border: `1px solid ${writeMsg.ok ? '#bbf7d0' : '#fca5a5'}`,
                                borderRadius: 8,
                                padding: '10px 14px',
                                fontSize: 13,
                                color: writeMsg.ok ? '#166534' : '#dc2626',
                                marginBottom: 12,
                            }}
                        >
                            {writeMsg.ok ? '✅ ' : '⚠️ '}
                            {writeMsg.text}
                        </div>
                    )}
                </>
            )}

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

import { useState, type ReactNode } from 'react';

interface GuideStep {
    title: string;
    items: string[];
}

/** 항목 문자열 안의 URL을 클릭 가능한 링크로 변환 */
function linkify(text: string): ReactNode[] {
    return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
        part.startsWith('http') ? (
            <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}
            >
                {part}
            </a>
        ) : (
            part
        )
    );
}

const STEPS: GuideStep[] = [
    {
        title: '1단계: Google Cloud 프로젝트 만들기',
        items: [
            'https://console.cloud.google.com 접속 후 Google 계정으로 로그인',
            '상단의 프로젝트 선택 메뉴 클릭 → "새 프로젝트"',
            '프로젝트 이름 입력 (예: idendent-schedule) → "만들기"',
            '생성된 프로젝트를 선택해서 들어갑니다',
        ],
    },
    {
        title: '2단계: Google Sheets API 활성화',
        items: [
            '왼쪽 메뉴에서 "API 및 서비스" → "라이브러리" 이동',
            '검색창에 "Google Sheets API" 입력 → 검색 결과 클릭',
            '"사용 설정"(Enable) 버튼 클릭',
        ],
    },
    {
        title: '3단계: OAuth 동의 화면 설정',
        items: [
            '"API 및 서비스" → "OAuth 동의 화면" 이동 → "대상" 메뉴 클릭',
            'User Type에서 "외부(External)" 선택 → 만들기',
            '앱 이름, 사용자 지원 이메일, 개발자 연락처 정보 입력 (필수 항목만)',
            '"범위(Scopes)" 단계는 비워두고 넘어가도 됩니다',
            '"테스트 사용자" 단계에서 실제로 사용할 본인의 Google 계정 이메일 추가',
            '저장하고 완료',
        ],
    },
    {
        title: '4단계: OAuth 클라이언트 ID 발급',
        items: [
            '"API 및 서비스" → "사용자 인증 정보" 이동',
            '상단 "+ 사용자 인증 정보 만들기" → "OAuth 클라이언트 ID" 선택',
            '애플리케이션 유형: "웹 애플리케이션" 선택',
            '이름 입력 (예: schedule-app-web)',
            '"승인된 자바스크립트 원본"에 https://kho5420.github.io 추가',
            '"만들기" 클릭 → 클라이언트 ID 발급 (xxxx.apps.googleusercontent.com 형태)',
        ],
    },
    {
        title: '5단계: 클라이언트 ID 앱에 입력',
        items: [
            '앱 메인 화면에서 "구글 스프레드시트" 카드를 선택하면 클라이언트 ID 입력란이 나타납니다',
            '4단계에서 발급받은 클라이언트 ID (xxxx.apps.googleusercontent.com)를 붙여넣고 "저장" 클릭',
            '한 번 저장하면 브라우저에 기억되어 다음에 다시 입력할 필요가 없습니다',
        ],
    },
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function SheetGuideModal({ isOpen, onClose }: Props) {
    const [currentStep, setCurrentStep] = useState(0);

    if (!isOpen) return null;

    const step = STEPS[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === STEPS.length - 1;

    function handleClose() {
        setCurrentStep(0);
        onClose();
    }

    return (
        <div
            onClick={handleClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: 16,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border-hover)',
                    borderRadius: 16,
                    padding: 24,
                    width: '100%',
                    maxWidth: 480,
                    maxHeight: '85dvh',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                }}
            >
                {/* 헤더 */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
                        📖 구글 시트 연동 설정 가이드
                    </span>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-sub)',
                            fontSize: 18,
                            cursor: 'pointer',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 단계 표시기 */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                flex: i < STEPS.length - 1 ? 1 : undefined,
                            }}
                        >
                            <div
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                    background:
                                        i < currentStep
                                            ? 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))'
                                            : 'transparent',
                                    border:
                                        i < currentStep
                                            ? 'none'
                                            : i === currentStep
                                              ? '2px solid var(--color-accent-from)'
                                              : '2px solid var(--color-border)',
                                    color:
                                        i < currentStep
                                            ? 'white'
                                            : i === currentStep
                                              ? 'var(--color-accent-from)'
                                              : 'var(--color-text-sub)',
                                }}
                            >
                                {i < currentStep ? '✓' : i + 1}
                            </div>
                            {i < STEPS.length - 1 && (
                                <div
                                    style={{
                                        flex: 1,
                                        height: 2,
                                        background:
                                            i < currentStep
                                                ? 'var(--color-accent-from)'
                                                : 'var(--color-border)',
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* 단계 콘텐츠 */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: 'var(--color-text)',
                            marginBottom: 12,
                        }}
                    >
                        {step.title}
                    </div>
                    <ol
                        style={{
                            margin: 0,
                            paddingLeft: 20,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                        }}
                    >
                        {step.items.map((item, i) => (
                            <li
                                key={i}
                                style={{
                                    fontSize: 13,
                                    color: 'var(--color-text-sub)',
                                    lineHeight: 1.6,
                                }}
                            >
                                {linkify(item)}
                            </li>
                        ))}
                    </ol>
                </div>

                {/* 하단 네비게이션 */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <button
                        onClick={() => setCurrentStep((s) => s - 1)}
                        disabled={isFirst}
                        style={{
                            background: 'none',
                            border: '1px solid var(--color-border)',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: 13,
                            cursor: isFirst ? 'not-allowed' : 'pointer',
                            color: isFirst ? 'var(--color-text-sub)' : 'var(--color-text)',
                            opacity: isFirst ? 0.4 : 1,
                        }}
                    >
                        ← 이전
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>
                        {currentStep + 1} / {STEPS.length}
                    </span>
                    <button
                        onClick={isLast ? handleClose : () => setCurrentStep((s) => s + 1)}
                        style={{
                            background:
                                'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: 'white',
                        }}
                    >
                        {isLast ? '완료 ✓' : '다음 →'}
                    </button>
                </div>
            </div>
        </div>
    );
}

# 구글 시트 연동 가이드 모달 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인 페이지 입력 방식 선택 아래에 안내 배너를 추가하고, 클릭 시 Google Sheets OAuth 설정 5단계를 단계별 스테퍼 모달로 보여준다.

**Architecture:** `SheetGuideModal.tsx` 신규 컴포넌트를 생성하고, `App.tsx`에 배너와 state를 추가한다. 기존 `ChangelogModal` 패턴(backdrop + 패널, 스타일 변수 재사용)을 그대로 따른다. 단계 콘텐츠는 컴포넌트 내부에 하드코딩한다.

**Tech Stack:** React 19, TypeScript (strict), inline style, Tailwind CSS 4 (최소화)

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| `frontend/src/components/SheetGuideModal.tsx` | 신규 — 5단계 스테퍼 모달 |
| `frontend/src/App.tsx` | 수정 — 배너 + `isSheetGuideOpen` state + 모달 렌더링 |

---

### Task 1: SheetGuideModal 컴포넌트 생성

**Files:**
- Create: `frontend/src/components/SheetGuideModal.tsx`

- [ ] **Step 1: 파일 생성 — 단계 데이터 + 컴포넌트 골격**

`frontend/src/components/SheetGuideModal.tsx`를 아래 내용으로 생성한다:

```tsx
interface GuideStep {
    title: string;
    items: string[];
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
        title: '5단계: 클라이언트 ID 등록',
        items: [
            '로컬 개발: frontend/.env 파일을 열어 VITE_GOOGLE_CLIENT_ID= 뒤에 발급받은 ID를 붙여넣기',
            '배포 (GitHub Pages): 저장소 → Settings → Secrets and variables → Actions에 GOOGLE_CLIENT_ID 값 등록',
        ],
    },
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function SheetGuideModal({ isOpen, onClose }: Props) {
    // currentStep state는 Step 2에서 추가
}
```

- [ ] **Step 2: currentStep state 및 전체 렌더링 구현**

`SheetGuideModal.tsx`를 아래 전체 내용으로 교체한다:

```tsx
import { useState } from 'react';

interface GuideStep {
    title: string;
    items: string[];
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
        title: '5단계: 클라이언트 ID 등록',
        items: [
            '로컬 개발: frontend/.env 파일을 열어 VITE_GOOGLE_CLIENT_ID= 뒤에 발급받은 ID를 붙여넣기',
            '배포 (GitHub Pages): 저장소 → Settings → Secrets and variables → Actions에 GOOGLE_CLIENT_ID 값 등록',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    {STEPS.map((_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
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
                                    background: i < currentStep
                                        ? 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))'
                                        : i === currentStep
                                          ? 'transparent'
                                          : 'transparent',
                                    border: i < currentStep
                                        ? 'none'
                                        : i === currentStep
                                          ? '2px solid var(--color-accent-from)'
                                          : '2px solid var(--color-border)',
                                    color: i < currentStep
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
                                        background: i < currentStep
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
                    <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {step.items.map((item, i) => (
                            <li
                                key={i}
                                style={{ fontSize: 13, color: 'var(--color-text-sub)', lineHeight: 1.6 }}
                            >
                                {item}
                            </li>
                        ))}
                    </ol>
                </div>

                {/* 하단 네비게이션 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                            background: 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
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
```

- [ ] **Step 3: 타입 체크**

```bash
cd frontend && npx tsc --noEmit
```

오류 없이 통과해야 한다.

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/components/SheetGuideModal.tsx
git commit -m "feat(guide): SheetGuideModal 컴포넌트 추가"
```

---

### Task 2: App.tsx — 배너 + 모달 연결

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: import 추가**

`App.tsx` 상단 import 블록에 추가:

```tsx
import { SheetGuideModal } from './components/SheetGuideModal';
```

- [ ] **Step 2: state 추가**

`MainPage` 함수 내 기존 state 선언들 바로 아래에 추가:

```tsx
const [isSheetGuideOpen, setIsSheetGuideOpen] = useState(false);
```

- [ ] **Step 3: 배너 + 모달 렌더링 추가**

`<InputMethodCard ... />` 닫는 태그 바로 다음, `<GenerateButton ... />` 바로 위에 배너를 삽입한다:

```tsx
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
```

그리고 `<ChangelogModal ... />` 바로 아래에 모달을 추가한다:

```tsx
<SheetGuideModal isOpen={isSheetGuideOpen} onClose={() => setIsSheetGuideOpen(false)} />
```

- [ ] **Step 4: 타입 체크**

```bash
cd frontend && npx tsc --noEmit
```

오류 없이 통과해야 한다.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/App.tsx
git commit -m "feat(guide): 메인 페이지에 구글 시트 설정 가이드 배너 및 모달 연결"
```

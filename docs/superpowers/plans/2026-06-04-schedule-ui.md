# 진료실 스케줄 관리 UI 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엑셀/구글 시트 업로드 → 월 선택 → 스케줄 미리보기 → 엑셀 다운로드 흐름의 React SPA UI를 구현한다.

**Architecture:** 단일 페이지. `App.tsx`가 전체 상태(`useState`)를 가지고 컴포넌트에 props로 내려준다. 스케줄 생성 로직(`scheduleGenerator.ts`)은 이번 계획에서 stub 처리하며, 나머지 lib(파싱·API·익스포트)는 실제 구현한다.

**Tech Stack:** React 19 + TypeScript, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), SheetJS (`xlsx`), Google Identity Services (GIS) OAuth 2.0, Vitest + Testing Library

---

## 파일 맵

| 경로 | 역할 |
|---|---|
| `frontend/package.json` | xlsx, tailwindcss, 테스트 라이브러리 추가 |
| `frontend/vite.config.ts` | Tailwind 플러그인, Vitest 설정, GitHub Pages base |
| `frontend/index.html` | Google GIS 스크립트 태그 추가 |
| `frontend/src/types.ts` | 공유 TypeScript 타입 정의 |
| `frontend/src/index.css` | Tailwind import + 커스텀 CSS 변수 (디자인 토큰) |
| `frontend/src/App.css` | 비워두기 (삭제 후 재생성) |
| `frontend/src/App.tsx` | 루트 — 전체 상태 + 레이아웃 |
| `frontend/src/components/MonthSelector.tsx` | 월 선택 칩 |
| `frontend/src/components/ExcelUploader.tsx` | 드래그 앤 드롭 파일 업로드 |
| `frontend/src/components/GoogleSheetPicker.tsx` | GIS 로그인 + 시트 URL 입력 |
| `frontend/src/components/InputMethodCard.tsx` | 카드 래퍼 (선택 상태 표시) |
| `frontend/src/components/GenerateButton.tsx` | 생성 버튼 + 로딩 상태 |
| `frontend/src/components/SchedulePreview.tsx` | 미리보기 테이블 + 다운로드 버튼 |
| `frontend/src/lib/excelParser.ts` | SheetJS로 업로드된 .xlsx 파싱 |
| `frontend/src/lib/sheetsApi.ts` | Google Sheets API v4 REST 호출 |
| `frontend/src/lib/scheduleGenerator.ts` | 스케줄 생성 로직 stub |
| `frontend/src/lib/excelExporter.ts` | GeneratedSchedule → .xlsx 생성·다운로드 |
| `frontend/src/lib/__tests__/excelParser.test.ts` | excelParser 단위 테스트 |
| `frontend/src/lib/__tests__/sheetsApi.test.ts` | sheetsApi 단위 테스트 |
| `frontend/src/lib/__tests__/excelExporter.test.ts` | excelExporter 단위 테스트 |
| `frontend/src/test-setup.ts` | @testing-library/jest-dom 셋업 |

---

## Task 1: 의존성 설치 및 빌드 설정

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test-setup.ts`

- [ ] **Step 1: 패키지 설치**

```bash
cd frontend
npm install xlsx
npm install --save-dev @tailwindcss/vite tailwindcss @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: `vite.config.ts` 교체**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: '/eden_schedule_management/',
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test-setup.ts'],
    },
});
```

- [ ] **Step 3: `src/test-setup.ts` 생성**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4: 테스트 실행하여 설정 확인**

```bash
cd frontend && npm test
```

Expected: "No test files found" 또는 pass (에러 없이 종료)

- [ ] **Step 5: 커밋**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/test-setup.ts
git commit -m "chore(frontend): Tailwind v4, SheetJS, 테스트 라이브러리 추가"
```

---

## Task 2: 공유 타입 + 디자인 토큰

**Files:**
- Create: `frontend/src/types.ts`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.css` (비우기)

- [ ] **Step 1: `src/types.ts` 생성**

```ts
export type ScheduleMonth = { year: number; month: number };

export type InputMethod = 'excel' | 'google';

export type ExistingDayData = {
    date: string; // "YYYY-MM-DD"
    dayOfWeek: number; // 0=일, 1=월, ..., 6=토
    clinicStaff: string[]; // 진료실 스텝 이름 목록
};

export type ScheduleData = {
    month: ScheduleMonth;
    days: ExistingDayData[];
};

export type WeekRow = {
    weekLabel: string; // "1주차"
    monday: string[] | null;
    tuesday: string[] | null;
    wednesday: 'all' | null; // 수요일은 항상 전체 출근
    thursday: string[] | null;
    friday: string[] | null;
    saturday: string[] | null;
};

export type GeneratedSchedule = {
    year: number;
    month: number;
    weeks: WeekRow[];
};
```

- [ ] **Step 2: `src/index.css` 교체 (Tailwind + 디자인 토큰)**

```css
@import "tailwindcss";

:root {
    --color-bg: #0f0f1a;
    --color-card: #1e1e2e;
    --color-border: #2d2d44;
    --color-border-hover: #3d3d5c;
    --color-accent-from: #6366f1;
    --color-accent-to: #8b5cf6;
    --color-text: #e0e0f0;
    --color-text-sub: #888;
    --color-success: #22c55e;
    --color-tag-bg: #2d2d44;
    --color-tag-text: #a0a0c0;
}

body {
    background-color: var(--color-bg);
    color: var(--color-text);
    font-family: system-ui, 'Segoe UI', sans-serif;
    min-height: 100vh;
}
```

- [ ] **Step 3: `src/App.css` 비우기**

파일 내용을 전부 지우고 저장 (빈 파일).

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/types.ts frontend/src/index.css frontend/src/App.css
git commit -m "feat(frontend): 공유 타입 정의 및 디자인 토큰 설정"
```

---

## Task 3: MonthSelector 컴포넌트

**Files:**
- Create: `frontend/src/components/MonthSelector.tsx`

- [ ] **Step 1: `MonthSelector.tsx` 작성**

현재 월 기준 -2 ~ +3 범위의 월을 칩으로 표시. 기본 선택은 다음 달.

```tsx
import type { ScheduleMonth } from '../types';

interface Props {
    selected: ScheduleMonth;
    onChange: (month: ScheduleMonth) => void;
}

function getMonthRange(): ScheduleMonth[] {
    const now = new Date();
    const months: ScheduleMonth[] = [];
    for (let offset = -2; offset <= 3; offset++) {
        const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return months;
}

function formatChip({ year, month }: ScheduleMonth): string {
    return `${year % 100}.${String(month).padStart(2, '0')}`;
}

export function MonthSelector({ selected, onChange }: Props) {
    const months = getMonthRange();

    return (
        <div
            style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 20,
            }}
        >
            <span style={{ fontSize: 13, color: 'var(--color-text-sub)', whiteSpace: 'nowrap' }}>
                📅 대상 월 선택
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {months.map((m) => {
                    const isSelected = m.year === selected.year && m.month === selected.month;
                    return (
                        <button
                            key={`${m.year}-${m.month}`}
                            onClick={() => onChange(m)}
                            style={{
                                padding: '6px 16px',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: isSelected ? 600 : 400,
                                border: isSelected ? 'none' : '1px solid var(--color-border)',
                                background: isSelected
                                    ? 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))'
                                    : 'transparent',
                                color: isSelected ? 'white' : 'var(--color-text-sub)',
                                cursor: 'pointer',
                            }}
                        >
                            {formatChip(m)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/components/MonthSelector.tsx
git commit -m "feat(frontend): MonthSelector 컴포넌트 추가"
```

---

## Task 4: ExcelUploader 컴포넌트

**Files:**
- Create: `frontend/src/components/ExcelUploader.tsx`

- [ ] **Step 1: `ExcelUploader.tsx` 작성**

```tsx
import { useRef, useState } from 'react';

interface Props {
    file: File | null;
    onFileChange: (file: File | null) => void;
}

export function ExcelUploader({ file, onFileChange }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped?.name.endsWith('.xlsx')) onFileChange(dropped);
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0] ?? null;
        if (selected) onFileChange(selected);
    }

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                style={{ display: 'none' }}
                onChange={handleChange}
            />
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{
                    border: `1.5px dashed ${isDragging ? 'var(--color-accent-from)' : 'var(--color-border-hover)'}`,
                    borderRadius: 8,
                    padding: 16,
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragging ? '#1a1a2e' : 'transparent',
                    transition: 'all 0.2s',
                }}
            >
                {file ? (
                    <div style={{ fontSize: 12, color: 'var(--color-success)' }}>
                        ✅ {file.name}
                    </div>
                ) : (
                    <div style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>
                        📂 .xlsx 파일을 드래그하거나 클릭하여 선택
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/components/ExcelUploader.tsx
git commit -m "feat(frontend): ExcelUploader 드래그 앤 드롭 컴포넌트 추가"
```

---

## Task 5: GoogleSheetPicker 컴포넌트

**Files:**
- Modify: `frontend/index.html`
- Create: `frontend/src/components/GoogleSheetPicker.tsx`

- [ ] **Step 1: `index.html`에 GIS 스크립트 추가**

`<head>` 태그 안에 추가:
```html
<script src="https://accounts.google.com/gsi/client" async></script>
```

- [ ] **Step 2: `GoogleSheetPicker.tsx` 작성**

```tsx
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
    // URL 형식: https://docs.google.com/spreadsheets/d/{ID}/...
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    // ID만 입력한 경우
    if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim();
    return null;
}

export function GoogleSheetPicker({ token, sheetId, onTokenChange, onSheetIdChange }: Props) {
    const [urlInput, setUrlInput] = useState('');
    const [urlError, setUrlError] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem(TOKEN_KEY);
        if (saved && !token) onTokenChange(saved);
    }, []);

    function login() {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId || !window.google) return;
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
                    fontSize: 12,
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    width: '100%',
                }}
            >
                🔑 Google로 로그인
            </button>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--color-success)' }}>✅ 로그인됨</div>
            {sheetId ? (
                <div style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>
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
                            fontSize: 11,
                            color: 'var(--color-text)',
                            width: '100%',
                        }}
                    />
                    {urlError && (
                        <div style={{ fontSize: 10, color: '#f87171' }}>{urlError}</div>
                    )}
                    <button
                        onClick={handleUrlSubmit}
                        style={{
                            background: 'var(--color-border)',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px',
                            fontSize: 11,
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
                    fontSize: 10,
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
```

- [ ] **Step 3: `.env.example` 생성 (환경변수 문서화)**

`frontend/.env.example`:
```
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
```

실제 사용 시 `frontend/.env.local`에 실제 값 입력 (gitignore됨).

- [ ] **Step 4: `.gitignore`에 `.env.local` 추가 확인**

루트 `.gitignore`에 `*.local` 또는 `.env.local` 있는지 확인. 없으면 추가:
```
*.env.local
```

- [ ] **Step 5: 커밋**

```bash
git add frontend/index.html frontend/src/components/GoogleSheetPicker.tsx frontend/.env.example
git commit -m "feat(frontend): GoogleSheetPicker GIS OAuth 컴포넌트 추가"
```

---

## Task 6: InputMethodCard 컴포넌트

**Files:**
- Create: `frontend/src/components/InputMethodCard.tsx`

- [ ] **Step 1: `InputMethodCard.tsx` 작성**

두 카드를 나란히 표시하는 래퍼. 선택된 카드는 퍼플 테두리.

```tsx
import type { InputMethod } from '../types';
import { ExcelUploader } from './ExcelUploader';
import { GoogleSheetPicker } from './GoogleSheetPicker';

interface Props {
    selected: InputMethod | null;
    uploadedFile: File | null;
    googleToken: string | null;
    sheetId: string | null;
    onMethodSelect: (method: InputMethod) => void;
    onFileChange: (file: File | null) => void;
    onTokenChange: (token: string | null) => void;
    onSheetIdChange: (id: string | null) => void;
}

interface CardProps {
    method: InputMethod;
    isSelected: boolean;
    onClick: () => void;
    icon: string;
    title: string;
    description: string;
    children: React.ReactNode;
}

function Card({ method, isSelected, onClick, icon, title, description, children }: CardProps) {
    return (
        <div
            onClick={onClick}
            style={{
                flex: 1,
                background: isSelected ? '#21213a' : 'var(--color-card)',
                border: `1.5px solid ${isSelected ? 'var(--color-accent-from)' : 'var(--color-border)'}`,
                borderRadius: 12,
                padding: 20,
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
            }}
        >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                {title}
            </h3>
            <p style={{ fontSize: 11, color: 'var(--color-text-sub)', marginBottom: 12 }}>
                {description}
            </p>
            <div onClick={(e) => e.stopPropagation()}>{children}</div>
        </div>
    );
}

export function InputMethodCard({
    selected,
    uploadedFile,
    googleToken,
    sheetId,
    onMethodSelect,
    onFileChange,
    onTokenChange,
    onSheetIdChange,
}: Props) {
    return (
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
            <Card
                method="excel"
                isSelected={selected === 'excel'}
                onClick={() => onMethodSelect('excel')}
                icon="📁"
                title="엑셀 파일 업로드"
                description="로컬 .xlsx 파일을 직접 업로드합니다"
            >
                <ExcelUploader file={uploadedFile} onFileChange={onFileChange} />
            </Card>
            <Card
                method="google"
                isSelected={selected === 'google'}
                onClick={() => onMethodSelect('google')}
                icon="📊"
                title="구글 스프레드시트"
                description="Google 계정으로 로그인하여 시트를 불러옵니다"
            >
                <GoogleSheetPicker
                    token={googleToken}
                    sheetId={sheetId}
                    onTokenChange={onTokenChange}
                    onSheetIdChange={onSheetIdChange}
                />
            </Card>
        </div>
    );
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/components/InputMethodCard.tsx
git commit -m "feat(frontend): InputMethodCard 투트랙 카드 컴포넌트 추가"
```

---

## Task 7: GenerateButton 컴포넌트

**Files:**
- Create: `frontend/src/components/GenerateButton.tsx`

- [ ] **Step 1: `GenerateButton.tsx` 작성**

```tsx
interface Props {
    month: { year: number; month: number };
    isReady: boolean;
    isLoading: boolean;
    onClick: () => void;
}

export function GenerateButton({ month, isReady, isLoading, onClick }: Props) {
    return (
        <button
            onClick={onClick}
            disabled={!isReady || isLoading}
            style={{
                width: '100%',
                background: isReady
                    ? 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))'
                    : 'var(--color-border)',
                color: isReady ? 'white' : 'var(--color-text-sub)',
                border: 'none',
                borderRadius: 10,
                padding: 14,
                fontSize: 15,
                fontWeight: 600,
                cursor: isReady && !isLoading ? 'pointer' : 'not-allowed',
                marginBottom: 24,
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
            }}
        >
            {isLoading ? (
                <>
                    <span
                        style={{
                            width: 16,
                            height: 16,
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: 'white',
                            borderRadius: '50%',
                            display: 'inline-block',
                            animation: 'spin 0.8s linear infinite',
                        }}
                    />
                    생성 중...
                </>
            ) : (
                `⚡ ${month.month}월 스케줄 생성`
            )}
        </button>
    );
}
```

`frontend/src/index.css` 맨 아래에 스피너 애니메이션 추가:
```css
@keyframes spin {
    to { transform: rotate(360deg); }
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/components/GenerateButton.tsx frontend/src/index.css
git commit -m "feat(frontend): GenerateButton 로딩 상태 포함 추가"
```

---

## Task 8: lib/excelParser.ts

**Files:**
- Create: `frontend/src/lib/excelParser.ts`
- Create: `frontend/src/lib/__tests__/excelParser.test.ts`

엑셀 파일의 `YY.MM` 형식 시트(예: `26.06`)를 파싱하여 `ScheduleData`를 반환한다.

시트 구조:
- 행 1~3: 메타정보 (무시)
- 행 4: 요일 헤더 (B=월, C=화, D=수, E=목, F=금, G=토, H=일)
- 행 5부터 주차별 5행 반복:
  - 행 0: 날짜 + 원장 스케줄 (날짜 셀에서 일자 추출)
  - 행 1: 매니저
  - 행 2: 데스크
  - 행 3: 기공실
  - 행 4: **진료실** (파싱 대상)

- [ ] **Step 1: 테스트 작성**

```ts
// frontend/src/lib/__tests__/excelParser.test.ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseScheduleExcel } from '../excelParser';

function makeWorkbook(sheetName: string, rows: (string | number | null)[][]): ArrayBuffer {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return buf.buffer as ArrayBuffer;
}

describe('parseScheduleExcel', () => {
    it('대상 월의 진료실 스텝을 파싱한다', async () => {
        const rows = [
            [null, '6月'],                              // row 1
            [null, '26.6.1'],                           // row 2
            [null, ' ~ 26.6.30'],                       // row 3
            [null, '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'], // row 4 (헤더)
            [null, '2 Y,신', '3 Y,오', '4 전체', '5 오', '6 Y,우', '7 신', null], // row 5 (날짜행)
            [null, '매니저A', '매니저B', '매니저C', '매니저D', '매니저E', '매니저F', null],
            [null, '데스크A', '데스크B', '데스크C', '데스크D', '데스크E', '데스크F', null],
            [null, '기공A', '기공B', '기공C', '기공D', '기공E', '기공F', null],
            [null, '이은,성민', '박민,혜수', '전체출근', '언경,은경', '미연,예진', '지수', null], // row 9 (진료실)
        ];
        const buf = makeWorkbook('26.06', rows);
        const result = await parseScheduleExcel(buf, { year: 2026, month: 6 });

        expect(result.month).toEqual({ year: 2026, month: 6 });
        expect(result.days.length).toBeGreaterThan(0);
        const monday = result.days.find((d) => d.dayOfWeek === 1);
        expect(monday?.clinicStaff).toEqual(['이은', '성민']);
    });

    it('대상 월 시트가 없으면 에러를 던진다', async () => {
        const rows = [[null, '샘플']];
        const buf = makeWorkbook('기본틀', rows);
        await expect(parseScheduleExcel(buf, { year: 2026, month: 6 })).rejects.toThrow(
            '시트를 찾을 수 없습니다'
        );
    });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd frontend && npm test -- excelParser
```

Expected: FAIL (excelParser 모듈 없음)

- [ ] **Step 3: `excelParser.ts` 구현**

```ts
// frontend/src/lib/excelParser.ts
import * as XLSX from 'xlsx';
import type { ScheduleData, ScheduleMonth, ExistingDayData } from '../types';

function findSheetName(wb: XLSX.WorkBook, month: ScheduleMonth): string {
    const target = `${String(month.year).slice(-2)}.${String(month.month).padStart(2, '0')}`;
    const found = wb.SheetNames.find((name) => name.startsWith(target));
    if (!found) throw new Error(`시트를 찾을 수 없습니다: ${target}`);
    return found;
}

function parseStaffNames(cell: string | null | undefined): string[] {
    if (!cell) return [];
    return cell
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function extractDay(dateCell: string | null | undefined): number | null {
    if (!dateCell) return null;
    const match = String(dateCell).match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

export async function parseScheduleExcel(
    buffer: ArrayBuffer,
    month: ScheduleMonth
): Promise<ScheduleData> {
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = findSheetName(wb, month);
    const ws = wb.Sheets[sheetName];
    const rows: (string | null)[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: null,
        blankrows: true,
    }) as (string | null)[][];

    // 행 4(index 3)가 헤더. 데이터는 행 5(index 4)부터 5행씩 반복
    // 컬럼 B=1, C=2, D=3, E=4, F=5, G=6 (0-indexed)
    const DAY_COL_TO_DOW: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };

    const days: ExistingDayData[] = [];
    let rowIdx = 4; // 첫 주차 날짜행 (0-indexed)

    while (rowIdx < rows.length) {
        const dateRow = rows[rowIdx];
        const clinicRow = rows[rowIdx + 4];
        if (!dateRow || !clinicRow) break;

        for (const [colStr, dow] of Object.entries(DAY_COL_TO_DOW)) {
            const col = Number(colStr);
            const dayNum = extractDay(dateRow[col]);
            if (!dayNum) continue;

            const dateStr = `${month.year}-${String(month.month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const staff = parseStaffNames(clinicRow[col]);

            days.push({ date: dateStr, dayOfWeek: dow, clinicStaff: staff });
        }

        rowIdx += 5; // 다음 주차
    }

    return { month, days };
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd frontend && npm test -- excelParser
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/excelParser.ts frontend/src/lib/__tests__/excelParser.test.ts
git commit -m "feat(frontend): excelParser SheetJS 기반 엑셀 파싱 구현"
```

---

## Task 9: lib/sheetsApi.ts

**Files:**
- Create: `frontend/src/lib/sheetsApi.ts`
- Create: `frontend/src/lib/__tests__/sheetsApi.test.ts`

Google Sheets API v4 REST로 시트 데이터를 가져와 `ScheduleData`를 반환.

- [ ] **Step 1: 테스트 작성**

```ts
// frontend/src/lib/__tests__/sheetsApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSheetData } from '../sheetsApi';

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('fetchSheetData', () => {
    it('API 응답을 ScheduleData로 변환한다', async () => {
        const mockValues = [
            [null, '6月'],
            [null, '26.6.1'],
            [null, '~ 26.6.30'],
            [null, '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
            [null, '2 Y,신', '3 Y,오', '4 전체', '5 오', '6 Y', '7 신', null],
            [null, '매A', '매B', '매C', '매D', '매E', '매F', null],
            [null, '데A', '데B', '데C', '데D', '데E', '데F', null],
            [null, '기A', '기B', '기C', '기D', '기E', '기F', null],
            [null, '이은,성민', '박민', '전체', '언경', '미연', '지수', null],
        ];

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ values: mockValues }),
        } as Response);

        const result = await fetchSheetData('sheet-id-123', 'token-abc', { year: 2026, month: 6 });
        expect(result.month).toEqual({ year: 2026, month: 6 });
        expect(result.days.some((d) => d.clinicStaff.includes('이은'))).toBe(true);
    });

    it('API 오류 시 에러를 던진다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 403,
            json: async () => ({ error: { message: 'Forbidden' } }),
        } as Response);

        await expect(fetchSheetData('id', 'token', { year: 2026, month: 6 })).rejects.toThrow(
            'Google Sheets API 오류'
        );
    });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd frontend && npm test -- sheetsApi
```

Expected: FAIL

- [ ] **Step 3: `sheetsApi.ts` 구현**

```ts
// frontend/src/lib/sheetsApi.ts
import type { ScheduleData, ScheduleMonth, ExistingDayData } from '../types';

function findSheetTabName(month: ScheduleMonth): string {
    return `${String(month.year).slice(-2)}.${String(month.month).padStart(2, '0')}`;
}

function parseStaffNames(cell: unknown): string[] {
    if (typeof cell !== 'string' || !cell) return [];
    return cell.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

function extractDay(cell: unknown): number | null {
    if (cell == null) return null;
    const match = String(cell).match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

export async function fetchSheetData(
    sheetId: string,
    token: string,
    month: ScheduleMonth
): Promise<ScheduleData> {
    const tabName = findSheetTabName(month);
    const range = encodeURIComponent(`${tabName}!A1:H100`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        throw new Error(`Google Sheets API 오류 (${res.status})`);
    }

    const data = await res.json();
    const rows: unknown[][] = data.values ?? [];

    const DAY_COL_TO_DOW: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
    const days: ExistingDayData[] = [];
    let rowIdx = 4;

    while (rowIdx < rows.length) {
        const dateRow = rows[rowIdx];
        const clinicRow = rows[rowIdx + 4];
        if (!dateRow || !clinicRow) break;

        for (const [colStr, dow] of Object.entries(DAY_COL_TO_DOW)) {
            const col = Number(colStr);
            const dayNum = extractDay(dateRow[col]);
            if (!dayNum) continue;

            const dateStr = `${month.year}-${String(month.month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            days.push({ date: dateStr, dayOfWeek: dow, clinicStaff: parseStaffNames(clinicRow[col]) });
        }

        rowIdx += 5;
    }

    return { month, days };
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd frontend && npm test -- sheetsApi
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/sheetsApi.ts frontend/src/lib/__tests__/sheetsApi.test.ts
git commit -m "feat(frontend): sheetsApi Google Sheets API v4 연동 구현"
```

---

## Task 10: lib/scheduleGenerator.ts + lib/excelExporter.ts

**Files:**
- Create: `frontend/src/lib/scheduleGenerator.ts` (stub)
- Create: `frontend/src/lib/excelExporter.ts`
- Create: `frontend/src/lib/__tests__/excelExporter.test.ts`

- [ ] **Step 1: `scheduleGenerator.ts` stub 작성**

실제 로직은 추후 구현. 지금은 빈 주차 배열 반환.

```ts
// frontend/src/lib/scheduleGenerator.ts
import type { ScheduleData, ScheduleMonth, GeneratedSchedule } from '../types';

export function generateSchedule(
    _data: ScheduleData,
    month: ScheduleMonth
): GeneratedSchedule {
    // TODO: 실제 스케줄 생성 로직 구현 예정
    return { year: month.year, month: month.month, weeks: [] };
}
```

- [ ] **Step 2: excelExporter 테스트 작성**

```ts
// frontend/src/lib/__tests__/excelExporter.test.ts
import { describe, it, expect, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { exportScheduleToExcel } from '../excelExporter';
import type { GeneratedSchedule } from '../../types';

describe('exportScheduleToExcel', () => {
    it('유효한 .xlsx ArrayBuffer를 반환한다', () => {
        const schedule: GeneratedSchedule = {
            year: 2026,
            month: 7,
            weeks: [
                {
                    weekLabel: '1주차',
                    monday: ['이은', '성민'],
                    tuesday: ['박민'],
                    wednesday: 'all',
                    thursday: ['언경'],
                    friday: ['미연', '예진'],
                    saturday: ['지수'],
                },
            ],
        };

        const buf = exportScheduleToExcel(schedule);
        expect(buf).toBeInstanceOf(ArrayBuffer);

        // SheetJS로 다시 파싱하여 유효성 검증
        const wb = XLSX.read(buf, { type: 'array' });
        expect(wb.SheetNames.length).toBeGreaterThan(0);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        expect(rows.length).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

```bash
cd frontend && npm test -- excelExporter
```

Expected: FAIL

- [ ] **Step 4: `excelExporter.ts` 구현**

```ts
// frontend/src/lib/excelExporter.ts
import * as XLSX from 'xlsx';
import type { GeneratedSchedule } from '../types';

export function exportScheduleToExcel(schedule: GeneratedSchedule): ArrayBuffer {
    const { year, month, weeks } = schedule;
    const wb = XLSX.utils.book_new();

    // 헤더 행
    const header = ['주차', '월', '화', '수', '목', '금', '토'];
    const dataRows = weeks.map((w) => [
        w.weekLabel,
        w.monday?.join(', ') ?? '',
        w.tuesday?.join(', ') ?? '',
        w.wednesday === 'all' ? '전체 출근' : '',
        w.thursday?.join(', ') ?? '',
        w.friday?.join(', ') ?? '',
        w.saturday?.join(', ') ?? '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);

    // 컬럼 너비 설정
    ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];

    const sheetName = `${year}.${String(month).padStart(2, '0')}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return buf.buffer as ArrayBuffer;
}

export function downloadExcel(schedule: GeneratedSchedule): void {
    const buf = exportScheduleToExcel(schedule);
    const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eden_schedule_${schedule.year}_${String(schedule.month).padStart(2, '0')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
cd frontend && npm test -- excelExporter
```

Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/lib/scheduleGenerator.ts frontend/src/lib/excelExporter.ts frontend/src/lib/__tests__/excelExporter.test.ts
git commit -m "feat(frontend): scheduleGenerator stub, excelExporter 다운로드 구현"
```

---

## Task 11: SchedulePreview 컴포넌트

**Files:**
- Create: `frontend/src/components/SchedulePreview.tsx`

- [ ] **Step 1: `SchedulePreview.tsx` 작성**

```tsx
import type { GeneratedSchedule } from '../types';
import { downloadExcel } from '../lib/excelExporter';

interface Props {
    schedule: GeneratedSchedule;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_LABELS = ['월', '화', '수', '목', '금', '토'];

function StaffTag({ name }: { name: string }) {
    return (
        <span
            style={{
                display: 'inline-block',
                background: 'var(--color-tag-bg)',
                color: 'var(--color-tag-text)',
                borderRadius: 4,
                padding: '1px 6px',
                fontSize: 10,
                margin: '1px 2px 1px 0',
            }}
        >
            {name}
        </span>
    );
}

export function SchedulePreview({ schedule }: Props) {
    return (
        <div
            style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                overflow: 'hidden',
            }}
        >
            {/* 헤더 */}
            <div
                style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                        style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: 'var(--color-success)',
                            display: 'inline-block',
                        }}
                    />
                    {schedule.year}년 {schedule.month}월 스케줄 미리보기
                </div>
                <button
                    onClick={() => downloadExcel(schedule)}
                    style={{
                        background: 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 14px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    ⬇ 엑셀 다운로드
                </button>
            </div>

            {/* 테이블 */}
            <div style={{ overflowX: 'auto', padding: 16 }}>
                {schedule.weeks.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--color-text-sub)', textAlign: 'center', padding: 24 }}>
                        스케줄 생성 로직 구현 후 데이터가 표시됩니다.
                    </p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>주차</th>
                                {DAY_LABELS.map((d) => (
                                    <th key={d} style={thStyle}>{d}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {schedule.weeks.map((week, i) => (
                                <tr key={i}>
                                    <td style={{ ...tdStyle, color: 'var(--color-accent-from)', fontWeight: 600 }}>
                                        {week.weekLabel}
                                    </td>
                                    {DAYS.map((day) => {
                                        const value = week[day];
                                        return (
                                            <td key={day} style={tdStyle}>
                                                {value === 'all' ? (
                                                    <span style={{ fontSize: 10, color: 'var(--color-text-sub)', fontStyle: 'italic' }}>
                                                        전체 출근
                                                    </span>
                                                ) : value ? (
                                                    value.map((name) => <StaffTag key={name} name={name} />)
                                                ) : null}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    background: '#16162a',
    color: 'var(--color-text-sub)',
    padding: '7px 10px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: 10,
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--color-border)',
};

const tdStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderBottom: '1px solid #1a1a2e',
    verticalAlign: 'top',
};
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/components/SchedulePreview.tsx
git commit -m "feat(frontend): SchedulePreview 테이블 + 다운로드 버튼 추가"
```

---

## Task 12: App.tsx 전체 조립

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: `App.tsx` 교체**

```tsx
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
    d.setMonth(d.getMonth() + 1); // 다음 달 (연도 자동 처리)
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
                        background: 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
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

            <div style={{ fontSize: 12, color: 'var(--color-text-sub)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
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
```

- [ ] **Step 2: 불필요한 기본 파일 제거**

```bash
rm frontend/src/App.css
rm frontend/src/assets/react.svg frontend/src/assets/vite.svg frontend/src/assets/hero.png
```

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/App.tsx frontend/src/assets
git commit -m "feat(frontend): App.tsx 전체 UI 조립 완료"
```

---

## Task 13: GitHub Pages 배포 설정

**Files:**
- Modify: `frontend/vite.config.ts` (base 이미 설정됨 — 확인만)
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: GitHub Actions 배포 워크플로우 생성**

```bash
mkdir -p .github/workflows
```

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Build
        run: cd frontend && npm run build
        env:
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}

      - uses: actions/configure-pages@v4

      - uses: actions/upload-pages-artifact@v3
        with:
          path: frontend/dist

      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 2: `vite.config.ts`의 base 경로 확인**

`base: '/eden_schedule_management/'` 가 설정되어 있는지 확인. 아니라면 실제 GitHub 레포 이름으로 수정.

- [ ] **Step 3: 커밋**

```bash
git add .github/workflows/deploy.yml
git commit -m "chore(ci): GitHub Pages 자동 배포 워크플로우 추가"
```

---

## Task 14: 최종 테스트 + 로컬 확인

- [ ] **Step 1: 전체 테스트 실행**

```bash
cd frontend && npm test
```

Expected: 모든 테스트 PASS

- [ ] **Step 2: 개발 서버 실행 후 UI 확인**

```bash
cd frontend && npm run dev
```

브라우저에서 http://localhost:5173 열기. 다음 항목 확인:
- 헤더 "EDEN 진료실 스케줄 관리" 표시
- 월 선택 칩 (기본: 다음 달 선택)
- 엑셀 업로드 / 구글 시트 두 카드 나란히
- 파일 업로드 전 생성 버튼 비활성 (회색)
- `.xlsx` 파일 업로드 후 버튼 활성화
- 생성 버튼 클릭 → 미리보기 섹션 표시

- [ ] **Step 3: 스펙·커밋 내역 기반 최종 커밋**

이미 task별로 커밋됨. `git log --oneline`으로 확인:
```bash
git log --oneline -10
```

---

## 완료 기준

- [ ] 모든 Vitest 테스트 통과
- [ ] 개발 서버에서 UI 정상 렌더링
- [ ] 엑셀 업로드 → 생성 버튼 활성화 → 미리보기 표시 → 다운로드 플로우 동작
- [ ] Google 시트 카드 로그인 버튼 표시 (실제 OAuth는 Client ID 설정 후 동작)

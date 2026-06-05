# 직원 설정 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** localStorage 기반 직원 설정을 Supabase DB 기반으로 전환하고, StaffConfigModal을 `/staff` 전용 페이지(리스트+개별 편집+일괄 편집)로 교체한다.

**Architecture:** React Router v6으로 `/`와 `/staff` 두 라우트를 구성한다. Supabase JS 클라이언트로 `staff`·`employee_type` 테이블을 읽고 쓴다. `StaffSettingsPage`(리스트+필터+체크박스+일괄 툴바), `StaffEditModal`(개별 편집·삭제), `StaffBulkEditModal`(일괄 편집) 세 컴포넌트로 구성된다.

**Tech Stack:** React 19, TypeScript strict, React Router v6, @supabase/supabase-js, Vitest

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| `frontend/.env` | Supabase 환경변수 (gitignore) |
| `frontend/src/vite-env.d.ts` | VITE_SUPABASE_* 타입 선언 추가 |
| `frontend/src/types.ts` | StaffRow, EmployeeType 타입 추가 |
| `frontend/src/lib/supabaseClient.ts` | Supabase 클라이언트 싱글톤 |
| `frontend/src/lib/staffApi.ts` | staff DB CRUD 함수 6개 |
| `frontend/src/lib/__tests__/staffApi.test.ts` | staffApi 단위 테스트 |
| `frontend/src/main.tsx` | BrowserRouter 래핑 추가 |
| `frontend/src/App.tsx` | Routes 설정, MainPage 분리, 직원 설정 버튼 navigate 변경 |
| `frontend/src/components/StaffSettingsPage.tsx` | 리스트 페이지 (필터·체크박스·일괄 툴바) |
| `frontend/src/components/StaffEditModal.tsx` | 개별 편집 모달 (이름 수정·삭제) |
| `frontend/src/components/StaffBulkEditModal.tsx` | 일괄 편집 모달 |

---

### Task 1: 패키지 설치 + 환경변수 + Supabase RLS

**Files:**
- Modify: `frontend/package.json` (npm install 후 자동 갱신)
- Create: `frontend/.env`
- Modify: `frontend/src/vite-env.d.ts`

- [ ] **Step 1: 패키지 설치**

```bash
cd frontend && npm install react-router-dom @supabase/supabase-js
```

Expected: `node_modules/react-router-dom` and `node_modules/@supabase/supabase-js` 설치됨

- [ ] **Step 2: .env 파일 생성**

`frontend/.env` 파일 생성 (이미 `.gitignore`에 포함됨):

```
VITE_SUPABASE_URL=https://nidszhrqmixmquomwnhk.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase 대시보드 → Settings → API → anon public 키 복사>
```

> Supabase 대시보드 접속 → 프로젝트 선택 → Settings → API → "anon public" 키를 복사해서 붙여넣는다.

- [ ] **Step 3: vite-env.d.ts에 환경변수 타입 추가**

`frontend/src/vite-env.d.ts`를 아래와 같이 수정:

```typescript
/// <reference types="vite/client" />

declare module '*.md?raw' {
    const content: string;
    export default content;
}

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
```

- [ ] **Step 4: Supabase RLS 설정**

Supabase 대시보드 → Authentication → Policies 에서 `staff`와 `employee_type` 테이블에 anon 접근 허용 정책을 추가하거나, Table Editor에서 RLS를 비활성화한다.

psql로 직접 설정하려면:

```sql
-- staff 테이블 anon 전체 허용
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON staff FOR ALL TO anon USING (true) WITH CHECK (true);

-- employee_type 테이블 anon 읽기 허용
ALTER TABLE employee_type ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read" ON employee_type FOR SELECT TO anon USING (true);
```

> 내부 도구라면 RLS 자체를 비활성화해도 무방: Table Editor → staff → Disable RLS

- [ ] **Step 5: 커밋**

```bash
cd frontend && git add package.json package-lock.json src/vite-env.d.ts
git commit -m "chore(staff): react-router-dom, supabase-js 패키지 추가 및 env 타입 선언"
```

---

### Task 2: 타입 정의 + Supabase 클라이언트 + staffApi (TDD)

**Files:**
- Modify: `frontend/src/types.ts`
- Create: `frontend/src/lib/supabaseClient.ts`
- Create: `frontend/src/lib/__tests__/staffApi.test.ts`
- Create: `frontend/src/lib/staffApi.ts`

- [ ] **Step 1: types.ts에 StaffRow, EmployeeType 추가**

`frontend/src/types.ts` 기존 내용 맨 아래에 추가:

```typescript
export type EmployeeType = {
    id: number;
    name: string;
};

export type StaffRow = {
    id: number;
    name: string;
    use_yn: 'Y' | 'N';
    employee_type_id: number | null;
    career: '고' | '중' | '저' | '신규' | null;
    team_no: number | null;
    is_ortho: boolean;
    is_team_leader: boolean;
    is_night_fixed: boolean;
    is_weekday_fixed: boolean;
    is_on_leave: boolean;
    is_head_dentist_pick: boolean;
    notes: string | null;
};

export type StaffUpdateData = Partial<
    Pick<
        StaffRow,
        | 'name'
        | 'employee_type_id'
        | 'career'
        | 'team_no'
        | 'is_ortho'
        | 'is_team_leader'
        | 'is_night_fixed'
        | 'is_weekday_fixed'
        | 'is_on_leave'
        | 'is_head_dentist_pick'
        | 'notes'
    >
>;
```

- [ ] **Step 2: supabaseClient.ts 생성**

`frontend/src/lib/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

- [ ] **Step 3: staffApi 실패 테스트 작성**

`frontend/src/lib/__tests__/staffApi.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabaseClient', () => ({
    supabase: { from: vi.fn() },
}));

import { supabase } from '../supabaseClient';
import {
    fetchStaff,
    fetchEmployeeTypes,
    updateStaff,
    createStaff,
    deleteStaff,
    bulkUpdateStaff,
} from '../staffApi';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('fetchStaff', () => {
    it('staff 목록을 반환한다', async () => {
        const data = [{ id: 1, name: '노이은', is_ortho: false }];
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data, error: null }),
            }),
        });
        expect(await fetchStaff()).toEqual(data);
        expect(mockFrom).toHaveBeenCalledWith('staff');
    });

    it('에러 시 throw한다', async () => {
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
            }),
        });
        await expect(fetchStaff()).rejects.toThrow('db error');
    });
});

describe('fetchEmployeeTypes', () => {
    it('use_yn=Y인 목록을 반환한다', async () => {
        const data = [{ id: 6, name: '진료실' }];
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({ data, error: null }),
                }),
            }),
        });
        expect(await fetchEmployeeTypes()).toEqual(data);
        expect(mockFrom).toHaveBeenCalledWith('employee_type');
    });
});

describe('updateStaff', () => {
    it('id로 staff를 업데이트한다', async () => {
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ update: mockUpdate });
        await updateStaff(1, { name: '새이름' });
        expect(mockUpdate).toHaveBeenCalledWith({ name: '새이름' });
        expect(mockEq).toHaveBeenCalledWith('id', 1);
    });
});

describe('createStaff', () => {
    it('새 직원을 insert한다', async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        mockFrom.mockReturnValue({ insert: mockInsert });
        const data = { name: '신규', use_yn: 'Y' as const, employee_type_id: null, career: null, team_no: null, is_ortho: false, is_team_leader: false, is_night_fixed: false, is_weekday_fixed: false, is_on_leave: false, is_head_dentist_pick: false, notes: null };
        await createStaff(data);
        expect(mockInsert).toHaveBeenCalledWith(data);
    });
});

describe('deleteStaff', () => {
    it('id로 staff를 삭제한다', async () => {
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ delete: mockDelete });
        await deleteStaff(1);
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', 1);
    });
});

describe('bulkUpdateStaff', () => {
    it('여러 id를 in()으로 일괄 업데이트한다', async () => {
        const mockIn = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
        mockFrom.mockReturnValue({ update: mockUpdate });
        await bulkUpdateStaff([1, 2], { is_ortho: true });
        expect(mockUpdate).toHaveBeenCalledWith({ is_ortho: true });
        expect(mockIn).toHaveBeenCalledWith('id', [1, 2]);
    });
});
```

- [ ] **Step 4: 테스트 실패 확인**

```bash
cd frontend && npm test -- staffApi
```

Expected: FAIL — `staffApi` 모듈을 찾을 수 없음

- [ ] **Step 5: staffApi.ts 구현**

`frontend/src/lib/staffApi.ts`:

```typescript
import { supabase } from './supabaseClient';
import type { StaffRow, EmployeeType, StaffUpdateData } from '../types';

export async function fetchStaff(): Promise<StaffRow[]> {
    const { data, error } = await supabase.from('staff').select('*').order('id');
    if (error) throw error;
    return data as StaffRow[];
}

export async function fetchEmployeeTypes(): Promise<EmployeeType[]> {
    const { data, error } = await supabase
        .from('employee_type')
        .select('id, name')
        .eq('use_yn', 'Y')
        .order('id');
    if (error) throw error;
    return data as EmployeeType[];
}

export async function updateStaff(id: number, data: StaffUpdateData): Promise<void> {
    const { error } = await supabase.from('staff').update(data).eq('id', id);
    if (error) throw error;
}

export async function createStaff(data: Omit<StaffRow, 'id'>): Promise<void> {
    const { error } = await supabase.from('staff').insert(data);
    if (error) throw error;
}

export async function deleteStaff(id: number): Promise<void> {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
}

export async function bulkUpdateStaff(ids: number[], data: StaffUpdateData): Promise<void> {
    const { error } = await supabase.from('staff').update(data).in('id', ids);
    if (error) throw error;
}
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
cd frontend && npm test -- staffApi
```

Expected: 7 tests passed

- [ ] **Step 7: 커밋**

```bash
cd frontend && git add src/types.ts src/lib/supabaseClient.ts src/lib/staffApi.ts src/lib/__tests__/staffApi.test.ts
git commit -m "feat(staff): StaffRow 타입 정의, Supabase 클라이언트, staffApi CRUD 구현"
```

---

### Task 3: 라우터 설정 (main.tsx + App.tsx)

**Files:**
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: main.tsx에 BrowserRouter 추가**

`frontend/src/main.tsx` 전체 교체:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <App />
        </BrowserRouter>
    </StrictMode>,
);
```

- [ ] **Step 2: App.tsx 리팩토링 — Routes 설정 + 직원 설정 버튼 변경**

`frontend/src/App.tsx` 전체 교체:

```typescript
import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import type { ScheduleMonth, InputMethod, GeneratedSchedule } from './types';
import { MonthSelector } from './components/MonthSelector';
import { InputMethodCard } from './components/InputMethodCard';
import { GenerateButton } from './components/GenerateButton';
import { SchedulePreview } from './components/SchedulePreview';
import { ChangelogModal } from './components/ChangelogModal';
import { StaffSettingsPage } from './components/StaffSettingsPage';
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
    const [sheetId, setSheetId] = useState<string | null>(null);
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
              ? googleToken !== null && sheetId !== null
              : false;

    async function handleGenerate() {
        if (!isReady || !inputMethod) return;
        setComingSoon(true);
        setTimeout(() => setComingSoon(false), 2000);
    }

    return (
        <div className="app-container">
            <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 16 }}>
                    <button
                        onClick={() => {
                            setIsChangelogOpen(true);
                            setShowBadge(false);
                            markAsSeen();
                        }}
                        style={{
                            position: 'relative',
                            background: 'none',
                            border: '1px solid var(--color-border)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 12,
                            color: 'var(--color-text-sub)',
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
                        style={{
                            background: 'none',
                            border: '1px solid var(--color-border)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 12,
                            color: 'var(--color-text-sub)',
                            cursor: 'pointer',
                        }}
                    >
                        ⚙ 직원 설정
                    </button>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div
                        style={{
                            display: 'inline-block',
                            background: 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
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
                <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-sub)', marginTop: -16, marginBottom: 16 }}>
                    🚧 준비 중입니다
                </div>
            )}

            {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
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
        </Routes>
    );
}

export default App;
```

- [ ] **Step 3: 개발 서버에서 동작 확인**

```bash
cd frontend && npm run dev
```

- `http://localhost:5173/idendent_schedule_management/` 접속 → 메인 화면
- "⚙ 직원 설정" 버튼 클릭 → URL이 `/idendent_schedule_management/staff`로 변경 (StaffSettingsPage는 아직 없으므로 빈 화면 또는 import 에러)

- [ ] **Step 4: 커밋**

```bash
cd frontend && git add src/main.tsx src/App.tsx
git commit -m "feat(staff): react-router-dom 라우터 설정, 직원 설정 버튼 페이지 이동으로 변경"
```

---

### Task 4: StaffSettingsPage 구현

**Files:**
- Create: `frontend/src/components/StaffSettingsPage.tsx`

- [ ] **Step 1: StaffSettingsPage.tsx 생성**

`frontend/src/components/StaffSettingsPage.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StaffRow, EmployeeType } from '../types';
import { fetchStaff, fetchEmployeeTypes } from '../lib/staffApi';
import { StaffEditModal } from './StaffEditModal';
import { StaffBulkEditModal } from './StaffBulkEditModal';

type Filter = 'all' | 'leave' | number;

function avatarGradient(name: string): string {
    const g = [
        'linear-gradient(135deg,#6366f1,#8b5cf6)',
        'linear-gradient(135deg,#8b5cf6,#a78bfa)',
        'linear-gradient(135deg,#0ea5e9,#38bdf8)',
        'linear-gradient(135deg,#10b981,#34d399)',
        'linear-gradient(135deg,#f59e0b,#fbbf24)',
        'linear-gradient(135deg,#64748b,#94a3b8)',
        'linear-gradient(135deg,#ec4899,#f472b6)',
    ];
    return g[(name.charCodeAt(0) || 0) % g.length];
}

const BADGES = [
    { key: 'is_team_leader' as const, label: '팀장', bg: '#fef3c7', color: '#d97706' },
    { key: 'is_ortho' as const, label: '교정', bg: '#ede9fe', color: '#7c3aed' },
    { key: 'is_night_fixed' as const, label: '야간', bg: '#fff7ed', color: '#ea580c' },
    { key: 'is_weekday_fixed' as const, label: '평일', bg: '#f0fdf4', color: '#16a34a' },
    { key: 'is_head_dentist_pick' as const, label: '대표픽', bg: '#f0f0ff', color: '#6366f1' },
    { key: 'is_on_leave' as const, label: '휴직', bg: '#fee2e2', color: '#dc2626' },
];

export function StaffSettingsPage() {
    const navigate = useNavigate();
    const [staff, setStaff] = useState<StaffRow[]>([]);
    const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const [s, t] = await Promise.all([fetchStaff(), fetchEmployeeTypes()]);
            setStaff(s);
            setEmployeeTypes(t);
        } catch {
            setError('데이터를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const filtered = staff.filter(s => {
        if (filter === 'leave') return s.is_on_leave;
        if (typeof filter === 'number') return s.employee_type_id === filter;
        return true;
    });

    function toggleSelect(id: number) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleAll() {
        setSelectedIds(
            selectedIds.size === filtered.length
                ? new Set()
                : new Set(filtered.map(s => s.id)),
        );
    }

    function openEdit(s: StaffRow) {
        setEditingStaff(s);
        setIsEditOpen(true);
    }

    function getTypeName(id: number | null) {
        return employeeTypes.find(t => t.id === id)?.name ?? '';
    }

    const typeIds = [...new Set(staff.map(s => s.employee_type_id).filter((id): id is number => id !== null))];
    const selectedList = staff.filter(s => selectedIds.has(s.id));

    if (loading) {
        return (
            <div className="app-container" style={{ textAlign: 'center', paddingTop: 60, color: 'var(--color-text-sub)', fontSize: 14 }}>
                불러오는 중...
            </div>
        );
    }

    if (error) {
        return (
            <div className="app-container" style={{ textAlign: 'center', paddingTop: 60, color: '#dc2626', fontSize: 14 }}>
                {error}
                <br />
                <button onClick={load} style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-sub)', background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>다시 시도</button>
            </div>
        );
    }

    return (
        <div className="app-container">
            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent-to)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                        언제나이든치과
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>직원 설정</h1>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--color-text-sub)', cursor: 'pointer' }}
                    >
                        ← 메인
                    </button>
                    <button
                        onClick={() => setIsNewOpen(true)}
                        style={{ background: 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer' }}
                    >
                        + 직원 추가
                    </button>
                </div>
            </div>

            {/* 일괄 편집 툴바 */}
            {selectedIds.size >= 2 && (
                <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>{selectedIds.size}명 선택됨</span>
                    <button
                        onClick={() => setIsBulkOpen(true)}
                        style={{ fontSize: 12, fontWeight: 600, color: 'white', background: '#6366f1', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
                    >
                        일괄 편집
                    </button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        style={{ fontSize: 12, color: 'var(--color-text-sub)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
                    >
                        ✕ 선택 해제
                    </button>
                </div>
            )}

            {/* 필터 칩 */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {([
                    { label: `전체 ${staff.length}`, value: 'all' as Filter },
                    ...typeIds.map(id => ({ label: getTypeName(id), value: id as Filter })),
                    { label: '휴직', value: 'leave' as Filter },
                ]).map(chip => (
                    <button
                        key={String(chip.value)}
                        onClick={() => setFilter(chip.value)}
                        style={{
                            fontSize: 11, borderRadius: 20, padding: '3px 10px', cursor: 'pointer',
                            background: filter === chip.value ? 'var(--color-accent-to)' : 'var(--color-card)',
                            color: filter === chip.value ? 'white' : 'var(--color-text-sub)',
                            border: `1px solid ${filter === chip.value ? 'transparent' : 'var(--color-border)'}`,
                            fontWeight: filter === chip.value ? 700 : 400,
                        }}
                    >
                        {chip.label}
                    </button>
                ))}
            </div>

            {/* 리스트 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: '20px 28px 1fr 50px 28px 1fr 16px', gap: 6, alignItems: 'center', padding: '0 8px', marginBottom: 4 }}>
                <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleAll}
                    style={{ accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <div />
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-sub)', letterSpacing: 0.5 }}>이름 / 직책</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-sub)', textAlign: 'center' }}>경력</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-sub)', textAlign: 'center' }}>팀</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-sub)' }}>속성</div>
                <div />
            </div>

            {/* 직원 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filtered.map(s => (
                    <div
                        key={s.id}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '20px 28px 1fr 50px 28px 1fr 16px',
                            gap: 6,
                            alignItems: 'center',
                            padding: '8px',
                            borderRadius: 10,
                            background: selectedIds.has(s.id) ? '#eef2ff' : 'var(--color-card)',
                            border: `1px solid ${selectedIds.has(s.id) ? '#c7d2fe' : 'var(--color-border)'}`,
                            opacity: s.is_on_leave ? 0.6 : 1,
                            cursor: 'pointer',
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={selectedIds.has(s.id)}
                            onChange={() => toggleSelect(s.id)}
                            onClick={e => e.stopPropagation()}
                            style={{ accentColor: '#6366f1', cursor: 'pointer' }}
                        />
                        <div
                            style={{ width: 24, height: 24, background: avatarGradient(s.name), borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 700 }}
                        >
                            {s.name[0]}
                        </div>
                        <div onClick={() => openEdit(s)}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{s.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--color-text-sub)' }}>{getTypeName(s.employee_type_id)}</div>
                        </div>
                        <div onClick={() => openEdit(s)} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#6366f1' }}>
                            {s.career ?? '—'}
                        </div>
                        <div onClick={() => openEdit(s)} style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-sub)' }}>
                            {s.team_no ?? '—'}
                        </div>
                        <div onClick={() => openEdit(s)} style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {BADGES.filter(b => s[b.key]).map(b => (
                                <span key={b.key} style={{ fontSize: 9, background: b.bg, color: b.color, borderRadius: 4, padding: '1px 4px', whiteSpace: 'nowrap' }}>
                                    {b.label}
                                </span>
                            ))}
                        </div>
                        <div onClick={() => openEdit(s)} style={{ fontSize: 14, color: 'var(--color-text-sub)', textAlign: 'right' }}>›</div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-sub)', fontSize: 13 }}>
                        표시할 직원이 없습니다
                    </div>
                )}
            </div>

            {/* 개별 편집 모달 */}
            {isEditOpen && editingStaff && (
                <StaffEditModal
                    staff={editingStaff}
                    employeeTypes={employeeTypes}
                    onSave={() => { setIsEditOpen(false); load(); }}
                    onClose={() => setIsEditOpen(false)}
                />
            )}

            {/* 신규 추가 모달 */}
            {isNewOpen && (
                <StaffEditModal
                    staff={null}
                    employeeTypes={employeeTypes}
                    onSave={() => { setIsNewOpen(false); load(); }}
                    onClose={() => setIsNewOpen(false)}
                />
            )}

            {/* 일괄 편집 모달 */}
            {isBulkOpen && (
                <StaffBulkEditModal
                    selectedStaff={selectedList}
                    onSave={() => { setIsBulkOpen(false); setSelectedIds(new Set()); load(); }}
                    onClose={() => setIsBulkOpen(false)}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 2: 개발 서버에서 동작 확인**

```bash
cd frontend && npm run dev
```

- `http://localhost:5173/idendent_schedule_management/` → "⚙ 직원 설정" 클릭
- `/staff` 페이지에서 직원 목록이 로드되는지 확인 (Supabase 연결 필요)
- 필터 칩 클릭 → 목록 필터링 확인
- 체크박스 2개 이상 체크 → 일괄 편집 툴바 등장 확인

- [ ] **Step 3: 커밋**

```bash
cd frontend && git add src/components/StaffSettingsPage.tsx
git commit -m "feat(staff): 직원 설정 페이지 구현 (리스트·필터·체크박스·일괄 툴바)"
```

---

### Task 5: StaffEditModal 구현

**Files:**
- Create: `frontend/src/components/StaffEditModal.tsx`

- [ ] **Step 1: StaffEditModal.tsx 생성**

`frontend/src/components/StaffEditModal.tsx`:

```typescript
import { useState } from 'react';
import type { StaffRow, EmployeeType } from '../types';
import { createStaff, updateStaff, deleteStaff } from '../lib/staffApi';

interface Props {
    staff: StaffRow | null;
    employeeTypes: EmployeeType[];
    onSave: () => void;
    onClose: () => void;
}

type FormData = Omit<StaffRow, 'id'>;

const EMPTY: FormData = {
    name: '',
    use_yn: 'Y',
    employee_type_id: null,
    career: null,
    team_no: null,
    is_ortho: false,
    is_team_leader: false,
    is_night_fixed: false,
    is_weekday_fixed: false,
    is_on_leave: false,
    is_head_dentist_pick: false,
    notes: null,
};

const selectStyle: React.CSSProperties = {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border-hover)',
    borderRadius: 8,
    padding: '6px 8px',
    fontSize: 13,
    color: 'var(--color-text)',
    width: '100%',
};

export function StaffEditModal({ staff, employeeTypes, onSave, onClose }: Props) {
    const [form, setForm] = useState<FormData>(staff ? { ...staff } : { ...EMPTY });
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    function set<K extends keyof FormData>(key: K, val: FormData[K]) {
        setForm(prev => ({ ...prev, [key]: val }));
    }

    async function handleSave() {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            if (staff) {
                await updateStaff(staff.id, form);
            } else {
                await createStaff(form);
            }
            onSave();
        } catch {
            alert('저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!staff) return;
        setSaving(true);
        try {
            await deleteStaff(staff.id);
            onSave();
        } catch {
            alert('삭제에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ background: 'var(--color-card)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360, maxHeight: '90vh', overflowY: 'auto' }}
            >
                {/* 헤더: 이름 input */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <input
                        value={form.name}
                        onChange={e => set('name', e.target.value)}
                        placeholder="이름 입력"
                        style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', background: 'var(--color-bg)', border: '1px solid var(--color-border-hover)', borderRadius: 8, padding: '6px 10px', width: '75%' }}
                    />
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-sub)', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>

                {/* 기본 정보 */}
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>기본 정보</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>직원 유형</span>
                        <select
                            value={form.employee_type_id ?? ''}
                            onChange={e => set('employee_type_id', e.target.value ? Number(e.target.value) : null)}
                            style={selectStyle}
                        >
                            <option value="">선택</option>
                            {employeeTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>경력 수준</span>
                        <select
                            value={form.career ?? ''}
                            onChange={e => set('career', (e.target.value as FormData['career']) || null)}
                            style={selectStyle}
                        >
                            <option value="">선택</option>
                            {(['고', '중', '저', '신규'] as const).map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>팀 번호</span>
                        <select
                            value={form.team_no ?? ''}
                            onChange={e => set('team_no', e.target.value ? Number(e.target.value) : null)}
                            style={selectStyle}
                        >
                            <option value="">없음</option>
                            <option value="1">1팀</option>
                            <option value="2">2팀</option>
                        </select>
                    </label>
                </div>

                {/* 속성 */}
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>속성</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {([
                        ['is_ortho', '교정과', false],
                        ['is_team_leader', '팀장', false],
                        ['is_night_fixed', '야간고정', false],
                        ['is_weekday_fixed', '평일고정', false],
                        ['is_head_dentist_pick', '대표원장픽', false],
                        ['is_on_leave', '휴직 중', true],
                    ] as [keyof FormData, string, boolean][]).map(([key, label, danger]) => (
                        <label
                            key={key}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: danger ? '#ef4444' : 'var(--color-text)', cursor: 'pointer' }}
                        >
                            <input
                                type="checkbox"
                                checked={form[key] as boolean}
                                onChange={e => set(key, e.target.checked as FormData[typeof key])}
                                style={{ accentColor: danger ? '#ef4444' : '#6366f1', cursor: 'pointer' }}
                            />
                            {label}
                        </label>
                    ))}
                </div>

                {/* 메모 */}
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>메모</div>
                <textarea
                    value={form.notes ?? ''}
                    onChange={e => set('notes', e.target.value || null)}
                    placeholder="비고 입력..."
                    style={{ width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border-hover)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--color-text)', resize: 'none', height: 64, boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 16 }}
                />

                {/* 액션 버튼 */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {staff && !confirmDelete && (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            style={{ fontSize: 12, color: '#dc2626', background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            🗑 삭제
                        </button>
                    )}
                    {staff && confirmDelete && (
                        <button
                            onClick={handleDelete}
                            disabled={saving}
                            style={{ fontSize: 12, color: 'white', background: '#dc2626', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            정말 삭제
                        </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <button
                        onClick={onClose}
                        style={{ fontSize: 13, color: 'var(--color-text-sub)', background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !form.name.trim()}
                        style={{ fontSize: 13, fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', opacity: !form.name.trim() ? 0.5 : 1 }}
                    >
                        {saving ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: 동작 확인**

개발 서버에서:
- 직원 행 클릭 → 편집 모달 열림, 이름/필드 정상 표시 확인
- 이름 input 수정 후 저장 → 목록에 반영 확인
- "🗑 삭제" 클릭 → "정말 삭제" 버튼으로 전환, 클릭 시 DB에서 제거 + 목록 갱신 확인
- "+ 직원 추가" → 빈 폼 모달 열림, 저장 시 목록 추가 확인

- [ ] **Step 3: 커밋**

```bash
cd frontend && git add src/components/StaffEditModal.tsx
git commit -m "feat(staff): 개별 편집 모달 구현 (이름 수정·삭제 포함)"
```

---

### Task 6: StaffBulkEditModal 구현

**Files:**
- Create: `frontend/src/components/StaffBulkEditModal.tsx`

- [ ] **Step 1: StaffBulkEditModal.tsx 생성**

`frontend/src/components/StaffBulkEditModal.tsx`:

```typescript
import { useState } from 'react';
import type { StaffRow } from '../types';
import { bulkUpdateStaff } from '../lib/staffApi';

interface Props {
    selectedStaff: StaffRow[];
    onSave: () => void;
    onClose: () => void;
}

type BulkKey = 'career' | 'team_no' | 'is_ortho' | 'is_night_fixed' | 'is_weekday_fixed' | 'is_head_dentist_pick' | 'is_on_leave';

type BulkValues = {
    career: '고' | '중' | '저' | '신규';
    team_no: number | null;
    is_ortho: boolean;
    is_night_fixed: boolean;
    is_weekday_fixed: boolean;
    is_head_dentist_pick: boolean;
    is_on_leave: boolean;
};

const BOOL_FIELDS: { key: BulkKey; label: string }[] = [
    { key: 'is_ortho', label: '교정과' },
    { key: 'is_night_fixed', label: '야간고정' },
    { key: 'is_weekday_fixed', label: '평일고정' },
    { key: 'is_head_dentist_pick', label: '대표원장픽' },
    { key: 'is_on_leave', label: '휴직 중' },
];

const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
    borderRadius: 8, padding: '8px 10px',
};

const selectStyle: React.CSSProperties = {
    background: 'var(--color-card)', border: '1px solid var(--color-border-hover)',
    borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--color-text)',
};

export function StaffBulkEditModal({ selectedStaff, onSave, onClose }: Props) {
    const [enabled, setEnabled] = useState<Set<BulkKey>>(new Set());
    const [values, setValues] = useState<BulkValues>({
        career: '중',
        team_no: 1,
        is_ortho: false,
        is_night_fixed: false,
        is_weekday_fixed: false,
        is_head_dentist_pick: false,
        is_on_leave: false,
    });
    const [saving, setSaving] = useState(false);

    function toggleField(key: BulkKey) {
        setEnabled(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    function setValue<K extends BulkKey>(key: K, val: BulkValues[K]) {
        setValues(prev => ({ ...prev, [key]: val }));
    }

    async function handleSave() {
        if (enabled.size === 0) return;
        setSaving(true);
        const data: Partial<BulkValues> = {};
        for (const key of enabled) {
            (data as Record<string, unknown>)[key] = values[key];
        }
        try {
            await bulkUpdateStaff(selectedStaff.map(s => s.id), data);
            onSave();
        } catch {
            alert('일괄 저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ background: 'var(--color-card)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360, maxHeight: '90vh', overflowY: 'auto' }}
            >
                {/* 헤더 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
                        일괄 편집 — {selectedStaff.length}명
                    </span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-sub)', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>

                {/* 선택된 직원 목록 */}
                <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 16 }}>
                    {selectedStaff.map(s => s.name).join(', ')}
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>체크한 항목만 일괄 적용됩니다</div>
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>적용할 항목 선택</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                    {/* 경력 수준 */}
                    <div style={rowStyle}>
                        <input type="checkbox" checked={enabled.has('career')} onChange={() => toggleField('career')} style={{ accentColor: '#6366f1', cursor: 'pointer' }} />
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text)' }}>경력 수준</span>
                        <select
                            value={values.career}
                            onChange={e => setValue('career', e.target.value as BulkValues['career'])}
                            disabled={!enabled.has('career')}
                            style={{ ...selectStyle, opacity: enabled.has('career') ? 1 : 0.35 }}
                        >
                            {(['고', '중', '저', '신규'] as const).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>

                    {/* 팀 번호 */}
                    <div style={rowStyle}>
                        <input type="checkbox" checked={enabled.has('team_no')} onChange={() => toggleField('team_no')} style={{ accentColor: '#6366f1', cursor: 'pointer' }} />
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text)' }}>팀 번호</span>
                        <select
                            value={values.team_no ?? ''}
                            onChange={e => setValue('team_no', e.target.value ? Number(e.target.value) : null)}
                            disabled={!enabled.has('team_no')}
                            style={{ ...selectStyle, opacity: enabled.has('team_no') ? 1 : 0.35 }}
                        >
                            <option value="">없음</option>
                            <option value="1">1팀</option>
                            <option value="2">2팀</option>
                        </select>
                    </div>

                    {/* Boolean 필드 */}
                    {BOOL_FIELDS.map(f => (
                        <div key={f.key} style={rowStyle}>
                            <input type="checkbox" checked={enabled.has(f.key)} onChange={() => toggleField(f.key)} style={{ accentColor: '#6366f1', cursor: 'pointer' }} />
                            <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text)' }}>{f.label}</span>
                            <select
                                value={values[f.key] ? 'true' : 'false'}
                                onChange={e => setValue(f.key, e.target.value === 'true' as unknown as BulkValues[typeof f.key])}
                                disabled={!enabled.has(f.key)}
                                style={{ ...selectStyle, opacity: enabled.has(f.key) ? 1 : 0.35 }}
                            >
                                <option value="true">ON</option>
                                <option value="false">OFF</option>
                            </select>
                        </div>
                    ))}
                </div>

                {/* 액션 버튼 */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={onClose}
                        style={{ flex: 1, fontSize: 13, color: 'var(--color-text-sub)', background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px', cursor: 'pointer' }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || enabled.size === 0}
                        style={{ flex: 2, fontSize: 13, fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', opacity: enabled.size === 0 ? 0.5 : 1 }}
                    >
                        {saving ? '저장 중...' : '일괄 저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: 동작 확인**

개발 서버에서:
- 직원 2명 이상 체크 → "일괄 편집" 버튼 클릭 → 모달 열림
- 경력 수준 체크 + 값 선택 → "일괄 저장" → 목록 갱신 확인
- 아무것도 체크하지 않으면 "일괄 저장" 버튼 비활성화 확인

- [ ] **Step 3: 전체 테스트 통과 확인**

```bash
cd frontend && npm test
```

Expected: 모든 테스트 통과

- [ ] **Step 4: 커밋**

```bash
cd frontend && git add src/components/StaffBulkEditModal.tsx
git commit -m "feat(staff): 일괄 편집 모달 구현"
```

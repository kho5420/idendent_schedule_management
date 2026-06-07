# 스케줄 설정 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 요일별 최소 필요 인원(교정 유무/휴무 시)과 야간진료 여부를 사용자가 직접 설정·저장할 수 있는 `/schedule-settings` 페이지를 추가한다.

**Architecture:** 신규 Supabase 테이블 `schedule_setting`(요일당 1행, 7행)을 만들고, `lib/scheduleSettingApi.ts`로 조회/저장 API를 제공하며, `StaffSettingsPage`와 동일한 카드형 레이아웃 패턴을 따르는 `ScheduleSettingsPage` 컴포넌트에서 표 형태 UI로 편집·일괄 저장한다.

**Tech Stack:** React 19 + TypeScript strict, Supabase (PostgreSQL), Vitest, inline style + `index.css` 클래스

**참고 설계 문서:** `docs/superpowers/specs/2026-06-07-schedule-settings-page-design.md`

---

## Task 1: DB 테이블 생성 (`schedule_setting`)

**대상:** Supabase PostgreSQL (DB 접속 정보는 `.claude/secrets.md` 참고)

- [ ] **Step 1: psql로 접속**

```bash
psql "postgresql://postgres.nidszhrqmixmquomwnhk:***REMOVED***@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
```

- [ ] **Step 2: 테이블 생성 + RLS 정책 추가**

`staff`/`employee_type` 테이블과 동일한 컨벤션(`bigserial` PK, `timestamp(0)` 생성/수정일시, `anon` 권한 정책)을 따른다.

```sql
CREATE TABLE schedule_setting (
    id bigserial PRIMARY KEY,
    create_datetime timestamp(0) without time zone NOT NULL DEFAULT now()::timestamp(0) without time zone,
    modified_datetime timestamp(0) without time zone NOT NULL DEFAULT now()::timestamp(0) without time zone,
    day_name character varying(10) NOT NULL UNIQUE,
    sort_order integer NOT NULL,
    min_staff_with_ortho integer NOT NULL,
    min_staff_without_ortho integer NOT NULL,
    min_staff_on_leave integer NOT NULL,
    has_night_shift boolean NOT NULL DEFAULT false
);

ALTER TABLE schedule_setting ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_all ON schedule_setting
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);
```

- [ ] **Step 3: 월~일 7행 시드 데이터 입력**

```sql
INSERT INTO schedule_setting
    (day_name, sort_order, min_staff_with_ortho, min_staff_without_ortho, min_staff_on_leave, has_night_shift)
VALUES
    ('월', 1, 9, 8, 7, false),
    ('화', 2, 9, 8, 7, false),
    ('수', 3, 12, 12, 11, true),
    ('목', 4, 9, 8, 7, false),
    ('금', 5, 10, 9, 8, true),
    ('토', 6, 10, 7, 6, false),
    ('일', 7, 10, 7, 6, false);
```

- [ ] **Step 4: 결과 확인**

```sql
\d schedule_setting
SELECT day_name, sort_order, min_staff_with_ortho, min_staff_without_ortho, min_staff_on_leave, has_night_shift
FROM schedule_setting ORDER BY sort_order;
```

Expected: 7개 행이 월,화,수,목,금,토,일 순서로 출력되고, 컬럼·정책이 `staff` 테이블과 같은 패턴으로 생성되어 있음.

---

## Task 2: 타입 정의 추가 (`types.ts`)

**Files:**
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: `ScheduleSetting`, `ScheduleSettingUpdateData` 타입 추가**

`types.ts` 맨 끝(`StaffUpdateData` 정의 다음)에 아래 내용을 추가한다.

```typescript
export type ScheduleSetting = {
    id: number;
    day_name: string;
    sort_order: number;
    min_staff_with_ortho: number;
    min_staff_without_ortho: number;
    min_staff_on_leave: number;
    has_night_shift: boolean;
};

export type ScheduleSettingUpdateData = Partial<
    Pick<
        ScheduleSetting,
        | 'min_staff_with_ortho'
        | 'min_staff_without_ortho'
        | 'min_staff_on_leave'
        | 'has_night_shift'
    >
>;
```

- [ ] **Step 2: 타입 체크**

```bash
cd frontend && npx tsc --noEmit
```

Expected: `TypeScript: No errors found`

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/types.ts
git commit -m "$(cat <<'EOF'
feat(types): 스케줄 설정 타입 정의 추가

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: API 모듈 작성 — TDD (`scheduleSettingApi.ts`)

**Files:**
- Create: `frontend/src/lib/scheduleSettingApi.ts`
- Test: `frontend/src/lib/__tests__/scheduleSettingApi.test.ts`

`staffApi.test.ts`와 동일하게 `supabase.from`을 모킹하는 패턴을 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/src/lib/__tests__/scheduleSettingApi.test.ts` 파일을 새로 만든다.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabaseClient', () => ({
    supabase: { from: vi.fn() },
}));

import { supabase } from '../supabaseClient';
import { fetchScheduleSettings, updateScheduleSettings } from '../scheduleSettingApi';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('fetchScheduleSettings', () => {
    it('sort_order 순으로 schedule_setting 목록을 반환한다', async () => {
        const data = [
            {
                id: 1,
                day_name: '월',
                sort_order: 1,
                min_staff_with_ortho: 9,
                min_staff_without_ortho: 8,
                min_staff_on_leave: 7,
                has_night_shift: false,
            },
        ];
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data, error: null }),
            }),
        });
        expect(await fetchScheduleSettings()).toEqual(data);
        expect(mockFrom).toHaveBeenCalledWith('schedule_setting');
    });

    it('에러 시 throw한다', async () => {
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
            }),
        });
        await expect(fetchScheduleSettings()).rejects.toThrow('db error');
    });
});

describe('updateScheduleSettings', () => {
    it('각 항목을 id로 개별 update한다', async () => {
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ update: mockUpdate });

        await updateScheduleSettings([
            { id: 1, data: { min_staff_with_ortho: 10 } },
            { id: 2, data: { has_night_shift: true } },
        ]);

        expect(mockFrom).toHaveBeenCalledTimes(2);
        expect(mockUpdate).toHaveBeenCalledWith({ min_staff_with_ortho: 10 });
        expect(mockUpdate).toHaveBeenCalledWith({ has_night_shift: true });
        expect(mockEq).toHaveBeenCalledWith('id', 1);
        expect(mockEq).toHaveBeenCalledWith('id', 2);
    });

    it('빈 배열이면 아무것도 하지 않는다', async () => {
        await updateScheduleSettings([]);
        expect(mockFrom).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
cd frontend && npx vitest run src/lib/__tests__/scheduleSettingApi.test.ts
```

Expected: FAIL — `Failed to resolve import "../scheduleSettingApi"` (파일이 아직 없음)

- [ ] **Step 3: 최소 구현 작성**

`frontend/src/lib/scheduleSettingApi.ts` 파일을 새로 만든다.

```typescript
import { supabase } from './supabaseClient';
import type { ScheduleSetting, ScheduleSettingUpdateData } from '../types';

export async function fetchScheduleSettings(): Promise<ScheduleSetting[]> {
    const { data, error } = await supabase.from('schedule_setting').select('*').order('sort_order');
    if (error) throw error;
    return data as ScheduleSetting[];
}

export async function updateScheduleSettings(
    updates: { id: number; data: ScheduleSettingUpdateData }[]
): Promise<void> {
    await Promise.all(
        updates.map(({ id, data }) => supabase.from('schedule_setting').update(data).eq('id', id))
    );
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
cd frontend && npx vitest run src/lib/__tests__/scheduleSettingApi.test.ts
```

Expected: PASS — 4개 테스트 모두 통과

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/scheduleSettingApi.ts frontend/src/lib/__tests__/scheduleSettingApi.test.ts
git commit -m "$(cat <<'EOF'
feat(api): 스케줄 설정 조회/저장 API 추가

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: CSS 스타일 추가 (`index.css`)

**Files:**
- Modify: `frontend/src/index.css`

브레인스토밍에서 승인된 v2 시안(스테퍼 입력, 토글 스위치, 평일/주말 구분 닷, 주말 행 강조)을 구현하기 위한 클래스를 추가한다. 기존 `.staff-row` 등과 같은 위치(파일 끝)에 추가한다.

- [ ] **Step 1: CSS 클래스 추가**

`frontend/src/index.css` 파일 끝에 아래 내용을 추가한다.

```css
/* ── Schedule settings page ───────────────────────── */
.schedule-setting-card {
    background-color: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    overflow: hidden;
}
.schedule-setting-head {
    display: grid;
    grid-template-columns: 64px 1fr 1fr 1fr 88px;
    gap: 4px;
    padding: 14px 18px;
    background-color: var(--color-tag-bg);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-sub);
}
.schedule-setting-row {
    display: grid;
    grid-template-columns: 64px 1fr 1fr 1fr 88px;
    gap: 4px;
    align-items: center;
    padding: 12px 18px;
    border-top: 1px solid var(--color-border);
}
.schedule-setting-row.weekend {
    background-color: #fff7ed;
}
.schedule-setting-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: var(--color-accent-to);
    margin-right: 8px;
}
.schedule-setting-dot.weekend {
    background-color: #c2410c;
}
.schedule-setting-stepper {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    overflow: hidden;
}
.schedule-setting-stepper button {
    width: 26px;
    height: 30px;
    border: none;
    background-color: var(--color-bg);
    color: var(--color-text-sub);
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;
}
.schedule-setting-stepper button:hover {
    background-color: var(--color-tag-bg);
    color: var(--color-text);
}
.schedule-setting-stepper .value {
    width: 34px;
    text-align: center;
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text);
}
.schedule-setting-toggle {
    position: relative;
    width: 44px;
    height: 25px;
    border: none;
    border-radius: 13px;
    background-color: var(--color-border);
    cursor: pointer;
    transition: background-color 0.15s ease;
    padding: 0;
}
.schedule-setting-toggle::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 19px;
    height: 19px;
    border-radius: 50%;
    background-color: white;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    transition: left 0.15s ease;
}
.schedule-setting-toggle.on {
    background-color: var(--color-accent-to);
}
.schedule-setting-toggle.on::after {
    left: 22px;
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/index.css
git commit -m "$(cat <<'EOF'
style(schedule-setting): 스케줄 설정 표 스타일 추가

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

(Lint-staged가 커밋 시 포맷을 자동 정리하므로 그대로 진행한다.)

---

## Task 5: `ScheduleSettingsPage` 컴포넌트 구현

**Files:**
- Create: `frontend/src/components/ScheduleSettingsPage.tsx`

`StaffSettingsPage`와 동일한 로딩/에러 처리, 헤더(제목 + "← 메인" 버튼), `app-container` 레이아웃 패턴을 따른다. 컴포넌트 테스트는 프로젝트 컨벤션상 작성하지 않는다 (`StaffSettingsPage` 등 기존 페이지 컴포넌트에도 테스트 파일이 없음).

- [ ] **Step 1: 컴포넌트 파일 작성**

`frontend/src/components/ScheduleSettingsPage.tsx` 파일을 새로 만든다.

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ScheduleSetting, ScheduleSettingUpdateData } from '../types';
import { fetchScheduleSettings, updateScheduleSettings } from '../lib/scheduleSettingApi';

const WEEKEND_DAYS = ['토', '일'];

type StepperProps = { value: number; onChange: (next: number) => void };

function Stepper({ value, onChange }: StepperProps) {
    return (
        <span className="schedule-setting-stepper">
            <button type="button" onClick={() => onChange(Math.max(0, value - 1))}>
                −
            </button>
            <span className="value">{value}</span>
            <button type="button" onClick={() => onChange(value + 1)}>
                +
            </button>
        </span>
    );
}

export function ScheduleSettingsPage() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<ScheduleSetting[]>([]);
    const [original, setOriginal] = useState<ScheduleSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchScheduleSettings();
            setSettings(data);
            setOriginal(data);
        } catch {
            setError('데이터를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    function setMinWithOrtho(id: number, value: number) {
        setSettings((prev) =>
            prev.map((s) => (s.id === id ? { ...s, min_staff_with_ortho: value } : s))
        );
    }
    function setMinWithoutOrtho(id: number, value: number) {
        setSettings((prev) =>
            prev.map((s) => (s.id === id ? { ...s, min_staff_without_ortho: value } : s))
        );
    }
    function setMinOnLeave(id: number, value: number) {
        setSettings((prev) =>
            prev.map((s) => (s.id === id ? { ...s, min_staff_on_leave: value } : s))
        );
    }
    function toggleNightShift(id: number) {
        setSettings((prev) =>
            prev.map((s) => (s.id === id ? { ...s, has_night_shift: !s.has_night_shift } : s))
        );
    }

    const isDirty = settings.some((s) => {
        const orig = original.find((o) => o.id === s.id);
        if (!orig) return false;
        return (
            s.min_staff_with_ortho !== orig.min_staff_with_ortho ||
            s.min_staff_without_ortho !== orig.min_staff_without_ortho ||
            s.min_staff_on_leave !== orig.min_staff_on_leave ||
            s.has_night_shift !== orig.has_night_shift
        );
    });

    async function handleSave() {
        const updates = settings.flatMap((s) => {
            const orig = original.find((o) => o.id === s.id);
            if (!orig) return [];
            const data: ScheduleSettingUpdateData = {};
            if (s.min_staff_with_ortho !== orig.min_staff_with_ortho) {
                data.min_staff_with_ortho = s.min_staff_with_ortho;
            }
            if (s.min_staff_without_ortho !== orig.min_staff_without_ortho) {
                data.min_staff_without_ortho = s.min_staff_without_ortho;
            }
            if (s.min_staff_on_leave !== orig.min_staff_on_leave) {
                data.min_staff_on_leave = s.min_staff_on_leave;
            }
            if (s.has_night_shift !== orig.has_night_shift) {
                data.has_night_shift = s.has_night_shift;
            }
            return Object.keys(data).length > 0 ? [{ id: s.id, data }] : [];
        });
        if (updates.length === 0) return;

        setSaving(true);
        setError(null);
        setSaveMessage(null);
        try {
            await updateScheduleSettings(updates);
            setOriginal(settings);
            setSaveMessage('저장되었습니다.');
        } catch {
            setError('저장하지 못했습니다. 다시 시도해 주세요.');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div
                className="app-container"
                style={{
                    textAlign: 'center',
                    paddingTop: 60,
                    color: 'var(--color-text-sub)',
                    fontSize: 14,
                }}
            >
                불러오는 중...
            </div>
        );
    }

    if (error && settings.length === 0) {
        return (
            <div
                className="app-container"
                style={{ textAlign: 'center', paddingTop: 60, color: '#dc2626', fontSize: 14 }}
            >
                {error}
                <br />
                <button
                    onClick={load}
                    style={{
                        marginTop: 12,
                        fontSize: 13,
                        color: 'var(--color-text-sub)',
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        padding: '6px 14px',
                        cursor: 'pointer',
                    }}
                >
                    다시 시도
                </button>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--color-accent-to)',
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                            marginBottom: 4,
                        }}
                    >
                        언제나이든치과
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                        스케줄 설정
                    </h1>
                </div>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        color: 'var(--color-text-sub)',
                        cursor: 'pointer',
                    }}
                >
                    ← 메인
                </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 14 }}>
                요일별로 필요한 최소 인원과 야간진료 여부를 설정합니다. 변경 후 하단의 저장 버튼을
                눌러주세요.
            </p>

            <div className="schedule-setting-card">
                <div className="schedule-setting-head">
                    <span>요일</span>
                    <span>교정 있는 날</span>
                    <span>교정 없는 날</span>
                    <span>휴무 시 최소</span>
                    <span>야간진료</span>
                </div>
                {settings.map((s) => {
                    const isWeekend = WEEKEND_DAYS.includes(s.day_name);
                    return (
                        <div
                            key={s.id}
                            className={`schedule-setting-row${isWeekend ? ' weekend' : ''}`}
                        >
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                                <span
                                    className={`schedule-setting-dot${isWeekend ? ' weekend' : ''}`}
                                />
                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                                    {s.day_name}
                                </span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Stepper
                                    value={s.min_staff_with_ortho}
                                    onChange={(next) => setMinWithOrtho(s.id, next)}
                                />
                                <span style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>명 이상</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Stepper
                                    value={s.min_staff_without_ortho}
                                    onChange={(next) => setMinWithoutOrtho(s.id, next)}
                                />
                                <span style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>명 이상</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Stepper
                                    value={s.min_staff_on_leave}
                                    onChange={(next) => setMinOnLeave(s.id, next)}
                                />
                                <span style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>명 이상</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                    type="button"
                                    className={`schedule-setting-toggle${s.has_night_shift ? ' on' : ''}`}
                                    onClick={() => toggleNightShift(s.id)}
                                    aria-label={`${s.day_name}요일 야간진료 ${s.has_night_shift ? '끄기' : '켜기'}`}
                                />
                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-sub)' }}>
                                    {s.has_night_shift ? '있음' : '없음'}
                                </span>
                            </span>
                        </div>
                    );
                })}
            </div>

            {error && settings.length > 0 && (
                <p style={{ fontSize: 12, color: '#dc2626', marginTop: 12 }}>{error}</p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
                <button
                    onClick={() => void handleSave()}
                    disabled={!isDirty || saving}
                    style={{
                        background:
                            isDirty && !saving
                                ? 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))'
                                : 'var(--color-border)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '9px 20px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isDirty && !saving ? 'pointer' : 'not-allowed',
                    }}
                >
                    {saving ? '저장 중...' : '저장'}
                </button>
                {saveMessage && (
                    <span style={{ fontSize: 12, color: 'var(--color-success)' }}>{saveMessage}</span>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd frontend && npx tsc --noEmit
```

Expected: `TypeScript: No errors found`

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/ScheduleSettingsPage.tsx
git commit -m "$(cat <<'EOF'
feat(schedule-setting): 스케줄 설정 페이지 컴포넌트 추가

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 라우트 및 헤더 버튼 연결 (`App.tsx`)

**Files:**
- Modify: `frontend/src/App.tsx:9` (import 추가)
- Modify: `frontend/src/App.tsx:92-103` (헤더 버튼 그룹에 버튼 추가)
- Modify: `frontend/src/App.tsx:222` (라우트 추가)

- [ ] **Step 1: import 추가**

`frontend/src/App.tsx:9` 의 `import { StaffSettingsPage } from './components/StaffSettingsPage';` 다음 줄에 추가한다.

```typescript
import { ScheduleSettingsPage } from './components/ScheduleSettingsPage';
```

- [ ] **Step 2: 헤더에 "스케줄 설정" 버튼 추가**

`frontend/src/App.tsx:92-103`의 "⚙ 직원 설정" 버튼 바로 다음에, 동일한 `header-action-btn` 클래스를 사용하는 버튼을 추가한다.

```tsx
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
```

(기존 "⚙ 직원 설정" 버튼은 그대로 두고, 그 아래에 새 버튼만 추가하면 된다.)

- [ ] **Step 3: 라우트 추가**

`frontend/src/App.tsx:221-222`의 `<Routes>` 안, `/staff` 라우트 다음에 추가한다.

```tsx
                <Route path="/" element={<MainPage />} />
                <Route path="/staff" element={<StaffSettingsPage />} />
                <Route path="/schedule-settings" element={<ScheduleSettingsPage />} />
```

- [ ] **Step 4: 타입 체크**

```bash
cd frontend && npx tsc --noEmit
```

Expected: `TypeScript: No errors found`

- [ ] **Step 5: 개발 서버에서 동작 확인**

```bash
cd frontend && npm run dev
```

브라우저에서 `http://localhost:5173` 접속 → 헤더의 "📅 스케줄 설정" 버튼 클릭 → `/schedule-settings` 페이지로 이동, 7개 요일 행과 스테퍼·토글이 정상 표시되는지 확인. 값을 변경하면 "저장" 버튼이 활성화되고, 저장 후 "저장되었습니다." 메시지가 뜨는지 확인. "← 메인" 버튼으로 돌아가는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/App.tsx
git commit -m "$(cat <<'EOF'
feat(schedule-setting): 스케줄 설정 페이지 라우트 및 진입 버튼 연결

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: CHANGELOG 업데이트

**Files:**
- Modify: `frontend/CHANGELOG.md`

- [ ] **Step 1: 새 버전 항목 추가**

`frontend/CHANGELOG.md` 최상단(`## v1.4.0 — 2026-06-07` 바로 위)에 추가한다. (오늘 날짜 기준으로 작업 시점에 맞게 날짜를 조정한다.)

```markdown
## v1.5.0 — 2026-06-07

- 요일별 최소 인원과 야간진료 여부를 직접 설정하는 '스케줄 설정' 화면 추가

```

- [ ] **Step 2: 커밋**

```bash
git add frontend/CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs(changelog): v1.5.0 스케줄 설정 페이지 추가 내역 기록

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## 완료 조건

- [ ] `schedule_setting` 테이블이 7개 행(월~일)으로 생성되어 있다
- [ ] `/schedule-settings` 페이지에서 요일별 최소 인원(교정 있는 날/없는 날/휴무 시)과 야간진료 여부를 조회·수정·저장할 수 있다
- [ ] 변경사항이 없으면 저장 버튼이 비활성화된다
- [ ] 메인 헤더에서 "📅 스케줄 설정" 버튼으로 진입할 수 있다
- [ ] `npx tsc --noEmit` 통과, `npx vitest run src/lib/__tests__/scheduleSettingApi.test.ts` 통과
- [ ] CHANGELOG.md에 항목이 추가되어 있다

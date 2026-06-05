# 직원 설정 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** localStorage 기반으로 진료실 스텝 목록과 교정과 여부를 앱 내에서 추가/삭제/변경할 수 있는 직원 설정 모달을 구현한다.

**Architecture:** `staffConfig.ts`에서 localStorage 읽기/쓰기를 담당하고, `StaffConfigModal.tsx`가 UI를 렌더링한다. App.tsx가 상태를 소유하고 변경 시 즉시 저장한다.

**Tech Stack:** React 19, TypeScript, Vitest, @testing-library/react

---

## 파일 목록

| 액션 | 경로 |
|------|------|
| Modify | `frontend/src/types.ts` |
| Create | `frontend/src/lib/staffConfig.ts` |
| Create | `frontend/src/lib/__tests__/staffConfig.test.ts` |
| Create | `frontend/src/components/StaffConfigModal.tsx` |
| Modify | `frontend/src/App.tsx` |

---

### Task 1: 타입 추가

**Files:**
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: 타입 추가**

`frontend/src/types.ts` 맨 아래에 추가:

```ts
export type StaffMember = {
    name: string;
    isOrtho: boolean;
};

export type StaffConfig = {
    staff: StaffMember[];
};
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/types.ts
git commit -m "feat(types): StaffMember, StaffConfig 타입 추가"
```

---

### Task 2: staffConfig.ts 구현 (TDD)

**Files:**
- Create: `frontend/src/lib/staffConfig.ts`
- Create: `frontend/src/lib/__tests__/staffConfig.test.ts`

- [ ] **Step 1: 테스트 작성**

`frontend/src/lib/__tests__/staffConfig.test.ts` 생성:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadStaffConfig, saveStaffConfig } from '../staffConfig';

beforeEach(() => {
    localStorage.clear();
});

describe('loadStaffConfig', () => {
    it('localStorage가 비어있으면 기본 직원 목록을 반환한다', () => {
        const config = loadStaffConfig();
        expect(config.staff.length).toBeGreaterThan(0);
        expect(config.staff[0]).toHaveProperty('name');
        expect(config.staff[0]).toHaveProperty('isOrtho');
    });

    it('저장된 값이 있으면 해당 값을 반환한다', () => {
        const saved = { staff: [{ name: '테스트', isOrtho: true }] };
        localStorage.setItem('clinic_staff_config', JSON.stringify(saved));
        const config = loadStaffConfig();
        expect(config.staff).toEqual(saved.staff);
    });

    it('localStorage 값이 손상된 경우 기본값을 반환한다', () => {
        localStorage.setItem('clinic_staff_config', 'invalid json{{{');
        const config = loadStaffConfig();
        expect(config.staff.length).toBeGreaterThan(0);
    });
});

describe('saveStaffConfig', () => {
    it('설정을 localStorage에 저장한다', () => {
        const config = { staff: [{ name: '홍길동', isOrtho: false }] };
        saveStaffConfig(config);
        const raw = localStorage.getItem('clinic_staff_config');
        expect(JSON.parse(raw!)).toEqual(config);
    });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd frontend && npm test -- staffConfig
```

Expected: FAIL (staffConfig 모듈 없음)

- [ ] **Step 3: staffConfig.ts 구현**

`frontend/src/lib/staffConfig.ts` 생성:

```ts
import type { StaffConfig, StaffMember } from '../types';

const STORAGE_KEY = 'clinic_staff_config';

const DEFAULT_STAFF: StaffMember[] = [
    { name: '노이은',  isOrtho: false },
    { name: '강성민',  isOrtho: false },
    { name: '박민주',  isOrtho: false },
    { name: '김혜수',  isOrtho: true  },
    { name: '김윤정',  isOrtho: true  },
    { name: '하지수',  isOrtho: true  },
    { name: '최미연',  isOrtho: true  },
    { name: '차언경',  isOrtho: true  },
    { name: '강예진',  isOrtho: true  },
    { name: '김은경',  isOrtho: true  },
    { name: '전수현',  isOrtho: false },
    { name: '임서이',  isOrtho: false },
];

export function loadStaffConfig(): StaffConfig {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { staff: DEFAULT_STAFF };
    try {
        return JSON.parse(raw) as StaffConfig;
    } catch {
        return { staff: DEFAULT_STAFF };
    }
}

export function saveStaffConfig(config: StaffConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd frontend && npm test -- staffConfig
```

Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/staffConfig.ts frontend/src/lib/__tests__/staffConfig.test.ts
git commit -m "feat(lib): 직원 설정 localStorage 읽기/쓰기 구현"
```

---

### Task 3: StaffConfigModal 컴포넌트

**Files:**
- Create: `frontend/src/components/StaffConfigModal.tsx`

- [ ] **Step 1: 컴포넌트 생성**

`frontend/src/components/StaffConfigModal.tsx` 생성:

```tsx
import { useState } from 'react';
import type { StaffConfig } from '../types';

interface Props {
    isOpen: boolean;
    config: StaffConfig;
    onChange: (config: StaffConfig) => void;
    onClose: () => void;
}

export function StaffConfigModal({ isOpen, config, onChange, onClose }: Props) {
    const [nameInput, setNameInput] = useState('');

    if (!isOpen) return null;

    function handleOrthoToggle(index: number) {
        onChange({
            staff: config.staff.map((s, i) =>
                i === index ? { ...s, isOrtho: !s.isOrtho } : s
            ),
        });
    }

    function handleRemove(index: number) {
        onChange({ staff: config.staff.filter((_, i) => i !== index) });
    }

    function handleAdd() {
        const name = nameInput.trim();
        if (!name || config.staff.some((s) => s.name === name)) return;
        onChange({ staff: [...config.staff, { name, isOrtho: false }] });
        setNameInput('');
    }

    return (
        <div
            onClick={onClose}
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
                    padding: 20,
                    width: '100%',
                    maxWidth: 400,
                    maxHeight: '80vh',
                    overflowY: 'auto',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 16,
                    }}
                >
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>
                        직원 설정
                    </span>
                    <button
                        onClick={onClose}
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

                <div
                    style={{
                        fontSize: 11,
                        color: 'var(--color-text-sub)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: 8,
                    }}
                >
                    진료실 스텝
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                    {config.staff.map((member, i) => (
                        <div
                            key={member.name}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: 'var(--color-bg)',
                                borderRadius: 8,
                            }}
                        >
                            <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
                                {member.name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <label
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: 12,
                                        color: 'var(--color-text-sub)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={member.isOrtho}
                                        onChange={() => handleOrthoToggle(i)}
                                        style={{ accentColor: 'var(--color-accent-from)', cursor: 'pointer' }}
                                    />
                                    교정과
                                </label>
                                <button
                                    onClick={() => handleRemove(i)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-text-sub)',
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                    <input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder="이름 입력"
                        style={{
                            flex: 1,
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border-hover)',
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: 13,
                            color: 'var(--color-text)',
                        }}
                    />
                    <button
                        onClick={handleAdd}
                        style={{
                            background: 'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 14px',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'white',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        + 추가
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/components/StaffConfigModal.tsx
git commit -m "feat(components): 직원 설정 모달 컴포넌트 추가"
```

---

### Task 4: App.tsx 연결

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: import 추가**

`frontend/src/App.tsx` 상단 import에 추가:

```ts
import type { ScheduleMonth, InputMethod, GeneratedSchedule, StaffConfig } from './types';
import { loadStaffConfig, saveStaffConfig } from './lib/staffConfig';
import { StaffConfigModal } from './components/StaffConfigModal';
```

- [ ] **Step 2: state 추가**

`App()` 함수 내 기존 state 선언 아래에 추가:

```ts
const [staffConfig, setStaffConfig] = useState<StaffConfig>(loadStaffConfig);
const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
```

- [ ] **Step 3: 핸들러 추가**

`handleGenerate` 함수 아래에 추가:

```ts
function handleStaffChange(config: StaffConfig) {
    setStaffConfig(config);
    saveStaffConfig(config);
}
```

- [ ] **Step 4: 헤더에 버튼 추가**

헤더 `<div style={{ textAlign: 'center', marginBottom: 32 }}>` 를 아래와 같이 교체:

```tsx
<div style={{ position: 'relative', textAlign: 'center', marginBottom: 32 }}>
    <button
        onClick={() => setIsStaffModalOpen(true)}
        style={{
            position: 'absolute',
            right: 0,
            top: 0,
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
    {/* 기존 뱃지, h1, p 그대로 유지 */}
```

- [ ] **Step 5: 모달 렌더링 추가**

`</div>` (앱 루트 닫는 태그) 바로 앞에 추가:

```tsx
<StaffConfigModal
    isOpen={isStaffModalOpen}
    config={staffConfig}
    onChange={handleStaffChange}
    onClose={() => setIsStaffModalOpen(false)}
/>
```

- [ ] **Step 6: 전체 테스트 실행**

```bash
cd frontend && npm test
```

Expected: 기존 테스트 전부 PASS

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/App.tsx
git commit -m "feat(app): 직원 설정 모달 연결 및 헤더 버튼 추가"
```

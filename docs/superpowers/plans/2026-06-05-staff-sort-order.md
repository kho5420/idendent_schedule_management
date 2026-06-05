# Staff Sort Order — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 직원 목록에 `sort_order` 기반 정렬과 drag & drop 재정렬을 추가하고 변경사항을 DB에 저장한다.

**Architecture:** @dnd-kit/core + @dnd-kit/sortable로 D&D 구현. 필터 = 'all'이고 다중 선택 없을 때만 핸들 노출. 드롭 후 낙관적 업데이트 → Promise.all 병렬 DB 저장 → 실패 시 서버 재조회.

**Tech Stack:** React 19, TypeScript strict, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, Supabase JS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/types.ts` | Modify | `StaffRow`에 `sort_order` 추가, `StaffUpdateData`에 포함 |
| `frontend/src/lib/staffApi.ts` | Modify | fetch 정렬 변경, createStaff 수정, updateSortOrders 추가 |
| `frontend/src/lib/__tests__/staffApi.test.ts` | Modify | createStaff 테스트 갱신, updateSortOrders 테스트 추가 |
| `frontend/src/components/StaffEditModal.tsx` | Modify | FormData 타입에서 sort_order 제외 |
| `frontend/src/components/StaffSettingsPage.tsx` | Modify | dnd-kit 통합, SortableStaffRow 컴포넌트, 드롭 핸들러 |

---

### Task 1: @dnd-kit 패키지 설치

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: 패키지 설치**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management/frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: `added N packages` 메시지, 에러 없음

- [ ] **Step 2: 설치 확인**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management/frontend
node -e "require('@dnd-kit/core'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: @dnd-kit/core, sortable, utilities 설치

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: types.ts — sort_order 추가

**Files:**
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: StaffRow에 sort_order 추가**

`frontend/src/types.ts`의 `StaffRow` 타입을 아래와 같이 수정한다:

```ts
export type StaffRow = {
    id: number;
    name: string;
    use_yn: 'Y' | 'N';
    employee_type_id: number | null;
    career: CareerLevel | null;
    team_no: number | null;
    is_ortho: boolean;
    is_team_leader: boolean;
    is_night_fixed: boolean;
    is_weekday_fixed: boolean;
    is_on_leave: boolean;
    is_head_dentist_pick: boolean;
    notes: string | null;
    sort_order: number;
};
```

- [ ] **Step 2: StaffUpdateData에 sort_order 추가**

`StaffUpdateData`의 Pick 목록에 `'sort_order'` 추가:

```ts
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
        | 'sort_order'
    >
>;
```

- [ ] **Step 3: 타입 체크**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: `StaffEditModal.tsx`에서 `sort_order` 관련 타입 에러 발생 (다음 Task에서 해결)

- [ ] **Step 4: Commit**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management
git add frontend/src/types.ts
git commit -m "feat(types): StaffRow에 sort_order 컬럼 추가

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: StaffEditModal — FormData에서 sort_order 제외

**Files:**
- Modify: `frontend/src/components/StaffEditModal.tsx:14`

sort_order는 시스템이 자동 관리하므로 편집 폼에서 제외한다.

- [ ] **Step 1: FormData 타입 수정**

`StaffEditModal.tsx` 14번째 줄의 `FormData` 타입을 수정:

```ts
type FormData = Omit<StaffRow, 'id' | 'sort_order'>;
```

- [ ] **Step 2: 타입 체크**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management
git add frontend/src/components/StaffEditModal.tsx
git commit -m "fix(StaffEditModal): FormData에서 sort_order 제외

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: staffApi 테스트 갱신 (failing 먼저)

**Files:**
- Modify: `frontend/src/lib/__tests__/staffApi.test.ts`

- [ ] **Step 1: createStaff 테스트를 새 동작에 맞게 교체**

기존 `describe('createStaff', ...)` 블록 전체를 아래로 교체:

```ts
describe('createStaff', () => {
    it('기존 직원이 있으면 MAX(sort_order)+1을 자동 할당하여 insert한다', async () => {
        // 첫 번째 from() 호출: sort_order 최댓값 조회
        mockFrom.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue({ data: [{ sort_order: 5 }], error: null }),
                    }),
                }),
            }),
        });
        // 두 번째 from() 호출: insert
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        mockFrom.mockReturnValueOnce({ insert: mockInsert });

        const data = {
            name: '신규',
            use_yn: 'Y' as const,
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
        await createStaff(data);
        expect(mockInsert).toHaveBeenCalledWith({ ...data, sort_order: 6 });
    });

    it('기존 직원이 없으면 sort_order=1로 insert한다', async () => {
        mockFrom.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                }),
            }),
        });
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        mockFrom.mockReturnValueOnce({ insert: mockInsert });

        const data = {
            name: '신규',
            use_yn: 'Y' as const,
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
        await createStaff(data);
        expect(mockInsert).toHaveBeenCalledWith({ ...data, sort_order: 1 });
    });
});
```

- [ ] **Step 2: updateSortOrders 테스트 추가**

파일 끝 `bulkUpdateStaff` describe 블록 다음에 추가:

```ts
import {
    fetchStaff,
    fetchEmployeeTypes,
    updateStaff,
    createStaff,
    deleteStaff,
    bulkUpdateStaff,
    updateSortOrders,
} from '../staffApi';
```

(파일 상단 import 목록에 `updateSortOrders` 추가)

파일 끝에 추가:

```ts
describe('updateSortOrders', () => {
    it('각 항목의 sort_order를 개별 update한다', async () => {
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ update: mockUpdate });

        await updateSortOrders([
            { id: 1, sort_order: 1 },
            { id: 2, sort_order: 2 },
        ]);

        expect(mockFrom).toHaveBeenCalledTimes(2);
        expect(mockUpdate).toHaveBeenCalledWith({ sort_order: 1 });
        expect(mockUpdate).toHaveBeenCalledWith({ sort_order: 2 });
        expect(mockEq).toHaveBeenCalledWith('id', 1);
        expect(mockEq).toHaveBeenCalledWith('id', 2);
    });

    it('빈 배열이면 아무것도 하지 않는다', async () => {
        await updateSortOrders([]);
        expect(mockFrom).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management/frontend
npm test -- --reporter=verbose src/lib/__tests__/staffApi.test.ts 2>&1 | tail -30
```

Expected: `updateSortOrders` 관련 테스트 FAIL (함수 미구현), `createStaff` 테스트 FAIL

- [ ] **Step 4: Commit**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management
git add frontend/src/lib/__tests__/staffApi.test.ts
git commit -m "test(staffApi): createStaff, updateSortOrders 테스트 추가

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: staffApi.ts 구현

**Files:**
- Modify: `frontend/src/lib/staffApi.ts`

- [ ] **Step 1: fetchStaff 정렬 기준 변경**

`fetchStaff` 함수에서 `.order('id')` → `.order('sort_order')`:

```ts
export async function fetchStaff(): Promise<StaffRow[]> {
    const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('use_yn', 'Y')
        .order('sort_order');
    if (error) throw error;
    return data as StaffRow[];
}
```

- [ ] **Step 2: createStaff — sort_order 자동 계산 추가**

`createStaff` 함수 전체를 아래로 교체:

```ts
export async function createStaff(data: Omit<StaffRow, 'id' | 'sort_order'>): Promise<void> {
    const { data: maxData } = await supabase
        .from('staff')
        .select('sort_order')
        .eq('use_yn', 'Y')
        .order('sort_order', { ascending: false })
        .limit(1);
    const nextSortOrder = maxData && maxData.length > 0 ? (maxData[0] as { sort_order: number }).sort_order + 1 : 1;
    const { error } = await supabase.from('staff').insert({ ...data, sort_order: nextSortOrder });
    if (error) throw error;
}
```

- [ ] **Step 3: updateSortOrders 추가**

파일 끝에 추가:

```ts
export async function updateSortOrders(updates: { id: number; sort_order: number }[]): Promise<void> {
    await Promise.all(
        updates.map(({ id, sort_order }) =>
            supabase.from('staff').update({ sort_order }).eq('id', id)
        )
    );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management/frontend
npm test -- --reporter=verbose src/lib/__tests__/staffApi.test.ts 2>&1 | tail -30
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 타입 체크**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management/frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 6: Commit**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management
git add frontend/src/lib/staffApi.ts
git commit -m "feat(staffApi): sort_order 기반 정렬, createStaff 자동 순번, updateSortOrders 추가

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: StaffSettingsPage — D&D 통합

**Files:**
- Modify: `frontend/src/components/StaffSettingsPage.tsx`

이 Task는 전체 파일을 교체한다. 기존 파일의 내용을 아래로 완전히 대체:

- [ ] **Step 1: SortableStaffRow 컴포넌트 + DnD 통합 코드 작성**

`frontend/src/components/StaffSettingsPage.tsx` 전체를 아래 내용으로 교체:

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DndContext,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    closestCenter,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { StaffRow, EmployeeType } from '../types';
import { fetchStaff, fetchEmployeeTypes, updateSortOrders } from '../lib/staffApi';
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

const LIST_GRID = '20px 28px 1fr 50px 28px 1fr 16px';

const BADGES = [
    { key: 'is_team_leader' as const, label: '팀장', bg: '#fef3c7', color: '#d97706' },
    { key: 'is_ortho' as const, label: '교정', bg: '#ede9fe', color: '#7c3aed' },
    { key: 'is_night_fixed' as const, label: '야간', bg: '#fff7ed', color: '#ea580c' },
    { key: 'is_weekday_fixed' as const, label: '평일', bg: '#f0fdf4', color: '#16a34a' },
    { key: 'is_head_dentist_pick' as const, label: '윤팀', bg: '#f0f0ff', color: '#6366f1' },
    { key: 'is_on_leave' as const, label: '휴직', bg: '#fee2e2', color: '#dc2626' },
];

type SortableRowProps = {
    s: StaffRow;
    dragEnabled: boolean;
    selected: boolean;
    getTypeName: (id: number | null) => string;
    onEdit: (s: StaffRow) => void;
    onToggleSelect: (id: number) => void;
};

function SortableStaffRow({
    s,
    dragEnabled,
    selected,
    getTypeName,
    onEdit,
    onToggleSelect,
}: SortableRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: s.id,
        disabled: !dragEnabled,
    });

    const style: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: LIST_GRID,
        gap: 6,
        alignItems: 'center',
        padding: '8px',
        borderRadius: 10,
        background: selected ? '#eef2ff' : 'var(--color-card)',
        border: `1px solid ${selected ? '#c7d2fe' : 'var(--color-border)'}`,
        opacity: isDragging ? 0.4 : s.is_on_leave ? 0.6 : 1,
        cursor: 'pointer',
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
        position: 'relative',
    };

    return (
        <div ref={setNodeRef} style={style} onClick={() => onEdit(s)}>
            <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect(s.id)}
                onClick={(e) => e.stopPropagation()}
                style={{ accentColor: '#6366f1', cursor: 'pointer' }}
            />
            <div
                style={{
                    width: 24,
                    height: 24,
                    background: avatarGradient(s.name),
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                }}
            >
                {s.name[0]}
            </div>
            <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                    {s.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-sub)' }}>
                    {getTypeName(s.employee_type_id)}
                </div>
            </div>
            <div
                style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#6366f1' }}
            >
                {s.career ?? '—'}
            </div>
            <div
                style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-sub)' }}
            >
                {s.team_no ?? '—'}
            </div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {BADGES.filter((b) => s[b.key]).map((b) => (
                    <span
                        key={b.key}
                        style={{
                            fontSize: 9,
                            background: b.bg,
                            color: b.color,
                            borderRadius: 4,
                            padding: '1px 4px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {b.label}
                    </span>
                ))}
            </div>
            {/* 마지막 컬럼: D&D 핸들 또는 › */}
            {dragEnabled ? (
                <div
                    {...attributes}
                    {...listeners}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        fontSize: 16,
                        color: 'var(--color-text-sub)',
                        textAlign: 'right',
                        cursor: 'grab',
                        userSelect: 'none',
                        lineHeight: 1,
                    }}
                >
                    ≡
                </div>
            ) : (
                <div
                    style={{ fontSize: 14, color: 'var(--color-text-sub)', textAlign: 'right' }}
                >
                    ›
                </div>
            )}
        </div>
    );
}

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

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

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

    useEffect(() => {
        void (async () => {
            await load();
        })();
    }, []);

    const filtered = staff.filter((s) => {
        if (filter === 'leave') return s.is_on_leave;
        if (typeof filter === 'number') return s.employee_type_id === filter;
        return true;
    });

    const dragEnabled = filter === 'all' && selectedIds.size === 0;

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = staff.findIndex((s) => s.id === active.id);
        const newIndex = staff.findIndex((s) => s.id === over.id);
        const reordered = arrayMove(staff, oldIndex, newIndex);
        setStaff(reordered);

        const updates = reordered.map((s, i) => ({ id: s.id, sort_order: i + 1 }));
        updateSortOrders(updates).catch(() => void load());
    }

    function toggleSelect(id: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleAll() {
        setSelectedIds(
            selectedIds.size === filtered.length ? new Set() : new Set(filtered.map((s) => s.id))
        );
    }

    function openEdit(s: StaffRow) {
        setEditingStaff(s);
        setIsEditOpen(true);
    }

    function getTypeName(id: number | null) {
        return employeeTypes.find((t) => t.id === id)?.name ?? '';
    }

    const typeIds = [
        ...new Set(staff.map((s) => s.employee_type_id).filter((id): id is number => id !== null)),
    ];
    const selectedList = staff.filter((s) => selectedIds.has(s.id));

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

    if (error) {
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
            {/* 헤더 */}
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
                    <h1
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: 'var(--color-text)',
                            margin: 0,
                        }}
                    >
                        직원 설정
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
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
                    <button
                        onClick={() => setIsNewOpen(true)}
                        style={{
                            background:
                                'linear-gradient(135deg, var(--color-accent-from), var(--color-accent-to))',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'white',
                            cursor: 'pointer',
                        }}
                    >
                        + 직원 추가
                    </button>
                </div>
            </div>

            {/* 일괄 편집 툴바 */}
            {selectedIds.size >= 2 && (
                <div
                    style={{
                        background: '#eef2ff',
                        border: '1px solid #c7d2fe',
                        borderRadius: 10,
                        padding: '8px 14px',
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>
                        {selectedIds.size}명 선택됨
                    </span>
                    <button
                        onClick={() => setIsBulkOpen(true)}
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'white',
                            background: '#6366f1',
                            border: 'none',
                            borderRadius: 6,
                            padding: '4px 12px',
                            cursor: 'pointer',
                        }}
                    >
                        일괄 편집
                    </button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        style={{
                            fontSize: 12,
                            color: 'var(--color-text-sub)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            marginLeft: 'auto',
                        }}
                    >
                        ✕ 선택 해제
                    </button>
                </div>
            )}

            {/* 필터 칩 */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {[
                    { label: `전체 ${staff.length}`, value: 'all' as Filter },
                    ...typeIds.map((id) => ({ label: getTypeName(id), value: id as Filter })),
                    { label: '휴직', value: 'leave' as Filter },
                ].map((chip) => (
                    <button
                        key={String(chip.value)}
                        onClick={() => setFilter(chip.value)}
                        style={{
                            fontSize: 11,
                            borderRadius: 20,
                            padding: '3px 10px',
                            cursor: 'pointer',
                            background:
                                filter === chip.value
                                    ? 'var(--color-accent-to)'
                                    : 'var(--color-card)',
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
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: LIST_GRID,
                    gap: 6,
                    alignItems: 'center',
                    padding: '0 8px',
                    marginBottom: 4,
                }}
            >
                <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleAll}
                    style={{ accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <div />
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--color-text-sub)',
                        letterSpacing: 0.5,
                    }}
                >
                    이름 / 직책
                </div>
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--color-text-sub)',
                        textAlign: 'center',
                    }}
                >
                    경력
                </div>
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--color-text-sub)',
                        textAlign: 'center',
                    }}
                >
                    팀
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-sub)' }}>
                    속성
                </div>
                <div
                    style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: dragEnabled ? 'var(--color-accent-to)' : 'transparent',
                        textAlign: 'right',
                    }}
                >
                    순서
                </div>
            </div>

            {/* 직원 목록 */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={staff.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {filtered.map((s) => (
                            <SortableStaffRow
                                key={s.id}
                                s={s}
                                dragEnabled={dragEnabled}
                                selected={selectedIds.has(s.id)}
                                getTypeName={getTypeName}
                                onEdit={openEdit}
                                onToggleSelect={toggleSelect}
                            />
                        ))}
                        {filtered.length === 0 && (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: 40,
                                    color: 'var(--color-text-sub)',
                                    fontSize: 13,
                                }}
                            >
                                표시할 직원이 없습니다
                            </div>
                        )}
                    </div>
                </SortableContext>
            </DndContext>

            {isEditOpen && editingStaff && (
                <StaffEditModal
                    staff={editingStaff}
                    employeeTypes={employeeTypes}
                    onSave={() => {
                        setIsEditOpen(false);
                        load();
                    }}
                    onClose={() => setIsEditOpen(false)}
                />
            )}

            {isNewOpen && (
                <StaffEditModal
                    staff={null}
                    employeeTypes={employeeTypes}
                    onSave={() => {
                        setIsNewOpen(false);
                        load();
                    }}
                    onClose={() => setIsNewOpen(false)}
                />
            )}

            {isBulkOpen && (
                <StaffBulkEditModal
                    selectedStaff={selectedList}
                    onSave={() => {
                        setIsBulkOpen(false);
                        setSelectedIds(new Set());
                        load();
                    }}
                    onClose={() => setIsBulkOpen(false)}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management/frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

- [ ] **Step 3: 전체 테스트 통과 확인**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management/frontend
npm test 2>&1 | tail -20
```

Expected: 모든 테스트 PASS

- [ ] **Step 4: Commit**

```bash
cd /mnt/c/Users/kho54/OneDrive/바탕\ 화면/Dev/workspace/idendent_schedule_management
git add frontend/src/components/StaffSettingsPage.tsx
git commit -m "feat(StaffSettingsPage): drag & drop 순서 변경 기능 추가

- 전체 필터 + 미선택 상태에서만 D&D 핸들(≡) 노출
- 드롭 후 낙관적 업데이트, 백그라운드 DB 저장
- 실패 시 서버 데이터 재조회

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

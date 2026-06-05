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
            <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#6366f1' }}>
                {s.career ?? '—'}
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-sub)' }}>
                {s.team_no ? `${s.team_no}팀` : '—'}
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
                <div style={{ fontSize: 14, color: 'var(--color-text-sub)', textAlign: 'right' }}>
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

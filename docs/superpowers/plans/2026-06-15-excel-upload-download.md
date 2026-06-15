# 엑셀 파일 업로드/다운로드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구글 시트와 동일한 흐름을 로컬 엑셀(.xlsx) 파일 업로드/다운로드로도 제공한다.

**Architecture:** 구글 흐름과 파서(`parseDoctorSchedule`/`parseLeaveRequests`)·배정 로직·그리드 생성(`buildScheduleGrid`)을 공유하고, 엑셀 전용으로 "파일↔행 배열 변환 + 시트 추가/다운로드" I/O 계층만 추가한다. 워크북 무관 순수 함수(`buildScheduleGrid`/`pickTabName`)는 `scheduleGrid.ts`로 분리해 구글·엑셀이 공용한다.

**Tech Stack:** React 19 + TypeScript, Vite, `xlsx`(SheetJS), Vitest

**참고:** 모든 명령은 `frontend/`에서 실행. 타입 체크는 `npx tsc -b`(`--noEmit` 금지). 테스트는 `npx vitest run`. 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` 추가.

---

## File Structure

- **신규** `src/lib/scheduleGrid.ts` — `buildScheduleGrid`, `pickTabName` (sheetWriter에서 이동, 구글·엑셀 공용)
- **신규** `src/lib/__tests__/scheduleGrid.test.ts` — 위 두 함수 테스트 (sheetWriter.test에서 이동)
- **신규** `src/lib/excelWorkbook.ts` — 엑셀 읽기/시트추가/다운로드 I/O
- **신규** `src/lib/__tests__/excelWorkbook.test.ts`
- **신규** `src/components/ExcelFileField.tsx` — 파일+탭이름+확인 (SheetConnectionField의 엑셀판)
- **신규** `src/components/ExcelFilePicker.tsx` — 스케줄/휴무 두 필드 묶음
- **수정** `src/lib/sheetWriter.ts` — `buildScheduleGrid`/`pickTabName`/`dateDoctorCell`/`DAY_NAME_ROW` 제거, `scheduleGrid`에서 import
- **수정** `src/lib/__tests__/sheetWriter.test.ts` — 이동한 두 describe 제거 + import 정리
- **수정** `src/types.ts` — `ExcelConnection` 추가
- **수정** `src/components/InputMethodCard.tsx` — 엑셀 카드를 `ExcelFilePicker`로 교체
- **수정** `src/App.tsx` — excel 분기(생성/다운로드), 상태, `isReady`

---

## Task 1: scheduleGrid.ts 분리 (리팩터)

**Files:**
- Create: `src/lib/scheduleGrid.ts`
- Create: `src/lib/__tests__/scheduleGrid.test.ts`
- Modify: `src/lib/sheetWriter.ts`
- Modify: `src/lib/__tests__/sheetWriter.test.ts`

- [ ] **Step 1: `scheduleGrid.ts` 생성 (sheetWriter에서 순수 함수 이동)**

Create `src/lib/scheduleGrid.ts`:

```ts
import type { DayAssignment, ScheduleMonth } from '../types';
import { formatDayCell } from './scheduleFormatter';
import { groupAssignmentsByWeek } from './weekGrouping';

const DAY_NAME_ROW = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

function dateDoctorCell(a: DayAssignment): string {
    const dayNum = parseInt(a.date.slice(-2), 10);
    if (a.isFullAttendance) return `${dayNum} 원장님 전체출근`;
    if (a.doctorAliases.length > 0) return `${dayNum} ${a.doctorAliases.join(',')}`;
    return `${dayNum}`;
}

/**
 * dayAssignments를 기존 스케줄 시트 양식(헤더 4행 + 주별 5행 블록)의 2차원 셀 배열로 변환.
 * A열은 빈 여백으로 두고 요일·날짜·진료실은 B~H열에 배치한다.
 */
export function buildScheduleGrid(assignments: DayAssignment[], month: ScheduleMonth): string[][] {
    const yy = String(month.year).slice(-2);
    const lastDay = new Date(month.year, month.month, 0).getDate();
    const grid: string[][] = [
        ['', `${month.month}月`],
        ['', `${yy}.${month.month}.1`],
        ['', ` ~ ${yy}.${month.month}.${lastDay}`],
        ['', ...DAY_NAME_ROW],
    ];

    for (const week of groupAssignmentsByWeek(assignments)) {
        grid.push(['', ...week.map((a) => (a ? dateDoctorCell(a) : ''))]);
        grid.push([], [], []);
        grid.push(['', ...week.map((a) => (a ? formatDayCell(a) : ''))]);
    }
    return grid;
}

/** 기존 제목과 겹치지 않는 탭 이름 결정 (충돌 시 base2, base3 …) — 순수함수 */
export function pickTabName(existingTitles: string[], baseName: string): string {
    const set = new Set(existingTitles);
    if (!set.has(baseName)) return baseName;
    for (let i = 2; ; i++) {
        const name = `${baseName}${i}`;
        if (!set.has(name)) return name;
    }
}
```

- [ ] **Step 2: `sheetWriter.ts`에서 이동한 코드 제거 + import 추가**

In `src/lib/sheetWriter.ts`:
- 맨 위 import 두 줄 제거: `import { formatDayCell } from './scheduleFormatter';` 와 `import { groupAssignmentsByWeek } from './weekGrouping';`
- 대신 추가: `import { buildScheduleGrid, pickTabName } from './scheduleGrid';`
- `const DAY_NAME_ROW = [...]`, `function dateDoctorCell(...)`, `export function buildScheduleGrid(...)`, `export function pickTabName(...)` **전부 삭제** (scheduleGrid.ts로 이동됨).

수정 후 `sheetWriter.ts`의 import 영역은 다음과 같아야 한다:

```ts
import type { DayAssignment, ScheduleMonth } from '../types';
import { buildScheduleGrid, pickTabName } from './scheduleGrid';
```

(나머지 `API`, `TEMPLATE_TAB`, `fetchSheets`, `duplicateSheet`, `setWrap`, `clearRange`, `writeGrid`, `writeScheduleToNewTab`는 그대로 유지.)

- [ ] **Step 3: `scheduleGrid.test.ts` 생성 (sheetWriter.test에서 이동)**

Create `src/lib/__tests__/scheduleGrid.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildScheduleGrid, pickTabName } from '../scheduleGrid';
import type { DayAssignment, ScheduleMonth } from '../../types';

function mkDay(over: Partial<DayAssignment> & { date: string; dayOfWeek: number }): DayAssignment {
    return {
        doctorAliases: [],
        isFullAttendance: false,
        working: [],
        fullDayOff: [],
        halfDayOff: [],
        isOrthoDay: false,
        orthoStaffCount: 0,
        nightFixedStaff: [],
        hasTeamLeader: false,
        hasNightShift: false,
        dayShiftStaff: [],
        nightShiftStaff: [],
        ...over,
    };
}
const month: ScheduleMonth = { year: 2026, month: 7 };

describe('buildScheduleGrid', () => {
    it('헤더 4행을 기존 양식대로 만든다 (A열 여백, 요일은 B~H)', () => {
        const grid = buildScheduleGrid([], month);
        expect(grid[0]).toEqual(['', '7月']);
        expect(grid[1]).toEqual(['', '26.7.1']);
        expect(grid[2]).toEqual(['', ' ~ 26.7.31']);
        expect(grid[3]).toEqual([
            '',
            '월요일',
            '화요일',
            '수요일',
            '목요일',
            '금요일',
            '토요일',
            '일요일',
        ]);
    });

    it('전체출근일은 날짜+원장 행에 "일 원장님 전체출근", 진료실 행은 formatDayCell', () => {
        const wed = mkDay({
            date: '2026-07-01',
            dayOfWeek: 3,
            isFullAttendance: true,
            working: ['성민', '이은'],
        });
        const grid = buildScheduleGrid([wed], month);
        expect(grid[4][0]).toBe('');
        expect(grid[4][3]).toBe('1 원장님 전체출근');
        expect(grid[5]).toEqual([]);
        expect(grid[6]).toEqual([]);
        expect(grid[7]).toEqual([]);
        expect(grid[8][3]).toContain('성민,이은');
    });

    it('원장 코드가 있으면 "일 코드,코드" 형식으로 표기한다', () => {
        const thu = mkDay({ date: '2026-07-02', dayOfWeek: 4, doctorAliases: ['오', '신'] });
        const grid = buildScheduleGrid([thu], month);
        expect(grid[4][4]).toBe('2 오,신');
    });
});

describe('pickTabName', () => {
    it('충돌이 없으면 baseName 그대로 반환', () => {
        expect(pickTabName(['26.06', '기본틀'], '26.07_생성')).toBe('26.07_생성');
    });

    it('충돌하면 다음 번호를 붙인다', () => {
        expect(pickTabName(['26.07_생성', '26.07_생성2'], '26.07_생성')).toBe('26.07_생성3');
    });
});
```

- [ ] **Step 4: `sheetWriter.test.ts`에서 이동한 describe 제거 + import 정리**

In `src/lib/__tests__/sheetWriter.test.ts`:
- import 문에서 `buildScheduleGrid,` 와 `pickTabName,` 두 줄 제거 (남는 import: `duplicateSheet, clearRange, writeGrid, setWrap`).
- `describe('buildScheduleGrid', () => { ... });` 블록 전체 삭제 (현재 31~70행).
- `describe('pickTabName', () => { ... });` 블록 전체 삭제 (현재 76~84행).
- `mkDay` 헬퍼와 `const month`는 이 파일의 다른 테스트에서 쓰지 않으므로 함께 삭제 (12~29행).
- `beforeEach(() => { vi.restoreAllMocks(); });` (72~74행)와 나머지 describe(`duplicateSheet`/`setWrap`/`clearRange`/`writeGrid`)는 유지.

수정 후 `sheetWriter.test.ts` 상단은:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { duplicateSheet, clearRange, writeGrid, setWrap } from '../sheetWriter';

beforeEach(() => {
    vi.restoreAllMocks();
});
```

- [ ] **Step 5: 테스트·타입 체크 통과 확인**

Run: `npx vitest run src/lib/__tests__/scheduleGrid.test.ts src/lib/__tests__/sheetWriter.test.ts`
Expected: PASS (scheduleGrid 5개, sheetWriter 5개)

Run: `npx tsc -b`
Expected: 에러 없음 (exit 0)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/scheduleGrid.ts src/lib/__tests__/scheduleGrid.test.ts src/lib/sheetWriter.ts src/lib/__tests__/sheetWriter.test.ts
git commit -m "refactor(schedule): 그리드 생성 순수 함수를 scheduleGrid로 분리

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: excelWorkbook.ts (엑셀 I/O)

**Files:**
- Create: `src/lib/excelWorkbook.ts`
- Test: `src/lib/__tests__/excelWorkbook.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/lib/__tests__/excelWorkbook.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { sheetToRows, listSheetNames, appendScheduleSheet } from '../excelWorkbook';
import { parseDoctorSchedule } from '../doctorScheduleParser';
import type { DayAssignment, ScheduleMonth } from '../../types';

const month: ScheduleMonth = { year: 2026, month: 7 };

function wbWithSheet(name: string, aoa: unknown[][]): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
    return wb;
}

function mkDay(over: Partial<DayAssignment> & { date: string; dayOfWeek: number }): DayAssignment {
    return {
        doctorAliases: [],
        isFullAttendance: false,
        working: [],
        fullDayOff: [],
        halfDayOff: [],
        isOrthoDay: false,
        orthoStaffCount: 0,
        nightFixedStaff: [],
        hasTeamLeader: false,
        hasNightShift: false,
        dayShiftStaff: [],
        nightShiftStaff: [],
        ...over,
    };
}

describe('listSheetNames', () => {
    it('워크북의 탭 이름 목록을 반환한다', () => {
        const wb = wbWithSheet('26.07', [['a']]);
        expect(listSheetNames(wb)).toEqual(['26.07']);
    });
});

describe('sheetToRows', () => {
    it('지정 탭을 행 배열로 변환한다', () => {
        const wb = wbWithSheet('26.07', [
            ['', '1 Y', '2 오'],
            ['', '성민', '이은'],
        ]);
        const rows = sheetToRows(wb, '26.07');
        expect(rows[0]).toEqual(['', '1 Y', '2 오']);
        expect(rows[1]).toEqual(['', '성민', '이은']);
    });

    it('탭이 없으면 에러를 던진다', () => {
        const wb = wbWithSheet('26.07', [['a']]);
        expect(() => sheetToRows(wb, '없는탭')).toThrow('없는탭');
    });

    it('읽은 행을 parseDoctorSchedule에 넣으면 정상 파싱된다 (왕복)', () => {
        const wb = wbWithSheet('26.07', [
            ['', '1 Y', '2 오', '3 원장님 전체출근', '4 오', '5 Y', '6 오', '7 Y'],
        ]);
        const rows = sheetToRows(wb, '26.07');
        const parsed = parseDoctorSchedule(rows, month);
        expect(parsed).toHaveLength(7);
        expect(parsed[0]).toMatchObject({ date: '2026-07-01', doctorAliases: ['Y'] });
        expect(parsed[2]).toMatchObject({ date: '2026-07-03', isFullAttendance: true });
    });
});

describe('appendScheduleSheet', () => {
    it('생성 시트를 추가하고 그리드 내용을 기록한다', () => {
        const wb = wbWithSheet('26.07', [['원본']]);
        const wed = mkDay({ date: '2026-07-01', dayOfWeek: 3, isFullAttendance: true });
        const name = appendScheduleSheet(wb, [wed], month);
        expect(name).toBe('26.07_생성');
        expect(listSheetNames(wb)).toContain('26.07_생성');
        const rows = sheetToRows(wb, '26.07_생성');
        expect(rows[0].slice(0, 2)).toEqual(['', '7月']); // sheet_to_json이 최대 열폭으로 패딩하므로 앞 2칸만 비교
        expect(rows[4][3]).toBe('1 원장님 전체출근');
    });

    it('생성 시트명이 이미 있으면 번호를 붙인다', () => {
        const wb = wbWithSheet('26.07_생성', [['a']]);
        const name = appendScheduleSheet(wb, [], month);
        expect(name).toBe('26.07_생성2');
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/__tests__/excelWorkbook.test.ts`
Expected: FAIL — `excelWorkbook` 모듈/함수 없음

- [ ] **Step 3: `excelWorkbook.ts` 구현**

Create `src/lib/excelWorkbook.ts`:

```ts
import * as XLSX from 'xlsx';
import type { DayAssignment, ScheduleMonth } from '../types';
import { buildScheduleGrid, pickTabName } from './scheduleGrid';

/** 업로드한 .xlsx File을 워크북으로 읽는다. */
export async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
    const buffer = await file.arrayBuffer();
    return XLSX.read(new Uint8Array(buffer), { type: 'array' });
}

/** 워크북의 탭(시트) 이름 목록. */
export function listSheetNames(wb: XLSX.WorkBook): string[] {
    return wb.SheetNames;
}

/** 지정 탭을 행 배열(unknown[][])로 변환. 탭이 없으면 에러. */
export function sheetToRows(wb: XLSX.WorkBook, tabName: string): unknown[][] {
    const ws = wb.Sheets[tabName];
    if (!ws) throw new Error(`'${tabName}' 탭을 파일에서 찾을 수 없습니다`);
    return XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
        blankrows: true,
    }) as unknown[][];
}

/**
 * 생성된 스케줄을 'YY.MM_생성' 시트로 워크북에 추가한다(충돌 시 번호 부여).
 * 추가된 시트 이름을 반환.
 */
export function appendScheduleSheet(
    wb: XLSX.WorkBook,
    assignments: DayAssignment[],
    month: ScheduleMonth
): string {
    const baseName = `${String(month.year).slice(-2)}.${String(month.month).padStart(2, '0')}_생성`;
    const tabName = pickTabName(wb.SheetNames, baseName);
    const ws = XLSX.utils.aoa_to_sheet(buildScheduleGrid(assignments, month));
    XLSX.utils.book_append_sheet(wb, ws, tabName);
    return tabName;
}

/** 워크북을 .xlsx로 직렬화해 브라우저 다운로드를 트리거한다. */
export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string): void {
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer | Uint8Array;
    const ab =
        buf instanceof ArrayBuffer
            ? buf
            : (buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    const blob = new Blob([ab], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/__tests__/excelWorkbook.test.ts`
Expected: PASS (6개)

Run: `npx tsc -b`
Expected: exit 0

- [ ] **Step 5: 커밋**

```bash
git add src/lib/excelWorkbook.ts src/lib/__tests__/excelWorkbook.test.ts
git commit -m "feat(excel): 엑셀 읽기·시트추가·다운로드 I/O 추가

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: ExcelConnection 타입

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: 타입 추가**

In `src/types.ts`, `SheetConnection` 타입 정의 바로 아래에 추가:

```ts
export type ExcelConnection = {
    file: File;
    tabName: string;
} | null;
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc -b`
Expected: exit 0

- [ ] **Step 3: 커밋**

```bash
git add src/types.ts
git commit -m "feat(excel): ExcelConnection 타입 추가

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: ExcelFileField / ExcelFilePicker 컴포넌트

**Files:**
- Create: `src/components/ExcelFileField.tsx`
- Create: `src/components/ExcelFilePicker.tsx`

이 저장소는 컴포넌트 단위 테스트가 없으므로(테스트는 `lib/`만) `tsc -b`·`lint`로 검증한다.

- [ ] **Step 1: `ExcelFileField.tsx` 생성**

기존 `ExcelUploader`(파일 드롭)를 내부에서 재사용하고, 탭이름 입력·확인·상태를 더한다.

Create `src/components/ExcelFileField.tsx`:

```tsx
import { useState } from 'react';
import { ExcelUploader } from './ExcelUploader';
import { readWorkbook, listSheetNames } from '../lib/excelWorkbook';
import type { ExcelConnection } from '../types';

type Status = 'idle' | 'checking' | 'connected' | 'error';

interface Props {
    label: string;
    storageKey: string;
    tabPlaceholder: string;
    onConnectionChange: (connection: ExcelConnection) => void;
}

export function ExcelFileField({ label, storageKey, tabPlaceholder, onConnectionChange }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [tabName, setTabName] = useState(() => localStorage.getItem(storageKey) ?? '');
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState('');

    function handleFile(f: File | null) {
        setFile(f);
        setStatus('idle');
        setMessage('');
        onConnectionChange(null);
    }

    async function runCheck() {
        if (!file) {
            setStatus('error');
            setMessage('먼저 .xlsx 파일을 올려주세요.');
            onConnectionChange(null);
            return;
        }
        const tab = tabName.trim();
        if (!tab) {
            setStatus('error');
            setMessage('탭 이름을 입력해주세요.');
            onConnectionChange(null);
            return;
        }
        setStatus('checking');
        setMessage('');
        try {
            const wb = await readWorkbook(file);
            if (listSheetNames(wb).includes(tab)) {
                setStatus('connected');
                setMessage(`연결됨 — ${tab} 탭`);
                onConnectionChange({ file, tabName: tab });
                localStorage.setItem(storageKey, tab);
            } else {
                setStatus('error');
                setMessage(`'${tab}' 탭을 파일에서 찾을 수 없습니다.`);
                onConnectionChange(null);
            }
        } catch {
            setStatus('error');
            setMessage('파일을 읽지 못했습니다. .xlsx 파일인지 확인해주세요.');
            onConnectionChange(null);
        }
    }

    const inputStyle = {
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border-hover)',
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: 13,
        color: 'var(--color-text)',
        width: '100%',
        boxSizing: 'border-box' as const,
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: 12,
            }}
        >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{label}</div>
            <ExcelUploader file={file} onFileChange={handleFile} />
            <div style={{ display: 'flex', gap: 6 }}>
                <input
                    value={tabName}
                    onChange={(e) => setTabName(e.target.value)}
                    placeholder={tabPlaceholder}
                    style={inputStyle}
                />
                <button
                    onClick={() => void runCheck()}
                    disabled={status === 'checking'}
                    style={{
                        background: 'var(--color-border)',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 13,
                        color: 'var(--color-text)',
                        cursor: status === 'checking' ? 'default' : 'pointer',
                        opacity: status === 'checking' ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                    }}
                >
                    확인
                </button>
            </div>
            <div
                style={{
                    fontSize: 12,
                    color:
                        status === 'connected'
                            ? 'var(--color-success)'
                            : status === 'error'
                              ? '#dc2626'
                              : 'var(--color-text-sub)',
                }}
            >
                {status === 'idle' && '⬜ 아직 연결 안 됨'}
                {status === 'checking' && '⏳ 확인 중...'}
                {status === 'connected' && `✅ ${message}`}
                {status === 'error' && `⚠️ ${message}`}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: `ExcelFilePicker.tsx` 생성**

Create `src/components/ExcelFilePicker.tsx`:

```tsx
import { ExcelFileField } from './ExcelFileField';
import type { ExcelConnection } from '../types';

interface Props {
    onScheduleChange: (connection: ExcelConnection) => void;
    onLeaveChange: (connection: ExcelConnection) => void;
}

export function ExcelFilePicker({ onScheduleChange, onLeaveChange }: Props) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
                style={{
                    fontSize: 11,
                    color: '#92400e',
                    background: '#fefce8',
                    border: '1px solid #fde68a',
                    borderRadius: 6,
                    padding: '6px 8px',
                    lineHeight: 1.5,
                }}
            >
                ⚠️ 다운로드 시 기존 시트의 서식(색·테두리·병합)은 사라질 수 있어요. 글자(값)는
                그대로 유지됩니다.
            </div>
            <ExcelFileField
                label="📅 스케줄 파일"
                storageKey="excel_tab_schedule"
                tabPlaceholder="탭 이름 (예: 26.07)"
                onConnectionChange={onScheduleChange}
            />
            <ExcelFileField
                label="🌴 휴무신청 파일 (선택)"
                storageKey="excel_tab_leave_request"
                tabPlaceholder="탭 이름"
                onConnectionChange={onLeaveChange}
            />
        </div>
    );
}
```

- [ ] **Step 3: 타입 체크·린트**

Run: `npx tsc -b`
Expected: exit 0

Run: `npx eslint src/components/ExcelFileField.tsx src/components/ExcelFilePicker.tsx`
Expected: exit 0

- [ ] **Step 4: 커밋**

```bash
git add src/components/ExcelFileField.tsx src/components/ExcelFilePicker.tsx
git commit -m "feat(excel): 엑셀 파일+탭 입력 컴포넌트 추가

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: InputMethodCard 연결

**Files:**
- Modify: `src/components/InputMethodCard.tsx`

- [ ] **Step 1: InputMethodCard를 ExcelFilePicker로 교체**

`src/components/InputMethodCard.tsx` 전체를 아래로 교체:

```tsx
import type { InputMethod, SheetConnection, ExcelConnection } from '../types';
import { ExcelFilePicker } from './ExcelFilePicker';
import { GoogleSheetPicker } from './GoogleSheetPicker';

interface Props {
    selected: InputMethod | null;
    googleToken: string | null;
    scheduleSheet: SheetConnection;
    leaveRequestSheet: SheetConnection;
    onMethodSelect: (method: InputMethod) => void;
    onExcelScheduleChange: (connection: ExcelConnection) => void;
    onExcelLeaveChange: (connection: ExcelConnection) => void;
    onTokenChange: (token: string | null) => void;
    onScheduleSheetChange: (connection: SheetConnection) => void;
    onLeaveRequestSheetChange: (connection: SheetConnection) => void;
}

interface CardProps {
    isSelected: boolean;
    onClick: () => void;
    icon: string;
    title: string;
    description: string;
    children: React.ReactNode;
}

function Card({ isSelected, onClick, icon, title, description, children }: CardProps) {
    return (
        <div
            onClick={onClick}
            style={{
                flex: 1,
                background: isSelected ? '#dcfce7' : 'var(--color-card)',
                border: `1.5px solid ${isSelected ? 'var(--color-accent-from)' : 'var(--color-border)'}`,
                borderRadius: 12,
                padding: 20,
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
            }}
        >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <h3
                style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    marginBottom: 4,
                }}
            >
                {title}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-sub)', marginBottom: 12 }}>
                {description}
            </p>
            <div onClick={(e) => e.stopPropagation()}>{children}</div>
        </div>
    );
}

export function InputMethodCard({
    selected,
    googleToken,
    scheduleSheet,
    leaveRequestSheet,
    onMethodSelect,
    onExcelScheduleChange,
    onExcelLeaveChange,
    onTokenChange,
    onScheduleSheetChange,
    onLeaveRequestSheetChange,
}: Props) {
    // App.tsx에서 prop-drilling으로만 전달됨 — 현재 값은 사용하지 않고 변경 콜백만 사용
    void scheduleSheet;
    void leaveRequestSheet;
    return (
        <div className="input-method-grid">
            <Card
                isSelected={selected === 'excel'}
                onClick={() => onMethodSelect('excel')}
                icon="📁"
                title="엑셀 파일 업로드"
                description="로컬 .xlsx 파일을 직접 업로드합니다"
            >
                <ExcelFilePicker
                    onScheduleChange={onExcelScheduleChange}
                    onLeaveChange={onExcelLeaveChange}
                />
            </Card>
            <Card
                isSelected={selected === 'google'}
                onClick={() => onMethodSelect('google')}
                icon="📊"
                title="구글 스프레드시트"
                description="Google 계정으로 로그인하여 시트를 불러옵니다"
            >
                <GoogleSheetPicker
                    token={googleToken}
                    onTokenChange={onTokenChange}
                    onScheduleSheetChange={onScheduleSheetChange}
                    onLeaveRequestSheetChange={onLeaveRequestSheetChange}
                />
            </Card>
        </div>
    );
}
```

> 참고: 이 단계 후 `App.tsx`가 아직 새 props(`onExcelScheduleChange` 등)를 넘기지 않아 `tsc -b`가 에러를 낼 수 있다. Task 6에서 App.tsx를 함께 수정한 뒤 타입 체크한다. 이 Task는 커밋하지 말고 Task 6과 함께 검증·커밋한다.

- [ ] **Step 2: (검증은 Task 6에서) 다음 Task로 진행**

---

## Task 6: App.tsx 통합 (생성 + 다운로드)

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: import 및 타입 추가**

`src/App.tsx` 상단 import 수정:
- 타입 import에 `ExcelConnection` 추가:

```ts
import type {
    ScheduleMonth,
    InputMethod,
    GeneratedSchedule,
    SheetConnection,
    ExcelConnection,
    DayAssignment,
} from './types';
```

- 기존 `import { writeScheduleToNewTab } from './lib/sheetWriter';` 바로 아래에 추가:

```ts
import { readWorkbook, sheetToRows, appendScheduleSheet, downloadWorkbook } from './lib/excelWorkbook';
```

- [ ] **Step 2: 상태 교체**

`const [uploadedFile, setUploadedFile] = useState<File | null>(null);` 한 줄을 아래 2줄로 교체:

```ts
    const [excelScheduleConn, setExcelScheduleConn] = useState<ExcelConnection>(null);
    const [excelLeaveConn, setExcelLeaveConn] = useState<ExcelConnection>(null);
```

`const [comingSoon, setComingSoon] = useState(false);` 줄은 삭제(엑셀이 동작하므로 불필요).

- [ ] **Step 3: isReady 수정**

`const isReady = ...` 블록을 아래로 교체:

```ts
    const isReady =
        inputMethod === 'excel'
            ? excelScheduleConn !== null
            : inputMethod === 'google'
              ? googleToken !== null && scheduleSheet !== null
              : false;
```

- [ ] **Step 4: handleGenerate를 excel/google 분기로 교체**

`async function handleGenerate(...) { ... }` 전체를 아래로 교체:

```ts
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
```

- [ ] **Step 5: 엑셀 다운로드 핸들러 추가**

`handleGenerate` 함수 바로 아래(기존 `handleWriteToSheet` 위)에 추가:

```ts
    function handleDownloadExcel() {
        if (!dayAssignments || !excelScheduleConn) return;
        setWriteMsg(null);
        setIsWriting(true);
        void (async () => {
            try {
                const wb = await readWorkbook(excelScheduleConn.file);
                const tab = appendScheduleSheet(wb, dayAssignments, selectedMonth);
                const fileName = `언제나이든치과_스케줄_${selectedMonth.year}_${String(
                    selectedMonth.month
                ).padStart(2, '0')}.xlsx`;
                downloadWorkbook(wb, fileName);
                setWriteMsg({ ok: true, text: `'${tab}' 시트를 추가해 다운로드했어요` });
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
```

- [ ] **Step 6: InputMethodCard 사용부 props 교체**

`<InputMethodCard ... />` 블록을 아래로 교체 (uploadedFile/onFileChange 제거, excel 콜백·isLoading 정리):

```tsx
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
```

- [ ] **Step 7: comingSoon 렌더 블록 제거**

`{comingSoon && ( ... )}` JSX 블록 전체를 삭제 (🚧 준비 중 표시). 이제 엑셀도 정상 동작한다.

- [ ] **Step 8: 출력 버튼을 입력 방식별로 분기**

`📝 시트에 입력` 버튼(`<button onClick={() => void handleWriteToSheet()} ...>`)을 아래 조건부 렌더로 교체:

```tsx
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
```

- [ ] **Step 9: 도움말 문구 일반화 (선택)**

`💡 두 버튼은 이렇게 달라요` 박스의 마지막 줄에서 `시트(휴무 신청·원장님 일정)를 고친 뒤`를 `입력(휴무 신청·원장님 일정)을 고친 뒤`로 바꿔 구글/엑셀 공통 문구로 만든다. (기능 영향 없음)

- [ ] **Step 10: 타입 체크·린트·테스트 (Task 5 포함 검증)**

Run: `npx tsc -b`
Expected: exit 0 (Task 5의 InputMethodCard 변경과 정합)

Run: `npx eslint src/App.tsx src/components/InputMethodCard.tsx`
Expected: exit 0 (uploadedFile 등 미사용 변수 없음)

Run: `npx vitest run`
Expected: 전체 PASS

- [ ] **Step 11: 커밋 (Task 5 + Task 6)**

```bash
git add src/App.tsx src/components/InputMethodCard.tsx
git commit -m "feat(excel): 엑셀 업로드로 스케줄 생성·다운로드 연결

업로드한 스케줄 파일에 'YY.MM_생성' 시트를 추가해 .xlsx로 다운로드.
휴무신청 파일은 선택. 기존 '준비 중' 막힘 해제

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: CHANGELOG 갱신

**Files:**
- Modify: `frontend/CHANGELOG.md`

- [ ] **Step 1: 최신 버전 항목 추가**

`frontend/CHANGELOG.md` 맨 위 형식(`## vX.Y.Z — YYYY-MM-DD`)을 확인하고, 다음 패치 버전으로 항목을 추가한다. 코드 용어 금지, 일상어로:

```markdown
## vX.Y.Z — 2026-06-15

- 엑셀 파일로도 스케줄을 만들 수 있어요. 스케줄 파일과 휴무신청 파일(선택)을 올리고 탭 이름만 적으면 됩니다
- 만든 스케줄을 엑셀 파일에 새 시트로 넣어 내려받을 수 있어요
```

(버전 번호는 기존 CHANGELOG 최상단 버전에서 패치 +1. 실제 값은 파일을 열어 확인 후 기입.)

- [ ] **Step 2: 커밋**

```bash
git add frontend/CHANGELOG.md
git commit -m "docs(changelog): 엑셀 업로드/다운로드 기능 안내 추가

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 완료 기준

- 엑셀 카드에서 스케줄 파일 + 탭이름 입력 → "확인" → 연결됨 표시
- (선택) 휴무 파일 + 탭이름 입력
- "스케줄 생성" → 미리보기 표시 (구글과 동일 결과)
- "📥 엑셀로 다운로드" → 원본 워크북에 'YY.MM_생성' 시트가 추가된 .xlsx 다운로드
- 탭 이름은 다음 방문 시 자동으로 채워짐
- `npx tsc -b`, `npx eslint`, `npx vitest run` 모두 통과

# 생성 스케줄을 구글 시트에 입력 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱이 생성한 진료실 스케줄을 연결된 구글 시트에 기존 양식(5행 주 블록)의 새 탭으로 한 번에 써넣는다.

**Architecture:** 그리드 생성(순수함수 `buildScheduleGrid`)과 구글 시트 API 호출(`resolveTabName`/`createTab`/`writeGrid`)을 `lib/sheetWriter.ts`로 분리한다. 주 그룹핑은 미리보기와 공유하는 `lib/weekGrouping.ts`로 추출한다. App.tsx에 "시트에 입력" 버튼을 추가한다.

**Tech Stack:** React 19 + TypeScript, Vitest, 구글 Sheets API v4 (OAuth scope `spreadsheets` 이미 보유), `fetch`.

**참고 스펙:** `docs/superpowers/specs/2026-06-09-write-schedule-to-sheet-design.md`

---

## 파일 구조

- Create: `frontend/src/lib/weekGrouping.ts` — `DayAssignment[]`를 월~일 7열 주 단위로 그룹화
- Create: `frontend/src/lib/__tests__/weekGrouping.test.ts`
- Modify: `frontend/src/components/AssignmentPreview.tsx` — 로컬 `groupByWeek`/`dowToCol` 제거, 공통 함수 사용
- Create: `frontend/src/lib/sheetWriter.ts` — 그리드 생성 + 시트 API
- Create: `frontend/src/lib/__tests__/sheetWriter.test.ts`
- Modify: `frontend/src/App.tsx` — "시트에 입력" 버튼·핸들러·상태 메시지
- Modify: `frontend/CHANGELOG.md` — 사용자 친화 항목 1줄

검증 명령(이 프로젝트 규칙): 타입 `cd frontend && npx tsc -b`, 테스트 `cd frontend && npx vitest run`.

---

## Task 1: 주 그룹핑 공통 함수 추출

**Files:**
- Create: `frontend/src/lib/weekGrouping.ts`
- Test: `frontend/src/lib/__tests__/weekGrouping.test.ts`
- Modify: `frontend/src/components/AssignmentPreview.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/src/lib/__tests__/weekGrouping.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { groupAssignmentsByWeek } from '../weekGrouping';
import type { DayAssignment } from '../../types';

function mkDay(date: string, dayOfWeek: number): DayAssignment {
    return {
        date,
        dayOfWeek,
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
    };
}

describe('groupAssignmentsByWeek', () => {
    it('월~일 7열로 그룹화하고 없는 요일은 null', () => {
        const days = [
            mkDay('2026-07-01', 3), // 수
            mkDay('2026-07-02', 4), // 목
            mkDay('2026-07-05', 0), // 일
        ];
        const weeks = groupAssignmentsByWeek(days);
        expect(weeks).toHaveLength(1);
        expect(weeks[0][0]).toBeNull(); // 월
        expect(weeks[0][2]?.date).toBe('2026-07-01'); // 수=col2
        expect(weeks[0][6]?.date).toBe('2026-07-05'); // 일=col6
    });

    it('월요일에서 새 주로 분리한다', () => {
        const weeks = groupAssignmentsByWeek([
            mkDay('2026-07-05', 0), // 일 (1주)
            mkDay('2026-07-06', 1), // 월 (2주)
        ]);
        expect(weeks).toHaveLength(2);
        expect(weeks[0][6]?.date).toBe('2026-07-05');
        expect(weeks[1][0]?.date).toBe('2026-07-06');
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd frontend && npx vitest run src/lib/__tests__/weekGrouping.test.ts`
Expected: FAIL — `weekGrouping` 모듈 없음

- [ ] **Step 3: 구현 작성**

`frontend/src/lib/weekGrouping.ts`:
```ts
import type { DayAssignment } from '../types';

function dowToCol(dayOfWeek: number): number {
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

/** dayAssignments를 월~일(7열) 주 단위로 그룹화. 진료일이 없는 요일은 null. */
export function groupAssignmentsByWeek(
    assignments: DayAssignment[]
): (DayAssignment | null)[][] {
    const sorted = [...assignments].sort((a, b) => a.date.localeCompare(b.date));
    const weeks: (DayAssignment | null)[][] = [];
    let current: (DayAssignment | null)[] = new Array(7).fill(null);

    for (const a of sorted) {
        const col = dowToCol(a.dayOfWeek);
        if (col === 0 && current.some((x) => x !== null)) {
            weeks.push(current);
            current = new Array(7).fill(null);
        }
        current[col] = a;
    }
    if (current.some((x) => x !== null)) weeks.push(current);
    return weeks;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd frontend && npx vitest run src/lib/__tests__/weekGrouping.test.ts`
Expected: PASS (2)

- [ ] **Step 5: AssignmentPreview를 공통 함수로 리팩터**

`frontend/src/components/AssignmentPreview.tsx`에서 로컬 `dowToCol`과 `groupByWeek` 함수 정의를 삭제하고, 상단 import에 추가:
```ts
import { groupAssignmentsByWeek } from '../lib/weekGrouping';
```
그리고 `AssignmentPreview` 본문의 `const weeks = groupByWeek(assignments);` 를 다음으로 교체:
```ts
    const weeks = groupAssignmentsByWeek(assignments);
```

- [ ] **Step 6: 타입·테스트 확인**

Run: `cd frontend && npx tsc -b && npx vitest run`
Expected: 타입 No errors, 전체 테스트 PASS

- [ ] **Step 7: 커밋**

```bash
cd /mnt/c/Users/kho54/Workspace/idendent_schedule_management
git add frontend/src/lib/weekGrouping.ts frontend/src/lib/__tests__/weekGrouping.test.ts frontend/src/components/AssignmentPreview.tsx
git commit -m "refactor(schedule): 주 그룹핑을 weekGrouping 공통 함수로 추출

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: buildScheduleGrid 순수함수

**Files:**
- Create: `frontend/src/lib/sheetWriter.ts`
- Test: `frontend/src/lib/__tests__/sheetWriter.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/src/lib/__tests__/sheetWriter.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildScheduleGrid } from '../sheetWriter';
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
    it('헤더 4행을 기존 양식대로 만든다', () => {
        const grid = buildScheduleGrid([], month);
        expect(grid[0]).toEqual(['7月']);
        expect(grid[1]).toEqual(['26.7.1']);
        expect(grid[2]).toEqual([' ~ 26.7.31']);
        expect(grid[3]).toEqual([
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
        expect(grid[4][2]).toBe('1 원장님 전체출근'); // 수=col2
        expect(grid[4][0]).toBe(''); // 월 없음
        expect(grid[5]).toEqual([]); // 그룹행 빈칸
        expect(grid[6]).toEqual([]);
        expect(grid[7]).toEqual([]);
        expect(grid[8][2]).toContain('성민,이은'); // 진료실=formatDayCell
    });

    it('원장 코드가 있으면 "일 코드,코드" 형식으로 표기한다', () => {
        const thu = mkDay({ date: '2026-07-02', dayOfWeek: 4, doctorAliases: ['오', '신'] });
        const grid = buildScheduleGrid([thu], month);
        expect(grid[4][3]).toBe('2 오,신'); // 목=col3
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd frontend && npx vitest run src/lib/__tests__/sheetWriter.test.ts`
Expected: FAIL — `buildScheduleGrid` 없음

- [ ] **Step 3: 구현 작성**

`frontend/src/lib/sheetWriter.ts`:
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

/** dayAssignments를 기존 스케줄 시트 양식(헤더 4행 + 주별 5행 블록)의 2차원 셀 배열로 변환 */
export function buildScheduleGrid(
    assignments: DayAssignment[],
    month: ScheduleMonth
): string[][] {
    const yy = String(month.year).slice(-2);
    const lastDay = new Date(month.year, month.month, 0).getDate();
    const grid: string[][] = [
        [`${month.month}月`],
        [`${yy}.${month.month}.1`],
        [` ~ ${yy}.${month.month}.${lastDay}`],
        [...DAY_NAME_ROW],
    ];

    for (const week of groupAssignmentsByWeek(assignments)) {
        // 블록행0: 날짜+원장
        grid.push(week.map((a) => (a ? dateDoctorCell(a) : '')));
        // 블록행1~3: 데스크·실장·위생사 (앱 미관리 → 빈 행)
        grid.push([], [], []);
        // 블록행4: 진료실
        grid.push(week.map((a) => (a ? formatDayCell(a) : '')));
    }
    return grid;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd frontend && npx vitest run src/lib/__tests__/sheetWriter.test.ts`
Expected: PASS (3)

- [ ] **Step 5: 커밋**

```bash
cd /mnt/c/Users/kho54/Workspace/idendent_schedule_management
git add frontend/src/lib/sheetWriter.ts frontend/src/lib/__tests__/sheetWriter.test.ts
git commit -m "feat(sheet): 스케줄을 기존 양식 그리드로 변환하는 buildScheduleGrid 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 구글 시트 쓰기 API 함수

**Files:**
- Modify: `frontend/src/lib/sheetWriter.ts`
- Test: `frontend/src/lib/__tests__/sheetWriter.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`frontend/src/lib/__tests__/sheetWriter.test.ts` 상단 import를 다음으로 교체:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildScheduleGrid, resolveTabName, createTab, writeGrid } from '../sheetWriter';
import type { DayAssignment, ScheduleMonth } from '../../types';
```
파일 맨 아래에 추가:
```ts
beforeEach(() => {
    vi.restoreAllMocks();
});

describe('resolveTabName', () => {
    it('충돌이 없으면 baseName 그대로 반환', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ sheets: [{ properties: { title: '26.06' } }] }),
        } as Response);
        expect(await resolveTabName('id', 'tok', '26.07_생성')).toBe('26.07_생성');
    });

    it('충돌하면 다음 번호를 붙인다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                sheets: [
                    { properties: { title: '26.07_생성' } },
                    { properties: { title: '26.07_생성2' } },
                ],
            }),
        } as Response);
        expect(await resolveTabName('id', 'tok', '26.07_생성')).toBe('26.07_생성3');
    });
});

describe('createTab', () => {
    it('addSheet 요청을 POST한다', async () => {
        const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as Response);
        await createTab('SID', 'TOK', '새탭');
        const [url, opts] = spy.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/SID:batchUpdate');
        expect(opts.method).toBe('POST');
        expect(JSON.parse(opts.body as string)).toEqual({
            requests: [{ addSheet: { properties: { title: '새탭' } } }],
        });
    });
});

describe('writeGrid', () => {
    it('RAW 옵션으로 values를 PUT한다', async () => {
        const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as Response);
        await writeGrid('SID', 'TOK', '26.07_생성', [['a']]);
        const [url, opts] = spy.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/SID/values/');
        expect(url).toContain('valueInputOption=RAW');
        expect(opts.method).toBe('PUT');
        expect(JSON.parse(opts.body as string)).toEqual({ values: [['a']] });
    });

    it('실패 시 상태코드를 담아 throw', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 401,
        } as Response);
        await expect(writeGrid('S', 'T', 'x', [])).rejects.toThrow('401');
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd frontend && npx vitest run src/lib/__tests__/sheetWriter.test.ts`
Expected: FAIL — `resolveTabName`/`createTab`/`writeGrid` 없음

- [ ] **Step 3: 구현 추가**

`frontend/src/lib/sheetWriter.ts` 맨 아래에 추가:
```ts
const API = 'https://sheets.googleapis.com/v4/spreadsheets';

async function fetchTitles(sheetId: string, token: string): Promise<string[]> {
    const res = await fetch(`${API}/${sheetId}?fields=sheets.properties.title`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`구글 시트 API 오류 (${res.status})`);
    const data = await res.json();
    const sheets: Array<{ properties?: { title?: string } }> = data.sheets ?? [];
    return sheets.map((s) => s.properties?.title ?? '');
}

/** 기존 탭과 겹치지 않는 탭 이름 결정 (충돌 시 base2, base3 …) */
export async function resolveTabName(
    sheetId: string,
    token: string,
    baseName: string
): Promise<string> {
    const titles = new Set(await fetchTitles(sheetId, token));
    if (!titles.has(baseName)) return baseName;
    for (let i = 2; ; i++) {
        const name = `${baseName}${i}`;
        if (!titles.has(name)) return name;
    }
}

/** 새 탭 생성 */
export async function createTab(sheetId: string, token: string, tabName: string): Promise<void> {
    const res = await fetch(`${API}/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName } } }] }),
    });
    if (!res.ok) throw new Error(`구글 시트 API 오류 (${res.status})`);
}

/** 그리드를 탭의 A1부터 RAW로 기록 */
export async function writeGrid(
    sheetId: string,
    token: string,
    tabName: string,
    grid: string[][]
): Promise<void> {
    const range = encodeURIComponent(`${tabName}!A1`);
    const res = await fetch(`${API}/${sheetId}/values/${range}?valueInputOption=RAW`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: grid }),
    });
    if (!res.ok) throw new Error(`구글 시트 API 오류 (${res.status})`);
}

/** 새 탭을 만들어 스케줄을 기록하고, 생성된 탭 이름을 반환 */
export async function writeScheduleToNewTab(
    sheetId: string,
    token: string,
    month: ScheduleMonth,
    assignments: DayAssignment[]
): Promise<string> {
    const baseName = `${String(month.year).slice(-2)}.${String(month.month).padStart(2, '0')}_생성`;
    const tabName = await resolveTabName(sheetId, token, baseName);
    await createTab(sheetId, token, tabName);
    await writeGrid(sheetId, token, tabName, buildScheduleGrid(assignments, month));
    return tabName;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd frontend && npx vitest run src/lib/__tests__/sheetWriter.test.ts`
Expected: PASS (7)

- [ ] **Step 5: 커밋**

```bash
cd /mnt/c/Users/kho54/Workspace/idendent_schedule_management
git add frontend/src/lib/sheetWriter.ts frontend/src/lib/__tests__/sheetWriter.test.ts
git commit -m "feat(sheet): 구글 시트 새 탭 생성·기록 API 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: App.tsx UI 통합

**Files:**
- Modify: `frontend/src/App.tsx`

> UI 동작은 단위테스트 대상이 아니다. 타입 체크 + 수동 확인으로 검증한다.

- [ ] **Step 1: import·상태 추가**

`frontend/src/App.tsx` 상단 import에 추가:
```ts
import { writeScheduleToNewTab } from './lib/sheetWriter';
```
`MainPage` 컴포넌트의 상태 선언부(`const [seed, setSeed] = useState(0);` 부근)에 추가:
```ts
    const [isWriting, setIsWriting] = useState(false);
    const [writeMsg, setWriteMsg] = useState<{ ok: boolean; text: string } | null>(null);
```

- [ ] **Step 2: 핸들러 추가**

`handleGenerate` 함수 정의 바로 아래에 추가:
```ts
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
                text: msg.includes('(401)')
                    ? '구글 로그인이 만료됐어요. 다시 연결해 주세요'
                    : msg,
            });
        } finally {
            setIsWriting(false);
        }
    }
```

- [ ] **Step 3: 버튼·메시지 렌더 추가**

`{dayAssignments && (` 로 시작하는 "다시 섞기" 버튼 줄에서, `🔀 다시 섞기` 버튼 바로 **앞**에 "시트에 입력" 버튼을 추가한다. 해당 `<div style={{ display: 'flex', justifyContent: 'flex-end', ... }}>` 안, 다시 섞기 `<button>` 앞에 삽입:
```tsx
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
```
그리고 그 버튼 줄을 닫는 `</div>` **다음**, `{dayAssignments && <AssignmentPreview ... />}` **앞**에 결과 메시지를 추가:
```tsx
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
```

- [ ] **Step 4: 타입 확인**

Run: `cd frontend && npx tsc -b`
Expected: No errors found

- [ ] **Step 5: 수동 확인 (사용자와 함께)**

개발 서버(`cd frontend && npm run dev`)에서 구글 시트 연결 → 스케줄 생성 → "📝 시트에 입력" 클릭 → 연결된 스프레드시트에 `YY.MM_생성` 탭이 생기고 날짜+원장 행·진료실 행이 채워졌는지 확인. (이 단계에서 **열 위치 A~G가 실제 시트와 맞는지** 확인 — 어긋나면 `sheetWriter.ts`의 그리드 열 시작을 조정.)

- [ ] **Step 6: 커밋**

```bash
cd /mnt/c/Users/kho54/Workspace/idendent_schedule_management
git add frontend/src/App.tsx
git commit -m "feat(sheet): '시트에 입력' 버튼으로 생성 스케줄을 새 탭에 기록

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: CHANGELOG + 최종 검증

**Files:**
- Modify: `frontend/CHANGELOG.md`

- [ ] **Step 1: CHANGELOG 항목 추가 (사용자 친화 문구)**

`frontend/CHANGELOG.md`의 `## v1.4.2 — 2026-06-09` 항목 목록 맨 아래에 추가:
```markdown
- 생성한 스케줄을 구글 시트의 새 탭(`26.07_생성`)에 기존 양식 그대로 한 번에 입력
```

- [ ] **Step 2: 전체 검증**

Run: `cd frontend && npx tsc -b && npx vitest run`
Expected: 타입 No errors, 전체 테스트 PASS

- [ ] **Step 3: 커밋**

```bash
cd /mnt/c/Users/kho54/Workspace/idendent_schedule_management
git add frontend/CHANGELOG.md
git commit -m "docs(changelog): 시트 입력 기능 항목 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## 자체 점검 결과

- **스펙 커버리지**: 새 탭 생성(Task 3·`resolveTabName`/`createTab`), 5행 블록 양식(Task 2), 그룹행 빈칸(Task 2), 진료실=formatDayCell(Task 2), 날짜+원장(Task 2), 탭명 충돌(Task 3), 버튼·흐름(Task 4), 401 에러(Task 4), 테스트(Task 1~3) — 모두 태스크에 매핑됨.
- **플레이스홀더**: 없음 — 모든 코드/명령 구체화.
- **타입 일관성**: `buildScheduleGrid`/`resolveTabName`/`createTab`/`writeGrid`/`writeScheduleToNewTab` 시그니처가 Task 간 일치. `groupAssignmentsByWeek` 반환형 `(DayAssignment|null)[][]` 일관.
- **미해결(구현 중 확인)**: 열 오프셋 A~G ↔ 파서 B~H — Task 4 Step 5 수동 확인에 포함.

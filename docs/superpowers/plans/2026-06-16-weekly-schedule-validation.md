# 주별 스케줄 검증(미리보기) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 생성된 스케줄을 주 단위로 자동 검증해, 미리보기 각 주 아래에 이상 유무를 표시한다.

**Architecture:** 순수 함수 `lib/scheduleValidator.ts`가 미리보기와 동일하게 `groupAssignmentsByWeek`로 주를 나눠 6가지 규칙을 검사하고 주차별 결과 배열을 반환한다. `App`이 생성 시점의 `clinicStaff`·`scheduleSettings`로 호출해 state에 담고 `AssignmentPreview`가 각 주 행 아래에 렌더한다. 검증은 화면 전용(엑셀·구글 출력 미반영).

**Tech Stack:** React 19 + TypeScript, Vite, Vitest

## Global Constraints

- 모든 명령은 `frontend/`에서 실행. 타입체크 `npx tsc -b`(`--noEmit` 금지). 테스트 `npx vitest run`(rolldown 바인딩 에러 시 `rtk proxy npx ...`). 린트 `npx eslint <files>`.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` 추가.
- 전체 빌드(`npm run build`)는 하지 않는다.
- 직원 식별 키 = `alias ?? name` (DayAssignment.working의 이름과 동일 규칙).
- 요일 매핑: `['일','월','화','수','목','금','토']` (dayOfWeek 0=일 … 6=토).
- 검증은 안내일 뿐 생성/다운로드를 막지 않는다.

---

## File Structure

- **신규** `src/lib/scheduleValidator.ts` — `validateSchedule(...)` + `WeekValidation`/`ValidationIssue` 타입
- **신규** `src/lib/__tests__/scheduleValidator.test.ts`
- **수정** `src/App.tsx` — 생성 시 검증 호출·state 저장·미리보기에 전달
- **수정** `src/components/AssignmentPreview.tsx` — 각 주 아래 검증 결과 행

---

## Task 1: scheduleValidator (검증 로직)

**Files:**
- Create: `src/lib/scheduleValidator.ts`
- Test: `src/lib/__tests__/scheduleValidator.test.ts`

**Interfaces:**
- Consumes: `DayAssignment`, `StaffRow`, `ScheduleSetting` (from `../types`); `groupAssignmentsByWeek` (from `./weekGrouping`).
- Produces:
  - `type ValidationIssue = { severity: 'warn' | 'info'; message: string }`
  - `type WeekValidation = { weekLabel: string; issues: ValidationIssue[] }`
  - `function validateSchedule(assignments: DayAssignment[], clinicStaff: StaffRow[], scheduleSettings: ScheduleSetting[]): WeekValidation[]`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/lib/__tests__/scheduleValidator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateSchedule } from '../scheduleValidator';
import type { DayAssignment, StaffRow, ScheduleSetting, CareerLevel } from '../../types';

// 한 주(2026-07-06 월 ~ 07-12 일) dow: 월1 화2 수3 목4 금5 토6 일0
const WEEK_DATES: { date: string; dayOfWeek: number }[] = [
    { date: '2026-07-06', dayOfWeek: 1 },
    { date: '2026-07-07', dayOfWeek: 2 },
    { date: '2026-07-08', dayOfWeek: 3 },
    { date: '2026-07-09', dayOfWeek: 4 },
    { date: '2026-07-10', dayOfWeek: 5 },
    { date: '2026-07-11', dayOfWeek: 6 },
    { date: '2026-07-12', dayOfWeek: 0 },
];

function day(over: Partial<DayAssignment> & { date: string; dayOfWeek: number }): DayAssignment {
    return {
        doctorAliases: [],
        isFullAttendance: true, // 기본 전체출근 → 최소인원·교정·야간 검사 건너뜀
        working: [],
        fullDayOff: [],
        halfDayOff: [],
        isOrthoDay: false,
        orthoStaffCount: 0,
        nightFixedStaff: [],
        hasTeamLeader: true, // 기본 팀장 있음 → 일요일 팀장 경고 안 뜸
        hasNightShift: false,
        dayShiftStaff: [],
        nightShiftStaff: [],
        ...over,
    };
}

/** 기본(이상 없음) 한 주 — 각 테스트에서 특정 날만 override */
function baseWeek(over: Partial<Record<number, Partial<DayAssignment>>> = {}): DayAssignment[] {
    return WEEK_DATES.map((d) => day({ ...d, ...(over[d.dayOfWeek] ?? {}) }));
}

function makeStaff(over: Partial<StaffRow>): StaffRow {
    return {
        id: 1,
        name: '이름',
        alias: null,
        use_yn: 'Y',
        employee_type_id: 6,
        career: '고' as CareerLevel,
        team_no: null,
        is_ortho: false,
        is_team_leader: false,
        is_night_fixed: false,
        is_weekday_fixed: false,
        is_on_leave: false,
        is_head_dentist_pick: false,
        notes: null,
        sort_order: 1,
        ...over,
    };
}

function setting(day_name: string, over: Partial<ScheduleSetting>): ScheduleSetting {
    return {
        id: 1,
        day_name,
        sort_order: 1,
        min_staff_with_ortho: 0,
        min_staff_without_ortho: 0,
        min_staff_on_leave: 0,
        has_night_shift: false,
        ...over,
    };
}

const msgs = (r: ReturnType<typeof validateSchedule>) => r[0].issues.map((i) => i.message);

describe('validateSchedule', () => {
    it('이상 없는 주는 빈 issues를 반환한다', () => {
        const r = validateSchedule(baseWeek(), [], []);
        expect(r).toHaveLength(1);
        expect(r[0].weekLabel).toBe('1주차');
        expect(r[0].issues).toEqual([]);
    });

    it('요일별 최소 인원 미달을 경고한다', () => {
        // 목요일: 진료일·출근 5명, 목 최소 6
        const week = baseWeek({
            4: {
                isFullAttendance: false,
                doctorAliases: ['오'],
                working: ['a', 'b', 'c', 'd', 'e'],
            },
        });
        const r = validateSchedule(week, [], [setting('목', { min_staff_without_ortho: 6 })]);
        expect(msgs(r)).toContain('목요일 5명 (최소 6)');
    });

    it('교정일 교정 인원이 3명 미만이면 경고한다', () => {
        const week = baseWeek({
            5: { isFullAttendance: false, doctorAliases: ['정'], isOrthoDay: true, orthoStaffCount: 2, working: ['a'] },
        });
        const r = validateSchedule(week, [], []);
        expect(msgs(r)).toContain('금요일 교정 2명 (최소 3)');
    });

    it('일요일 팀장이 없으면 경고한다', () => {
        const week = baseWeek({
            0: { isFullAttendance: false, doctorAliases: ['Y'], working: ['a'], hasTeamLeader: false },
        });
        const r = validateSchedule(week, [], []);
        expect(msgs(r)).toContain('일요일 팀장 미배정');
    });

    it('일요일에 신규 직원이 배정되면 경고한다', () => {
        const week = baseWeek({
            0: { isFullAttendance: false, doctorAliases: ['Y'], working: ['서이'], hasTeamLeader: true },
        });
        const staff = [makeStaff({ name: '서이', career: '신규' })];
        const r = validateSchedule(week, staff, []);
        expect(msgs(r)).toContain('일요일 신규 배정: 서이');
    });

    it('야간분리일에 야간 인원이 없으면 경고한다', () => {
        const week = baseWeek({
            3: { isFullAttendance: false, doctorAliases: ['오'], working: ['a'], hasNightShift: true, nightShiftStaff: [] },
        });
        const r = validateSchedule(week, [], []);
        expect(msgs(r)).toContain('수요일 야간 인원 없음');
    });

    it('연차로 설명되지 않게 5일 미만 근무하면 경고한다', () => {
        // 혜수가 월~목(4일)만 출근, 금·토·일 결근(명시 휴무 없음)
        const week = baseWeek({
            1: { working: ['혜수'] },
            2: { working: ['혜수'] },
            3: { working: ['혜수'] },
            4: { working: ['혜수'] },
        });
        const staff = [makeStaff({ name: '혜수' })];
        const r = validateSchedule(week, staff, []);
        expect(msgs(r)).toContain('혜수 4일 근무');
    });

    it('근무일 부족이 연차로 설명되면 경고 대신 정보로 표시한다', () => {
        // 예진: 월·화·수 출근(3일), 목·금·토 연차(3일)
        const leave = (name: string) => ({ date: '', name, type: '연차' as const });
        const week = baseWeek({
            1: { working: ['예진'] },
            2: { working: ['예진'] },
            3: { working: ['예진'] },
            4: { fullDayOff: [leave('예진')] },
            5: { fullDayOff: [leave('예진')] },
            6: { fullDayOff: [leave('예진')] },
        });
        const staff = [makeStaff({ name: '예진' })];
        const r = validateSchedule(week, staff, []);
        expect(r[0].issues).toContainEqual({ severity: 'info', message: '예진 연차 3일' });
        expect(r[0].issues.every((i) => i.severity !== 'warn')).toBe(true);
    });

    it('6일 초과 근무(휴무 부족)를 경고한다', () => {
        const week = baseWeek({
            1: { working: ['갑'] },
            2: { working: ['갑'] },
            3: { working: ['갑'] },
            4: { working: ['갑'] },
            5: { working: ['갑'] },
            6: { working: ['갑'] },
        });
        const r = validateSchedule(week, [makeStaff({ name: '갑' })], []);
        expect(msgs(r)).toContain('갑 6일 근무 (휴무 부족)');
    });

    it('부분주(가용일 6 미만)는 개인 균형 검사를 건너뛴다', () => {
        // 월·화·수 3일만 있는 부분주 — 누구도 5일 근무 불가하지만 경고 없음
        const partial = [
            day({ date: '2026-07-06', dayOfWeek: 1, working: ['갑'] }),
            day({ date: '2026-07-07', dayOfWeek: 2, working: ['갑'] }),
            day({ date: '2026-07-08', dayOfWeek: 3, working: ['갑'] }),
        ];
        const r = validateSchedule(partial, [makeStaff({ name: '갑' })], []);
        expect(r[0].issues).toEqual([]);
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/__tests__/scheduleValidator.test.ts` (필요시 `rtk proxy npx ...`)
Expected: FAIL — `validateSchedule` 모듈 없음.

- [ ] **Step 3: `scheduleValidator.ts` 구현**

Create `src/lib/scheduleValidator.ts`:

```ts
import type { DayAssignment, StaffRow, ScheduleSetting } from '../types';
import { groupAssignmentsByWeek } from './weekGrouping';

export type ValidationIssue = {
    severity: 'warn' | 'info';
    message: string;
};

export type WeekValidation = {
    weekLabel: string;
    issues: ValidationIssue[];
};

const DAY_NAME_BY_DOW = ['일', '월', '화', '수', '목', '금', '토'];
const ORTHO_MIN = 3;
const EXPECTED_WORK_DAYS = 5;
const MIN_OPEN_DAYS_FOR_BALANCE = 6; // 부분주 오탐 방지

function staffKey(s: StaffRow): string {
    return s.alias ?? s.name;
}

function settingByDow(
    settings: ScheduleSetting[],
    dayOfWeek: number
): ScheduleSetting | undefined {
    return settings.find((s) => s.day_name === DAY_NAME_BY_DOW[dayOfWeek]);
}

/** 하루 단위 규칙 검사 (최소 인원·교정·일요일 팀장/신규·야간) */
function checkDay(
    d: DayAssignment,
    clinicStaff: StaffRow[],
    settings: ScheduleSetting[]
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const dow = DAY_NAME_BY_DOW[d.dayOfWeek];
    const isClosureOrEmpty = d.working.length === 0;

    // 1. 최소 인원 (전체출근일·야간분리일·휴진/빈날 제외)
    if (!d.isFullAttendance && !d.hasNightShift && !isClosureOrEmpty) {
        const setting = settingByDow(settings, d.dayOfWeek);
        if (setting) {
            const hasLeave = d.fullDayOff.length > 0;
            const required = hasLeave
                ? setting.min_staff_on_leave
                : d.isOrthoDay
                  ? setting.min_staff_with_ortho
                  : setting.min_staff_without_ortho;
            if (d.working.length < required) {
                issues.push({
                    severity: 'warn',
                    message: `${dow}요일 ${d.working.length}명 (최소 ${required})`,
                });
            }
        }
    }

    // 5. 교정일 교정 인원
    if (d.isOrthoDay && d.orthoStaffCount < ORTHO_MIN) {
        issues.push({
            severity: 'warn',
            message: `${dow}요일 교정 ${d.orthoStaffCount}명 (최소 ${ORTHO_MIN})`,
        });
    }

    // 6. 야간 인원
    if (d.hasNightShift && !isClosureOrEmpty && d.nightShiftStaff.length === 0) {
        issues.push({ severity: 'warn', message: `${dow}요일 야간 인원 없음` });
    }

    // 일요일 전용 (출근자가 있는 진료일만)
    if (d.dayOfWeek === 0 && !isClosureOrEmpty) {
        // 3. 팀장 1명 이상
        if (!d.hasTeamLeader) {
            issues.push({ severity: 'warn', message: '일요일 팀장 미배정' });
        }
        // 4. 신규 미배정
        const newbieKeys = new Set(
            clinicStaff.filter((s) => s.career === '신규').map(staffKey)
        );
        const newbies = d.working.filter((name) => newbieKeys.has(name));
        if (newbies.length > 0) {
            issues.push({
                severity: 'warn',
                message: `일요일 신규 배정: ${newbies.join(',')}`,
            });
        }
    }

    return issues;
}

/** 한 주 개인별 5근무/2휴무 검사 (가용일 6 이상인 주만) */
function checkWeeklyBalance(
    days: DayAssignment[],
    clinicStaff: StaffRow[]
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (days.length < MIN_OPEN_DAYS_FOR_BALANCE) return issues;

    const active = clinicStaff.filter((s) => !s.is_on_leave);
    for (const s of active) {
        const key = staffKey(s);
        let workDays = 0;
        let leaveDays = 0;
        for (const d of days) {
            if (d.working.includes(key)) workDays++;
            else if (d.fullDayOff.some((r) => r.name === key)) leaveDays++;
        }

        if (workDays > EXPECTED_WORK_DAYS) {
            issues.push({ severity: 'warn', message: `${key} ${workDays}일 근무 (휴무 부족)` });
        } else if (workDays < EXPECTED_WORK_DAYS) {
            const shortfall = EXPECTED_WORK_DAYS - workDays;
            if (shortfall > leaveDays) {
                issues.push({ severity: 'warn', message: `${key} ${workDays}일 근무` });
            } else {
                issues.push({ severity: 'info', message: `${key} 연차 ${leaveDays}일` });
            }
        }
    }
    return issues;
}

/**
 * 생성 스케줄을 주 단위로 검사한다. 미리보기와 같은 주 분할을 사용하므로
 * 반환 배열의 인덱스가 미리보기 주 순서와 일치한다.
 */
export function validateSchedule(
    assignments: DayAssignment[],
    clinicStaff: StaffRow[],
    scheduleSettings: ScheduleSetting[]
): WeekValidation[] {
    const weeks = groupAssignmentsByWeek(assignments);
    return weeks.map((week, i) => {
        const days = week.filter((a): a is DayAssignment => a !== null);
        const issues: ValidationIssue[] = [];
        for (const d of days) issues.push(...checkDay(d, clinicStaff, scheduleSettings));
        issues.push(...checkWeeklyBalance(days, clinicStaff));
        return { weekLabel: `${i + 1}주차`, issues };
    });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/__tests__/scheduleValidator.test.ts` → 10개 PASS
Run: `npx tsc -b` → exit 0

- [ ] **Step 5: 커밋**

```bash
git add src/lib/scheduleValidator.ts src/lib/__tests__/scheduleValidator.test.ts
git commit -m "feat(schedule): 주별 스케줄 검증 로직 추가

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 미리보기에 검증 결과 표시 (App + AssignmentPreview)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/AssignmentPreview.tsx`

**Interfaces:**
- Consumes: `validateSchedule`, `WeekValidation` (from `./lib/scheduleValidator` / `../lib/scheduleValidator`).
- `AssignmentPreview` Props에 `validations?: WeekValidation[]` 추가. `validations[i]`는 `groupAssignmentsByWeek(assignments)[i]`와 1:1 대응.

이 저장소는 컴포넌트 테스트가 없으므로 `tsc -b`·`eslint`로 검증한다(검증 로직은 Task 1에서 단위 테스트 완료).

- [ ] **Step 1: `AssignmentPreview.tsx`에 검증 행 추가**

`src/components/AssignmentPreview.tsx` 상단 import에 타입 추가:

```tsx
import type { DayAssignment } from '../types';
import type { WeekValidation } from '../lib/scheduleValidator';
```

(기존 `formatDayCell`/`isClosureDay`/`CLOSURE_BG_HEX`/`CLOSURE_TEXT_HEX` import와 `groupAssignmentsByWeek` import는 그대로 둔다.)

`Props` 인터페이스를 교체:

```tsx
interface Props {
    assignments: DayAssignment[];
    validations?: WeekValidation[];
}
```

검증 행을 그리는 컴포넌트를 `AssignmentPreview` 함수 위에 추가:

```tsx
function ValidationRow({ validation }: { validation: WeekValidation }) {
    const warns = validation.issues.filter((i) => i.severity === 'warn');
    const infos = validation.issues.filter((i) => i.severity === 'info');
    const ok = warns.length === 0;

    return (
        <td
            colSpan={7}
            style={{
                padding: '6px 10px',
                fontSize: 11,
                lineHeight: 1.6,
                borderBottom: '2px solid var(--color-border)',
                background: ok ? '#f0fdf4' : '#fef2f2',
                color: ok ? '#166534' : '#dc2626',
            }}
        >
            <b>
                {ok ? '✅' : '⚠️'} {validation.weekLabel}
                {ok ? ' 이상 없음' : ''}
            </b>
            {warns.length > 0 && <span> · {warns.map((i) => i.message).join(' · ')}</span>}
            {infos.length > 0 && (
                <span style={{ color: 'var(--color-text-sub)' }}>
                    {' '}
                    · {infos.map((i) => i.message).join(' · ')}
                </span>
            )}
        </td>
    );
}
```

`AssignmentPreview` 함수 시그니처와 `tbody`의 주 렌더를 교체:

```tsx
export function AssignmentPreview({ assignments, validations }: Props) {
    const weeks = groupAssignmentsByWeek(assignments);
```

`tbody` 내부를 아래로 교체 (각 주 행 뒤에 검증 행 추가):

```tsx
                    <tbody>
                        {weeks.map((week, i) => (
                            <Fragment key={i}>
                                <tr>
                                    {week.map((a, col) => (
                                        <CalendarCell key={col} assignment={a} col={col} />
                                    ))}
                                </tr>
                                {validations?.[i] && (
                                    <tr>
                                        <ValidationRow validation={validations[i]} />
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
```

`Fragment` 사용을 위해 최상단 react import를 추가 (파일 첫 줄):

```tsx
import { Fragment } from 'react';
```

- [ ] **Step 2: `App.tsx` 배선**

`src/App.tsx`에서 `import { writeScheduleToNewTab } ...` 인접 import 영역에 추가:

```ts
import { validateSchedule, type WeekValidation } from './lib/scheduleValidator';
```

`dayAssignments` state 선언 바로 아래에 검증 state 추가:

```ts
    const [weekValidations, setWeekValidations] = useState<WeekValidation[] | null>(null);
```

`handleGenerate` 시작부의 초기화에 한 줄 추가 (기존 `setDayAssignments(null);` 다음 줄):

```ts
        setWeekValidations(null);
```

`handleGenerate` 끝의 결과 반영 블록
```ts
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
```
을 아래로 교체 (생성 결과를 변수로 받아 검증까지 계산):

```ts
            const assignments = assignDailySchedule(
                clinicStaff,
                doctors,
                leaveRequests,
                doctorSchedule,
                scheduleSettings,
                selectedMonth,
                plannedOffDays
            );
            setDayAssignments(assignments);
            setWeekValidations(validateSchedule(assignments, clinicStaff, scheduleSettings));
```

미리보기 렌더 라인
```tsx
            {dayAssignments && <AssignmentPreview assignments={dayAssignments} />}
```
을 아래로 교체:

```tsx
            {dayAssignments && (
                <AssignmentPreview
                    assignments={dayAssignments}
                    validations={weekValidations ?? undefined}
                />
            )}
```

- [ ] **Step 3: 검증**

Run: `npx tsc -b` → exit 0
Run: `npx eslint src/App.tsx src/components/AssignmentPreview.tsx` → exit 0
Run: `npx vitest run` → 전체 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/App.tsx src/components/AssignmentPreview.tsx
git commit -m "feat(schedule): 미리보기 각 주 아래에 검증 결과 표시

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: CHANGELOG

**Files:**
- Modify: `frontend/CHANGELOG.md`

- [ ] **Step 1: 최신 버전 항목 추가**

`frontend/CHANGELOG.md` 맨 위에 새 마이너 버전을 추가한다(새 기능이므로 마이너 범프, 일상어):

```markdown
## v1.6.0 — 2026-06-16

- 생성한 스케줄을 미리보기에서 주마다 자동 점검해 결과를 함께 보여줘요 — 최소 인원, 개인별 근무·휴무 균형, 일요일 팀장·신규, 교정·야간 배정을 확인해 '이상 없음' 또는 문제 항목을 표시합니다
```

(파일 최상단이 v1.5.2인지 확인 후 위 항목을 그 위에 추가. 다르면 마이너 범프 규칙으로 조정.)

- [ ] **Step 2: 커밋**

```bash
git add frontend/CHANGELOG.md
git commit -m "docs(changelog): 주별 스케줄 검증 안내 추가

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 완료 기준

- 스케줄 생성 시 미리보기 각 주 아래에 '✅ N주차 이상 없음' 또는 '⚠️ N주차 · 문제…'가 표시됨
- 검사 6종(최소인원·개인 5/2 균형·일요일 팀장·신규 일요일·교정 3명·야간) 동작, 연차는 정보로 안내, 부분주는 균형 검사 생략
- '다시 섞기'·재생성 시 검증 결과도 갱신
- `npx tsc -b`, `npx vitest run`, `npx eslint` 모두 통과

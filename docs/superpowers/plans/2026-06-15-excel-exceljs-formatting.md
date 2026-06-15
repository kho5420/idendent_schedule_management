# 엑셀 출력 ExcelJS 전환(서식 보존) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엑셀 다운로드 시 서식이 사라지는 문제를, `xlsx`→`exceljs` 전환 + 유저 입력 탭 복제로 해결한다.

**Architecture:** `lib/excelWorkbook.ts`만 `exceljs`로 재작성한다. 업로드 워크북을 서식째 읽고, 다운로드 시 유저가 지정한 스케줄 탭을 서식째 복제→데이터영역 비움→생성 그리드 기록. 파서·배정·`buildScheduleGrid`·`scheduleGrid`·구글 경로는 변경 없음. 안 쓰이는 `xlsx` 죽은 코드(`excelExporter`/`excelParser`)를 제거하고 의존성에서 `xlsx`를 뺀다.

**Tech Stack:** React 19 + TypeScript, Vite, exceljs, Vitest

**참고:** 모든 명령은 `frontend/`에서 실행. 타입체크 `npx tsc -b`(`--noEmit` 금지). 테스트 `npx vitest run`(rolldown 바인딩 에러 시 `rtk proxy npx ...`). 린트 `npx eslint <files>`. 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. 전체 빌드(`npm run build`)는 하지 않는다.

---

## File Structure

- **재작성** `src/lib/excelWorkbook.ts` — exceljs 기반 I/O (readWorkbook/listSheetNames/sheetToRows/appendScheduleSheet/downloadWorkbook)
- **재작성** `src/lib/__tests__/excelWorkbook.test.ts` — exceljs 기반 테스트
- **수정** `src/App.tsx` — `handleDownloadExcel`가 소스 탭명 전달 + `downloadWorkbook` await
- **삭제** `src/lib/excelExporter.ts`, `src/lib/excelParser.ts`, 각 테스트 (죽은 코드)
- **의존성** `exceljs` 추가, `xlsx` 제거

---

## Task 1: ExcelJS로 전환 (설치 + excelWorkbook 재작성 + 호출부)

이 Task는 하나의 응집된 변경이다(라이브러리 교체 + 호출부). 중간에 tsc가 깨지지 않도록 한 커밋으로 처리한다.

**Files:**
- Modify: `package.json` (exceljs 설치)
- Rewrite: `src/lib/excelWorkbook.ts`
- Rewrite: `src/lib/__tests__/excelWorkbook.test.ts`
- Modify: `src/App.tsx` (handleDownloadExcel)

- [ ] **Step 1: exceljs 설치**

Run: `npm install exceljs`
Expected: 설치 성공. (`xlsx` 제거는 Task 2에서 — 아직 다른 파일이 쓰므로 지금 빼지 않는다.)

- [ ] **Step 2: 테스트 재작성 (TDD — 새 동작 먼저)**

`src/lib/__tests__/excelWorkbook.test.ts` 전체를 아래로 교체:

```ts
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { sheetToRows, listSheetNames, appendScheduleSheet } from '../excelWorkbook';
import { parseDoctorSchedule } from '../doctorScheduleParser';
import type { DayAssignment, ScheduleMonth } from '../../types';

const month: ScheduleMonth = { year: 2026, month: 7 };

function wbWithSheet(name: string, aoa: unknown[][]): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(name);
    aoa.forEach((row, r) => {
        row.forEach((v, c) => {
            ws.getRow(r + 1).getCell(c + 1).value = v as ExcelJS.CellValue;
        });
    });
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
    it('지정 탭을 0-based 행 배열(셀 표시문자열)로 변환한다', () => {
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
    it('소스 탭을 복제해 서식(열너비·채움)을 보존하고 그리드를 기록하며 미관리 행은 비운다', () => {
        const wb = new ExcelJS.Workbook();
        const src = wb.addWorksheet('26.07');
        src.getColumn(2).width = 17;
        const headerCell = src.getRow(1).getCell(2);
        headerCell.value = '기존제목';
        headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        src.getRow(6).getCell(2).value = '데스크인원'; // 미관리 행(데스크) — 비워져야 함

        const wed = mkDay({ date: '2026-07-01', dayOfWeek: 3, isFullAttendance: true });
        const name = appendScheduleSheet(wb, '26.07', [wed], month);

        expect(name).toBe('26.07_생성');
        const dest = wb.getWorksheet('26.07_생성')!;
        // 서식 보존
        expect(dest.getColumn(2).width).toBe(17);
        expect(dest.getRow(1).getCell(2).fill).toMatchObject({ pattern: 'solid' });
        // 그리드 기록: B1 = '7月', 날짜+원장 행(시트 5행) D열 = '1 원장님 전체출근'
        expect(dest.getRow(1).getCell(2).text).toBe('7月');
        expect(dest.getRow(5).getCell(4).text).toBe('1 원장님 전체출근');
        // 미관리 행(데스크, 시트 6행)은 비워짐
        expect(dest.getRow(6).getCell(2).text).toBe('');
    });

    it('생성 시트명이 이미 있으면 번호를 붙인다', () => {
        const wb = new ExcelJS.Workbook();
        wb.addWorksheet('26.07');
        wb.addWorksheet('26.07_생성');
        const name = appendScheduleSheet(wb, '26.07', [], month);
        expect(name).toBe('26.07_생성2');
    });

    it('소스 탭이 없으면 에러를 던진다', () => {
        const wb = wbWithSheet('26.07', [['a']]);
        expect(() => appendScheduleSheet(wb, '없는탭', [], month)).toThrow('없는탭');
    });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/lib/__tests__/excelWorkbook.test.ts` (필요시 `rtk proxy npx ...`)
Expected: FAIL (기존 xlsx 기반 구현이라 ExcelJS 워크북·새 시그니처와 불일치)

- [ ] **Step 4: `excelWorkbook.ts` 전체를 ExcelJS 기반으로 재작성**

`src/lib/excelWorkbook.ts` 전체를 아래로 교체:

```ts
import ExcelJS from 'exceljs';
import type { DayAssignment, ScheduleMonth } from '../types';
import { buildScheduleGrid, pickTabName } from './scheduleGrid';

const DATA_COLS = 8; // A~H

/** 업로드한 .xlsx File을 워크북으로 읽는다(서식 포함). */
export async function readWorkbook(file: File): Promise<ExcelJS.Workbook> {
    const buffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    return wb;
}

/** 워크북의 탭(시트) 이름 목록. */
export function listSheetNames(wb: ExcelJS.Workbook): string[] {
    return wb.worksheets.map((ws) => ws.name);
}

/** 지정 탭을 0-based 행 배열(셀 표시문자열)로 변환. 탭이 없으면 에러. */
export function sheetToRows(wb: ExcelJS.Workbook, tabName: string): unknown[][] {
    const ws = wb.getWorksheet(tabName);
    if (!ws) throw new Error(`'${tabName}' 탭을 파일에서 찾을 수 없습니다`);
    const colCount = ws.columnCount;
    const rows: unknown[][] = [];
    for (let r = 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const arr: unknown[] = [];
        for (let c = 1; c <= colCount; c++) {
            arr.push(row.getCell(c).text);
        }
        rows.push(arr);
    }
    return rows;
}

/**
 * 소스 탭(sourceTabName)을 서식째 복제해 'YY.MM_생성' 시트를 만들고,
 * 데이터 영역(A~H)을 비운 뒤 생성 스케줄 그리드를 써넣는다(서식 유지).
 * 추가된 시트 이름을 반환. 소스 탭이 없으면 에러.
 */
export function appendScheduleSheet(
    wb: ExcelJS.Workbook,
    sourceTabName: string,
    assignments: DayAssignment[],
    month: ScheduleMonth
): string {
    const source = wb.getWorksheet(sourceTabName);
    if (!source) throw new Error(`'${sourceTabName}' 탭을 파일에서 찾을 수 없습니다`);

    const baseName = `${String(month.year).slice(-2)}.${String(month.month).padStart(2, '0')}_생성`;
    const tabName = pickTabName(listSheetNames(wb), baseName);
    const dest = wb.addWorksheet(tabName);

    // 열너비 복사
    for (let c = 1; c <= source.columnCount; c++) {
        const w = source.getColumn(c).width;
        if (w != null) dest.getColumn(c).width = w;
    }
    // 행높이 + 셀 서식 복사
    source.eachRow({ includeEmpty: true }, (row, r) => {
        const destRow = dest.getRow(r);
        if (row.height != null) destRow.height = row.height;
        row.eachCell({ includeEmpty: true }, (cell, c) => {
            destRow.getCell(c).style = { ...cell.style };
        });
    });

    // 데이터 영역(A~H) 값 비우기 (서식 유지)
    const grid = buildScheduleGrid(assignments, month);
    const lastRow = Math.max(source.rowCount, grid.length);
    for (let r = 1; r <= lastRow; r++) {
        for (let c = 1; c <= DATA_COLS; c++) {
            dest.getRow(r).getCell(c).value = null;
        }
    }
    // 그리드 기록 (빈 칸은 그대로 비움)
    grid.forEach((rowVals, ri) => {
        rowVals.forEach((val, ci) => {
            if (val !== '') dest.getRow(ri + 1).getCell(ci + 1).value = val;
        });
    });

    // 병합 복사 (값 기록 후 적용)
    const merges: string[] = source.model.merges ?? [];
    for (const range of merges) dest.mergeCells(range);

    return tabName;
}

/** 워크북을 .xlsx로 직렬화해 브라우저 다운로드를 트리거한다. */
export async function downloadWorkbook(wb: ExcelJS.Workbook, fileName: string): Promise<void> {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer as ArrayBuffer], {
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

> 참고: `import ExcelJS from 'exceljs'`로 `ExcelJS.Workbook`/`ExcelJS.CellValue` 타입을 쓴다. 만약 tsc가 `ExcelJS.Workbook`를 타입으로 인식하지 못하면 `import ExcelJS, { type Workbook, type CellValue } from 'exceljs'`로 바꿔 사용하고 본문의 `ExcelJS.Workbook`→`Workbook`, `ExcelJS.CellValue`→`CellValue`로 치환한다.

- [ ] **Step 5: `App.tsx`의 handleDownloadExcel 수정**

`src/App.tsx`에서 다음 한 줄
```ts
                const tab = appendScheduleSheet(wb, dayAssignments, selectedMonth);
```
을 아래로 바꾼다 (소스 탭명 전달):
```ts
                const tab = appendScheduleSheet(
                    wb,
                    excelScheduleConn.tabName,
                    dayAssignments,
                    selectedMonth
                );
```
그리고 같은 함수의
```ts
                downloadWorkbook(wb, fileName);
```
을 아래로 바꾼다 (async가 되었으므로 await):
```ts
                await downloadWorkbook(wb, fileName);
```
(이 코드는 이미 `void (async () => { ... })()` 안에 있으므로 `await` 사용 가능. 다른 곳은 수정 불필요 — `readWorkbook`/`sheetToRows`는 시그니처 동일.)

- [ ] **Step 6: 검증**

Run: `npx vitest run src/lib/__tests__/excelWorkbook.test.ts` (필요시 `rtk proxy`)
Expected: 7개 PASS

Run: `npx tsc -b`
Expected: exit 0. (만약 `ExcelJS.Workbook` 타입 에러면 Step 4 참고의 named import로 전환.)

Run: `npx eslint src/lib/excelWorkbook.ts src/App.tsx`
Expected: exit 0

- [ ] **Step 7: 커밋**

```bash
git add package.json package-lock.json src/lib/excelWorkbook.ts src/lib/__tests__/excelWorkbook.test.ts src/App.tsx
git commit -m "feat(excel): 엑셀 출력을 ExcelJS로 전환해 서식 보존

업로드한 스케줄 탭을 서식째 복제해 새 시트를 만들고 데이터 영역만 비운 뒤
생성 스케줄을 기록 — 색·테두리·병합·열너비가 유지됨

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 죽은 xlsx 코드 제거 + xlsx 의존성 제거

**Files:**
- Delete: `src/lib/excelExporter.ts`, `src/lib/__tests__/excelExporter.test.ts`
- Delete: `src/lib/excelParser.ts`, `src/lib/__tests__/excelParser.test.ts`
- Modify: `package.json` (xlsx 제거)

- [ ] **Step 1: 죽은 코드가 정말 안 쓰이는지 재확인**

Run: `grep -rn "excelExporter\|excelParser\|exportScheduleToExcel\|downloadExcel\|parseScheduleExcel" src --include="*.ts" --include="*.tsx" | grep -v "excelExporter\.\|excelParser\."`
Expected: 출력 없음 (어디서도 import/사용 안 함). 만약 사용처가 나오면 STOP 하고 보고.

- [ ] **Step 2: 파일 삭제**

```bash
git rm src/lib/excelExporter.ts src/lib/__tests__/excelExporter.test.ts src/lib/excelParser.ts src/lib/__tests__/excelParser.test.ts
```

- [ ] **Step 3: 남은 xlsx import 없는지 확인**

Run: `grep -rn "from 'xlsx'\|from \"xlsx\"" src --include="*.ts" --include="*.tsx"`
Expected: 출력 없음. (있으면 STOP — 해당 파일을 먼저 처리해야 함)

- [ ] **Step 4: xlsx 의존성 제거**

Run: `npm uninstall xlsx`
Expected: 제거 성공.

- [ ] **Step 5: 전체 검증**

Run: `npx tsc -b` → exit 0
Run: `npx vitest run` (필요시 `rtk proxy`) → 전체 PASS
Run: `npx eslint src` → exit 0 (또는 변경 파일 대상 린트)

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "chore(excel): 미사용 xlsx 코드 제거 및 의존성 정리

어디서도 쓰이지 않는 excelExporter·excelParser 삭제, xlsx 의존성 제거
(엑셀 처리는 exceljs 단일 라이브러리로 통일)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: CHANGELOG 갱신

**Files:**
- Modify: `frontend/CHANGELOG.md`

- [ ] **Step 1: 최신 버전 항목 추가**

`frontend/CHANGELOG.md` 맨 위가 `## v1.5.0 — 2026-06-15`이다. 그 위에 패치 항목을 추가한다(코드 용어 금지, 일상어):

```markdown
## v1.5.1 — 2026-06-15

- 엑셀로 내려받을 때 기존 시트의 서식(색·테두리·칸 너비 등)이 유지되도록 개선 — 입력한 스케줄 탭을 그대로 복제해 채워 넣습니다
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/CHANGELOG.md
git commit -m "docs(changelog): v1.5.1 — 엑셀 다운로드 서식 유지 안내

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 완료 기준

- 엑셀 업로드 → 생성 → "📥 엑셀로 다운로드" 시, 입력한 스케줄 탭을 복제한 `YY.MM_생성` 시트가 **서식(색·테두리·병합·열너비) 유지**된 채 생성됨
- 데스크·실장·위생사 행은 비워지고, 날짜+원장 행과 진료실 행에 생성 결과가 들어감
- `npx tsc -b`, `npx vitest run`, `npx eslint` 모두 통과
- `xlsx` 의존성 제거, 엑셀 처리는 `exceljs` 단일
- (수동) 실제 파일로 다운로드해 서식 보존 확인 — ExcelJS 브라우저 번들이 Vite dev에서 정상 동작하는지 포함

## 알려진 리스크 (구현 중 확인)

- **ExcelJS 브라우저 번들/Vite**: 테스트(node)에서는 문제없으나, dev 런타임에서 node 내장모듈 관련 에러가 나면 `import ExcelJS from 'exceljs/dist/exceljs.min.js'`(+ 필요시 `// @ts-expect-error` 또는 d.ts) 로 전환한다. 자동 게이트(tsc/vitest/eslint)로는 잡히지 않으므로 수동 확인 필요.
- **ExcelJS 타입 import**: `ExcelJS.Workbook`가 타입으로 안 잡히면 named type import로 전환(Task 1 Step 4 참고).

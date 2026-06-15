# 엑셀 출력 ExcelJS 전환 (서식 보존) 설계

작성일: 2026-06-15

## 배경 / 목적

엑셀 업로드/다운로드 기능은 동작하지만, 사용하는 `xlsx`(SheetJS 커뮤니티판)가
셀 **서식 쓰기**를 지원하지 않아 다운로드본에서 색·테두리·병합이 모두 사라진다.
실사용에서 이 서식 손실이 크다는 피드백.

`exceljs`로 교체해 ① 업로드 워크북의 기존 시트 서식을 보존하고, ② **유저가 지정한
스케줄 탭을 서식째 복제**해 생성 스케줄을 써넣는다. 구글 흐름('기본틀' 탭 복제)과
동일한 결과를, 복제 대상만 유저 입력 탭으로 바꾼 것.

## 결정 사항 (확정)

- 라이브러리: `xlsx` → `exceljs`
- 복제 대상: 유저가 입력한 스케줄 탭(예 `26.07`). 별도 '기본틀'은 엑셀 파일에 없음.
- 앱이 관리하지 않는 행(데스크·실장·위생사)은 **비운다** (구글 '시트에 입력'과 동일).
  데이터 영역(A~H) 값을 비우고 생성 그리드를 써넣으며, 서식은 복제본 그대로 유지.
- `xlsx` 관련 죽은 코드(`excelExporter.ts`, `excelParser.ts` + 테스트)를 삭제하고
  의존성에서 `xlsx` 제거 → 엑셀 라이브러리는 `exceljs` 단일.

## 데이터 흐름

```
업로드 워크북 (ExcelJS로 load → 기존 시트 서식 보존)
  │
  ├ 생성(handleGenerate):
  │    지정 탭 → sheetToRows(cell.text, 0-based) → parseDoctorSchedule / parseLeaveRequests
  │    → planWeeklyOffDays → assignDailySchedule → 미리보기      (기존 로직 변경 없음)
  │
  └ 다운로드(handleDownloadExcel):
       1. 소스 탭(예 '26.07') 복제 → 새 시트 'YY.MM_생성'(중복 시 …2,3)
          - 열너비, 행높이, 각 셀 style(글꼴·채움·테두리·정렬·표시형식), 병합 범위 복사
       2. 새 시트의 데이터 영역(A~H) 값 비우기 (서식 유지)
       3. buildScheduleGrid(assignments, month) 결과를 A1부터 써넣기
       4. workbook.xlsx.writeBuffer() → Blob → .xlsx 다운로드
```

`parseDoctorSchedule` / `parseLeaveRequests` / `planWeeklyOffDays` /
`assignDailySchedule` / `buildScheduleGrid` / `scheduleGrid` 는 **변경 없음**.

## 변경/삭제 파일

### 재작성 `lib/excelWorkbook.ts` (ExcelJS 기반)

- `readWorkbook(file: File): Promise<ExcelJS.Workbook>` — `wb.xlsx.load(await file.arrayBuffer())`
- `listSheetNames(wb): string[]` — `wb.worksheets.map((ws) => ws.name)`
- `sheetToRows(wb, tabName): unknown[][]` — 지정 워크시트를 0-based 행 배열로.
  각 셀은 `cell.text`(표시 문자열)로 추출해 기존 파서 입력 형식과 일치시킨다.
  ExcelJS의 1-based(행·열, 인덱스 0은 비어있음)를 0-based로 변환. 탭이 없으면
  `'<tabName>' 탭을 파일에서 찾을 수 없습니다` 에러.
- `appendScheduleSheet(wb, sourceTabName, assignments, month): string`
  - `pickTabName(listSheetNames(wb), 'YY.MM_생성')`로 새 이름 결정
  - 소스 워크시트를 새 시트로 **수동 복제**: 열너비(`col.width`), 행높이(`row.height`),
    각 셀 `style`, 병합 범위(`sourceWs.model.merges` → `dest.mergeCells(range)`)
  - 데이터 영역(열 A~H, 소스 사용 행 범위) 값 비우기(`cell.value = null`, style 유지)
  - `buildScheduleGrid` 결과를 행/열에 써넣기(값만; 비어있는 칸은 건드리지 않음)
  - 새 시트 이름 반환
- `downloadWorkbook(wb, fileName): Promise<void>` — `await wb.xlsx.writeBuffer()` → Blob → 앵커 클릭 → revokeObjectURL

### 수정 `App.tsx`

- `handleDownloadExcel`: `appendScheduleSheet(wb, excelScheduleConn.tabName, dayAssignments, selectedMonth)`로
  소스 탭명 전달. `downloadWorkbook`은 async가 되므로 기존 async IIFE 안에서 `await`.
- `handleGenerate`의 excel 분기: `readWorkbook`/`sheetToRows` 시그니처 동일(이미 await) → 흐름 변경 없음.

### 재작성 `lib/__tests__/excelWorkbook.test.ts` (ExcelJS 기반)

- `new ExcelJS.Workbook()`로 시트를 만들어 검증.
- `listSheetNames`, `sheetToRows`(text 추출·0-based·탭없음 에러·`parseDoctorSchedule` 왕복).
- `appendScheduleSheet`: 소스 시트에 채움색·열너비 등 서식을 준 뒤 복제 → 새 시트에
  **그 서식이 보존**되고, 데이터 영역에 그리드가 기록되며, 미관리 행은 비워지고,
  중복 시트명이면 번호가 붙는지 확인.

### 삭제

- `lib/excelExporter.ts` + `lib/__tests__/excelExporter.test.ts`
- `lib/excelParser.ts` + `lib/__tests__/excelParser.test.ts`
  (둘 다 어디서도 import되지 않는 죽은 코드)

### 의존성

- 추가: `exceljs`
- 제거: `xlsx` (위 삭제 후 잔여 사용처 없음 — 재확인 후 제거)

### 변경 없음

- `ExcelFileField.tsx`/`ExcelFilePicker.tsx` — 동일한 `readWorkbook`/`listSheetNames` 사용
- 파서·플래너·배정·`scheduleGrid`·`sheetWriter`(구글)

## 복제 방식 상세 (ExcelJS)

ExcelJS에는 안정적인 워크시트 딥클론 내장 함수가 없으므로 **수동 복사**한다:

1. 열너비: `sourceWs.columns` 길이만큼 `dest.getColumn(i).width = sourceWs.getColumn(i).width`
2. 행/셀: `sourceWs.eachRow({includeEmpty:true}, (row, r) => { dest.getRow(r).height = row.height;
   row.eachCell({includeEmpty:true}, (cell, c) => { dest.getRow(r).getCell(c).style = cell.style; }) })`
3. 병합: `(sourceWs.model.merges ?? []).forEach((range) => dest.mergeCells(range))`

보존 대상: 색(fill)·테두리(border)·글꼴(font)·정렬(alignment)·표시형식(numFmt)·병합·열너비·행높이.
미보존(스케줄 시트엔 해당 없음): 차트·이미지·일부 조건부서식·데이터유효성.

## 에러 처리 / 한계

- 탭 없음·파일 읽기 실패: 기존 메시지 유지(생성/다운로드 모두 try/catch).
- 브라우저 번들: ExcelJS는 브라우저에서 동작. Vite 번들에서 node 의존성 문제가 나면
  브라우저 빌드 경로 import 등으로 대응(구현 시 확인).
- 취소선(strikethrough) 휴무 무효화는 현행 엑셀 동작 유지(특수처리 없음).

## 테스트 / 검증

- `excelWorkbook.test.ts` 위 항목 통과
- 전체 `npx tsc -b`, `npx vitest run`, `npx eslint` 통과
- (수동) 실제 엑셀 업로드 → 생성 → 다운로드 시 서식이 보존되는지 확인

## 비목표 (YAGNI)

- 차트·이미지 등 ExcelJS가 라운드트립하지 못하는 고급 서식 보존
- 취소선 기반 휴무 무효화(엑셀 경로)
- 생성 시트의 데스크·실장·위생사 행 자동 채움 (비움 유지)

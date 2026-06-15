# 엑셀 파일 업로드/다운로드 설계

작성일: 2026-06-15

## 배경 / 목적

현재 메인 페이지의 입력 방식은 **구글 스프레드시트**만 동작한다. 엑셀 카드는
파일 업로드 UI만 있고 생성 버튼을 누르면 "🚧 준비 중"으로 막혀 있다.

구글 시트와 동일한 경험을 **로컬 엑셀(.xlsx) 파일**로도 제공한다.

- 스케줄 엑셀파일 + 휴무신청 엑셀파일(선택) 2개를 업로드
- 각 파일의 **탭(시트) 이름**을 사용자가 직접 입력
- 파싱 → 생성 → 미리보기는 기존 로직 그대로
- 미리보기 스케줄을 쓰고 싶으면: 구글은 "시트에 입력"으로 신규 탭 생성 →
  엑셀은 **업로드한 스케줄 워크북에 새 시트를 추가**해 .xlsx로 다운로드

## 접근 방식

구글 흐름과 **파서·그리드 생성 로직을 100% 공유**한다. 엑셀 전용으로는
"파일 ↔ 행 배열 변환 + 시트 추가/다운로드"라는 얇은 I/O 계층만 추가한다.
(엑셀 전용 파서를 따로 만드는 대안은 중복이라 배제.)

재사용 핵심:

- `parseDoctorSchedule(rows, month)` / `parseLeaveRequests(rows, month)` —
  입력이 `unknown[][]` 행 배열이라 엑셀에도 그대로 사용
- `planWeeklyOffDays` / `assignDailySchedule` — 변경 없음
- `buildScheduleGrid(assignments, month)` → `string[][]` — 시트/엑셀 공용 출력 그리드
- `AssignmentPreview` — 미리보기 변경 없음

## 데이터 흐름 (구글과 대칭)

```
엑셀 스케줄파일 + 탭이름 ─┐
                          ├─ XLSX 읽기 → 지정 탭 → unknown[][] 행
엑셀 휴무파일 + 탭이름(선택)┘
        │
        ├─ parseDoctorSchedule / parseLeaveRequests   ← 기존 재사용
        ├─ planWeeklyOffDays → assignDailySchedule     ← 기존 재사용
        └─ AssignmentPreview (미리보기)                 ← 기존 재사용
        │
   [엑셀로 다운로드] → buildScheduleGrid → 원본 워크북에 'YY.MM_생성' 시트 추가
                     → .xlsx 다운로드
```

## 변경/신규 파일

### 신규 `lib/scheduleGrid.ts` (리팩터)

워크북 무관 순수 함수를 `sheetWriter.ts`에서 이리로 이동해 구글·엑셀이 공용한다.

- `buildScheduleGrid(assignments, month): string[][]`
- `pickTabName(existingTitles, baseName): string`

`sheetWriter.ts`는 이 둘을 여기서 import 한다. (구글 API 호출 로직은 그대로 sheetWriter에 둠.)

### 신규 `lib/excelWorkbook.ts`

- `readWorkbook(file: File): Promise<XLSX.WorkBook>` — 업로드 파일을 워크북으로 읽음
- `sheetToRows(wb, tabName): unknown[][]` — 지정 탭을 행 배열로 (header:1, defval:'').
  탭이 없으면 에러를 던진다.
- `listSheetNames(wb): string[]` — 탭 존재 검사/중복명 계산용
- `appendScheduleSheet(wb, assignments, month): string` — `buildScheduleGrid`로 만든
  그리드를 `aoa_to_sheet`로 워크시트화하고, `pickTabName`으로 충돌 없는 이름
  (`YY.MM_생성`)을 정해 워크북에 추가. 추가된 시트명을 반환.
- `downloadWorkbook(wb, fileName): void` — 워크북을 array로 write → Blob → 다운로드

### 신규 `components/ExcelFilePicker.tsx` + `components/ExcelFileField.tsx`

`GoogleSheetPicker` / `SheetConnectionField`의 엑셀판.

- `ExcelFileField`: 파일 드롭(.xlsx) + 탭이름 입력 + "확인" 버튼.
  확인 시 워크북을 읽어 해당 탭 존재 여부를 검사하고 상태(연결됨/에러)를 표시한다.
- `ExcelFilePicker`: 스케줄 `ExcelFileField` + 휴무 `ExcelFileField`(선택)를 묶음.

#### 탭 이름 기억 (localStorage)

탭 이름은 매달 거의 동일하므로 마지막 입력값을 `localStorage`에 저장한다
(필드별 `storageKey`, 예: `excel-schedule-tab` / `excel-leave-tab`). 다음 방문 시
탭이름 입력칸을 자동으로 채운다. 단, 파일은 보안상 저장 불가하므로 **다시 업로드해야**
하고, 검사·연결은 파일을 올린 뒤 "확인"을 눌렀을 때 수행한다(자동 재연결 없음).
`SheetConnectionField`가 `{url, tabName}`을 저장하는 패턴의 엑셀판(`tabName`만 저장).

### 타입 (`types.ts`)

```ts
export type ExcelConnection = { file: File; tabName: string } | null;
```

### 변경 `components/InputMethodCard.tsx`

엑셀 카드 내용을 단일 `ExcelUploader` → `ExcelFilePicker`로 교체.
(기존 단일 `ExcelUploader`는 `ExcelFileField` 내부의 파일 드롭으로 대체)

### 변경 `App.tsx`

- 상태 추가: `excelScheduleConn: ExcelConnection`, `excelLeaveConn: ExcelConnection`
- `isReady`(excel): `excelScheduleConn !== null`
- `handleGenerate`: excel 분기 추가 — 각 파일의 탭에서 `sheetToRows`로 행을 읽어
  파서에 투입. 현재의 "🚧 준비 중" stub은 제거.
- 출력 버튼: excel일 때 "📥 엑셀로 다운로드" → `appendScheduleSheet` + `downloadWorkbook`.
  (구글일 때는 기존 "📝 시트에 입력" 유지)

## 출력 동작

- 업로드한 **스케줄 워크북에 새 시트 추가** 후 전체를 다운로드.
- 시트명 `YY.MM_생성` (중복 시 `…2`, `…3`).
- 파일명 `언제나이든치과_스케줄_YYYY_MM.xlsx`.

### 한계 (수용함)

`xlsx`(SheetJS 커뮤니티판)는 셀 **서식 쓰기를 지원하지 않는다.** 따라서 기존
시트의 색·테두리·병합 등 서식이 다운로드본에서 사라질 수 있다(값은 보존).
→ 엑셀 카드에 이 주의 문구를 함께 표시한다.

## 에러 처리

- 탭 없음(`sheetToRows`): `"'OOO' 탭을 파일에서 찾을 수 없습니다"`
- 파싱 결과 0건(날짜 행 인식 실패): `"스케줄을 읽지 못했어요. 탭 이름·양식을 확인해 주세요"`
- .xlsx 아님: 파일 드롭에서 차단(기존 `ExcelUploader` 로직 재사용)
- 다운로드 중 오류: 미리보기 영역에 빨간 메시지(구글 `writeMsg`와 동일 패턴)

## 테스트

- `excelWorkbook`:
  - `sheetToRows` — 탭 → 행 변환, 탭 없을 때 에러
  - `appendScheduleSheet` — 그리드 내용 반영, 중복 시트명 회피(`pickTabName`)
  - 읽기 → `parseDoctorSchedule` 왕복(워크북에 스케줄 탭을 만들고 행을 읽어 파싱 결과 검증)
- `scheduleGrid`: 기존 `sheetWriter.test.ts`의 `buildScheduleGrid`/`pickTabName` 테스트를
  이동·유지 (import 경로만 변경)

## 비목표 (YAGNI)

- 서식(색·테두리·병합) 보존 — 라이브러리 한계로 제외
- 엑셀 출력 파일에 휴무신청 시트 반영 — 출력은 스케줄 워크북에만

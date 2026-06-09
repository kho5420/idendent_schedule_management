# 생성 스케줄을 구글 시트에 입력 — 설계 스펙

- 작성일: 2026-06-09
- 상태: 승인됨 (구현 대기)

## 1. 목표

앱이 생성한 진료실 스케줄(`dayAssignments`)을 연결된 구글 스프레드시트에
**기존 스케줄 시트와 동일한 양식**으로 써넣는다. 사용자가 결과를 손으로 옮기지
않고 한 번에 실제 시트에 반영(또는 확인 후 반영)할 수 있게 한다.

## 2. 확정된 결정

| 항목 | 결정 |
|---|---|
| 입력 대상 | **새 탭** 생성 후 입력 (기존 탭은 절대 건드리지 않음) |
| 출력 양식 | 기존 스케줄 시트와 **동일한 5행 주(週) 블록** 구조 |
| 그룹 행(데스크·실장·위생사) | 앱이 모르는 데이터이므로 **빈 칸**으로 둠 (사용자가 직접 채움) |
| 새 탭 이름 | 기본 `26.07_생성` (= `YY.MM_생성`), 충돌 시 `_생성2`, `_생성3`… |
| 쓰기 권한 | 별도 작업 불필요 — 기존 OAuth scope가 `spreadsheets`(읽기/쓰기) |

## 3. 아키텍처

신규 모듈 **`frontend/src/lib/sheetWriter.ts`**. 그리드 생성(순수함수)과 API
호출(부수효과)을 분리해 그리드 로직만 단위테스트한다.

- `buildScheduleGrid(assignments: DayAssignment[], month: ScheduleMonth): string[][]`
  - 순수함수. `dayAssignments`를 기존 양식의 2차원 셀 배열로 변환.
  - 원장 정보는 `DayAssignment.doctorAliases` / `isFullAttendance` 사용(이미 존재).
  - 진료실 셀은 기존 `scheduleFormatter.formatDayCell` 재사용(미리보기와 동일).
  - 주 그룹핑은 `AssignmentPreview`의 `groupByWeek`(7열 월~일)와 동일 로직 →
    공통 함수로 추출해 양쪽이 공유.
- `resolveTabName(sheetId, token, baseName): Promise<string>`
  - 기존 탭 제목 목록을 읽어(GET `fields=sheets.properties.title`) 충돌 없는 이름 결정.
- `createTab(sheetId, token, tabName): Promise<void>`
  - POST `…/{sheetId}:batchUpdate` body `{requests:[{addSheet:{properties:{title}}}]}`.
- `writeGrid(sheetId, token, tabName, grid): Promise<void>`
  - PUT `…/{sheetId}/values/{tab}!A1?valueInputOption=RAW` body `{values: grid}`.
  - **RAW** 사용: `"7月"`, `"26.7.1"` 등을 문자열 그대로 보존(USER_ENTERED는 날짜로 해석).
- `writeScheduleToNewTab(sheetId, token, month, assignments): Promise<string>`
  - 위를 조합: 이름 결정 → 탭 생성 → 그리드 기록. 생성된 탭 이름 반환.

## 4. 그리드 양식 (기존 26.07 탭과 동일)

열: **A~G = 월·화·수·목·금·토·일** (인덱스 0~6).

```
행0: "7月"
행1: "26.7.1"
행2: " ~ 26.7.31"
행3: 월요일 | 화요일 | 수요일 | 목요일 | 금요일 | 토요일 | 일요일
[주(週)별 5행 블록 반복, 행4부터]
 블록행0 (날짜+원장):  "1 원장님 전체출근" | "2 오,신" | …
 블록행1~3 (그룹):     (빈 칸)
 블록행4 (진료실):     formatDayCell(assignment)  ← 주차/연차/주)야) 포함
```

- 날짜+원장 셀: `isFullAttendance ? "${일} 원장님 전체출근" : "${일} ${doctorAliases.join(',')}"`.
  원장 코드가 없으면(휴진 등) `"${일}"`만.
- 진료실 셀: `formatDayCell` 출력 그대로(야간분리 주)/야), `(인원수)`, `주차:…`,
  `연차:…`, `반차:…`). 전체휴진일은 `(0)` + `주차:전원`.
- 해당 칸에 진료일이 없으면(전월·익월 패딩, 빈 요일) 빈 문자열.

## 5. 동작 흐름 (UI)

- 미리보기(`AssignmentPreview`) 위 버튼 줄에 **"📝 시트에 입력"** 추가.
  `dayAssignments`가 있고 구글 시트로 연결된 경우에만 노출.
- 클릭 → 진행중 표시 → `writeScheduleToNewTab(...)` 호출 →
  성공 시 **"✅ '26.07_생성' 탭에 입력 완료"** 안내(토스트/배너).
- 탭명 충돌은 `resolveTabName`이 자동 처리(`_생성2`…). 기존 탭은 변경 없음.

## 6. 에러 처리

- **401**(토큰 만료): "구글 로그인이 만료됐어요. 다시 연결해 주세요".
- 그 외 API 오류: 상태 코드와 함께 사용자 메시지. 기존 탭/데이터 변경 없음.
- 탭 생성은 성공했으나 기록 실패: 메시지로 알리고, 생성된 빈 탭은 사용자가 삭제.

## 7. 테스트

- `buildScheduleGrid` 순수함수 단위테스트:
  - 헤더 4행(`7月`, 날짜 범위, 요일행) 정확성
  - 5행 블록 구조 — 날짜+원장 행 포맷, 그룹 3행 빈 칸, 진료실 행 = `formatDayCell`
  - 빈 칸(부분 주), 전체출근/휴진일 표기
- `resolveTabName`/`createTab`/`writeGrid`: 기존 `sheetsApi.test.ts`처럼 `fetch` 목킹
  으로 URL·본문·valueInputOption 검증.

## 8. 미해결 / 구현 시 확인

- **열 오프셋**: 샘플 xlsx는 A~G(월~일)이나, 기존 입력 파서(`parseDoctorSchedule`)는
  B~H(1~7열)를 읽는다. 실제 연결 시트가 앞에 빈 열을 둘 가능성이 있어, 구현 시
  실제 시트로 1회 확인한다. 시작 열을 상수로 두어 한 줄로 조정 가능하게 한다.
- 부분 주 패딩 셀(전월·익월)을 새 탭에 표시할지 여부 — 기본은 빈 칸(진료일 아님).

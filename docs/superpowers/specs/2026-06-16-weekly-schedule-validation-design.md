# 주별 스케줄 검증 (미리보기) 설계

작성일: 2026-06-16

## 배경 / 목적

스케줄 생성 후 미리보기에서 "제대로 짜였는지"를 사람이 일일이 눈으로 검증해야 한다.
각 주마다 규칙 위반을 자동으로 점검해 미리보기에 함께 보여주면, 사용자가 한눈에
이상 유무를 확인하고 재검증 수고를 덜 수 있다.

검증은 **화면 미리보기 전용**이다 (엑셀·구글 출력에는 넣지 않는다).

## 구조 / 데이터 흐름

```
App.handleGenerate (staff·scheduleSettings 보유)
  → validateSchedule(assignments, clinicStaff, scheduleSettings): WeekValidation[]
  → state 저장 → <AssignmentPreview assignments validations />
                    └ 각 주 <tr> 아래에 검증 결과 행 렌더
```

- **신규 `lib/scheduleValidator.ts`** — 순수 함수. 미리보기와 **동일하게 `groupAssignmentsByWeek`**
  로 주 단위 분할해, 주 순서와 같은 인덱스의 결과 배열을 반환한다.
- **`App.tsx`** — `handleGenerate`에서 이미 가진 `clinicStaff`(employee_type_id 6)·`scheduleSettings`로
  `validateSchedule` 호출 → `weekValidations` state 저장 → 미리보기에 전달. ('다시 섞기'·재생성 시 갱신)
- **`AssignmentPreview.tsx`** — 각 주 행 아래에 전체폭(`colSpan=7`) 검증 행 추가.

대부분의 판정 근거는 이미 `DayAssignment`에 있다(팀장 유무 `hasTeamLeader`, 교정 인원 `orthoStaffCount`/`isOrthoDay`,
야간 `hasNightShift`/`nightShiftStaff`/`nightFixedStaff`, 명시 휴무 `fullDayOff`). 추가로 `clinicStaff`(역할·career)와
`scheduleSettings`(최소 인원)만 사용한다.

## 타입

```ts
export type ValidationIssue = {
    severity: 'warn' | 'info';
    message: string; // 예: "목요일 5명 (최소 6)", "혜수 4일 근무"
};

export type WeekValidation = {
    weekLabel: string; // 예: "2주차" (미리보기 주 순서 기준)
    issues: ValidationIssue[]; // 비어 있으면 '이상 없음'
};
```

## 검사 항목 (주 단위)

직원 식별 키 = `alias ?? name` (DayAssignment.working의 이름과 동일 규칙).
요일 매핑 = `['일','월','화','수','목','금','토']` (dayOfWeek 기준).

### 1. 요일별 최소 인원

각 날(전체휴진·주말 휴진 제외)에서 출근수와 기준 비교.
- 기준 = 그날 `fullDayOff`(연차/주차)가 있으면 `min_staff_on_leave`,
  아니면 `isOrthoDay ? min_staff_with_ortho : min_staff_without_ortho`.
- 출근수(`working.length`) < 기준 → `warn`: "목요일 5명 (최소 6)".
- 야간분리일/전체출근일은 "휴무 제외 전원 출근"이라 인원 미달 개념이 약함 → 최소인원 검사 제외.

### 2. 개인별 5근무/2휴무 (보수적)

주의 출근 가능일(openDays = 그 주 비어있지 않은 날 수)이 **6 이상인 주에만** 적용(부분주 오탐 방지).
각 활성 직원(clinicStaff 중 `!is_on_leave`)에 대해:
- `workDays` = 그 주에 `working`에 포함된 날 수 (반차 포함 — 반차자도 working에 있음).
- `leaveDays` = 그 주 `fullDayOff`(연차+주차)에 포함된 날 수.
- 판정 (기준 근무일 = 5):
  - `workDays > 5` → `warn`: "혜수 6일 근무 (휴무 부족)".
  - `workDays < 5`: 부족분 `shortfall = 5 - workDays`.
    - `shortfall > leaveDays` → `warn`: "혜수 4일 근무".
    - `shortfall <= leaveDays` → `info`: "예진 연차 3일" (연차로 설명됨 — 경고 아님).
  - `workDays === 5` → 통과.

> 이 규칙은 평일고정·신규·전체휴진주를 모두 자연스럽게 포괄한다(모두 정상 시 주 5일 근무).

### 3. 일요일 팀장 1명 이상

일요일(dayOfWeek 0) 진료일에서 `hasTeamLeader === false` → `warn`: "일요일 팀장 미배정".

### 4. 신규 직원 일요일 미배정

일요일 진료일의 `working`에 career가 '신규'인 직원(키 매칭)이 있으면 → `warn`: "일요일 신규 배정: 서이".

### 5. 교정일 교정 인원 3명 이상

`isOrthoDay && orthoStaffCount < ORTHO_MIN(3)` → `warn`: "금요일 교정 2명 (최소 3)".

### 6. 야간 배정

`hasNightShift`인 날:
- `nightShiftStaff.length === 0` → `warn`: "수요일 야간 인원 없음".
- 그 외 야간 관련은 배정 로직이 보장하므로 추가 검사 없음(과검 방지).

## 표시 (문제 중심·항상 표시)

각 주 `<tr>` 아래 전체폭 행:
- `issues` 비어 있음 → 초록 "✅ N주차 이상 없음".
- `warn` 있음 → "⚠️ N주차" + warn 메시지들을 가운뎃점(·)으로 나열(빨강/주황).
- `info`는 회색으로 덧붙임(예: "연차 3일"). warn이 없고 info만 있으면 "✅ … (연차 안내)" 형태로 안내.

예) `⚠️ 3주차 · 목요일 5명(최소 6) · 혜수 4일 근무` / `✅ 2주차 이상 없음`

## 에러 처리 / 한계

- `staff`/`scheduleSettings`가 비어도 함수는 빈 issues로 안전 동작(검사 일부 생략).
- 부분주(openDays < 6)는 개인 균형 검사 생략 — 월 경계 오탐 방지.
- 검증은 참고용 안내일 뿐 생성/다운로드를 막지 않는다.

## 테스트

`scheduleValidator` 순수 함수 단위 테스트:
- 각 검사 항목 통과/실패 1쌍 이상 (최소인원 미달, 개인 4일 근무 경고, 연차로 설명되는 경우 info,
  일요일 팀장 없음, 일요일 신규 배정, 교정 2명, 야간 0명).
- 부분주 개인 균형 생략 확인.
- 이상 없는 주는 빈 issues 반환.

`AssignmentPreview`는 컴포넌트 테스트 없음(기존 관례) → `tsc`/`eslint` + 검증 함수 테스트로 커버.

## 비목표 (YAGNI)

- 엑셀·구글 출력에 검증 결과 기록
- 월 단위 검사(예: 일요일 월 2회 상한) — 주별 패널 범위 밖, 후속 가능
- 자동 수정/재배정 (검증은 안내만)

# 스케줄 설정 페이지 설계 (Schedule Settings Page)

**날짜**: 2026-06-07
**상태**: 승인됨

---

## 1. 목표

- 요일별로 "최소 필요 인원"과 "야간진료 여부"를 사용자가 직접 커스텀할 수 있는 전용 설정 화면 추가
- 추후 `scheduleGenerator.ts`(현재 빈 스텁)에서 자동 스케줄 생성 시 참조할 기준값을 DB에 저장
- 진료실 인원(현재 12명 기준)은 변동 가능하므로, 하드코딩 대신 화면에서 조정 가능하게 함

---

## 2. 라우팅

| 경로 | 컴포넌트 |
|------|----------|
| `/schedule-settings` | 스케줄 설정 페이지 (`ScheduleSettingsPage`) |

- 메인 헤더(`App.tsx`)에 "📅 스케줄 설정" 버튼 추가 → `/schedule-settings` 이동
- 기존 "업데이트" / "직원 설정" 버튼과 동일한 줄에 배치, `header-action-btn` 클래스를 재사용해 호버 효과 일관성 유지

---

## 3. DB 스키마

### schedule_setting 테이블 (신규)

요일 하나당 한 행을 갖는 구조 (`staff`, `employee_type`과 동일한 패턴).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | bigint PK | |
| `day_name` | varchar(10), 고유 | '월','화','수','목','금','토','일' |
| `sort_order` | integer | 1~7, 정렬 순서 (월=1 ... 일=7). `order by sort_order`로 항상 월~일 순서 보장 |
| `min_staff_with_ortho` | integer | 교정진료 있는 날 최소 인원 |
| `min_staff_without_ortho` | integer | 교정진료 없는 날 최소 인원 |
| `min_staff_on_leave` | integer | 휴무 상황용 최소 인원 (단일값, 교정 유무와 무관) |
| `has_night_shift` | boolean | 야간진료 여부 |
| `create_datetime` | timestamp | 생성일시 (읽기 전용, `now()` 기본값) |
| `modified_datetime` | timestamp | 수정일시 (읽기 전용, `now()` 기본값) |

- 테이블 생성 시 월~일 7개 행을 시드 데이터로 채워둔다 (적절한 기본값으로).
- "단일 현재값만 유지" — 별도 이력(history) 관리 없이 7행을 계속 갱신하는 구조.
- RLS 정책: `staff` 테이블처럼 `anon_all` (브라우저 전용 앱이므로 anon 권한으로 select/update 모두 허용).

---

## 4. 화면 디자인

`StaffSettingsPage`와 동일한 카드형 레이아웃 패턴을 따르되, 표(그리드) 형태로 7개 요일을 한 화면에 보여준다.

- **헤더 행**: 옅은 그린 톤 배경 + "요일 / 교정 있는 날 / 교정 없는 날 / 휴무 시 최소 / 야간진료" 컬럼 라벨
- **요일 행** (7개, 월~일):
  - 좌측에 작은 점(닷)으로 평일/주말 구분 표시
  - 토·일요일 행은 은은한 배경 톤(주황 계열)으로 시각적 그룹화
  - 최소 인원 3종(교정 있는 날 / 없는 날 / 휴무 시)은 카드형 스테퍼(`− 숫자 +`) 입력 — 0 미만으로 내려가지 않도록 제한
  - 야간진료는 토글 스위치 + "있음"/"없음" 라벨
- 카드 컨테이너는 `border-radius`, 옅은 그림자 등 기존 앱의 차분한 그린 테마와 통일

---

## 5. 컴포넌트 / 파일 구조

| 파일 | 역할 |
|------|------|
| `frontend/src/components/ScheduleSettingsPage.tsx` (신규) | 메인 화면 컴포넌트 — 로딩/에러 상태, 표 렌더링, 저장 버튼 |
| `frontend/src/lib/scheduleSettingApi.ts` (신규) | `fetchScheduleSettings()`, `updateScheduleSettings()` |
| `frontend/src/types.ts` (수정) | `ScheduleSetting`, `ScheduleSettingUpdateData` 타입 추가 |
| `frontend/src/App.tsx` (수정) | "📅 스케줄 설정" 헤더 버튼 + `/schedule-settings` 라우트 추가 |

---

## 6. 데이터 흐름 & 저장 동작

1. **로드 시**: `fetchScheduleSettings()`로 `sort_order` 순 7개 행을 가져와 화면에 표시 + "원본값"으로 보관
2. **수정 중**: 스테퍼/토글 조작은 로컬 상태만 변경 (즉시 저장하지 않음)
3. **저장**: 하단 "저장" 버튼 클릭 → 원본값과 달라진 행을 `updateScheduleSettings()`로 일괄 반영 → 성공 시 원본값을 현재 값으로 갱신, 완료 메시지 표시
4. **저장 버튼은 변경사항이 있을 때만 활성화** — 값이 바뀌지 않았으면 비활성 처리해 불필요한 요청 방지
5. 별도의 "취소" 버튼은 두지 않는다 — 저장하지 않고 페이지를 벗어나면 변경사항은 자연스럽게 사라짐

---

## 7. 에러 처리 / 검증

- **조회 실패**: `StaffSettingsPage`와 동일하게 "데이터를 불러오지 못했습니다." 메시지 표시
- **저장 실패**: 에러 메시지를 inline으로 표시하고 입력값은 유지해 재시도 가능하게 함
- **입력값 검증**: 최소 인원 값은 0 이상의 정수로 제한 (스테퍼가 음수로 내려가지 않도록 처리)
- **검증 방법**: `npx tsc --noEmit` (프로젝트 컨벤션상 빌드 확인은 생략)

---

## 8. 범위 밖 (Out of Scope)

- 자동 스케줄 생성 로직(`scheduleGenerator.ts`)과의 실제 연동 — 이번 작업은 설정값을 저장/관리하는 화면까지만 다룬다
- 휴무 데이터 자체의 연동 — "휴무 시 최소 인원"은 향후 휴무 기능과 연동될 기준값을 미리 세팅해두는 용도
- 설정 변경 이력(history) 관리

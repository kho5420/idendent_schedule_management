# 직원 설정 페이지 설계 (Staff Settings Page)

**날짜**: 2026-06-05  
**상태**: 승인됨

---

## 1. 목표

- localStorage 기반 직원 설정을 Supabase DB 기반으로 전환
- 기존 `StaffConfigModal` 을 제거하고 `/staff` 전용 페이지로 교체
- DB 컬럼이 늘어난 만큼 설정 항목을 체계적으로 관리

---

## 2. 라우팅

React Router v6 도입. 기존 단일 SPA에 라우터를 추가한다.

| 경로 | 컴포넌트 |
|------|----------|
| `/` | 기존 메인 앱 (`App`) |
| `/staff` | 직원 설정 페이지 (`StaffSettingsPage`) |

- `BrowserRouter` + `basename={import.meta.env.BASE_URL}` (GitHub Pages 대응)
- 메인 헤더의 "직원 설정" 버튼 → `/staff` 이동
- 직원 설정 페이지 상단 "← 메인" 버튼 → `/` 이동

---

## 3. DB 스키마

### staff 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | bigint PK | |
| `name` | varchar(50) | 이름 |
| `use_yn` | char(1) | 사용 여부 Y/N |
| `employee_type_id` | integer FK | employee_type.id |
| `career` | varchar(10) | 경력 수준: 고/중/저/신규 |
| `team_no` | smallint | 팀 번호 (nullable) |
| `is_ortho` | boolean | 교정과 여부 |
| `is_team_leader` | boolean | 팀장 여부 |
| `is_night_fixed` | boolean | 야간 고정 여부 |
| `is_weekday_fixed` | boolean | 평일 고정 여부 |
| `is_on_leave` | boolean | 휴직 여부 |
| `is_head_dentist_pick` | boolean | 대표원장 픽 여부 |
| `notes` | text | 메모 (nullable) |
| `create_datetime` | timestamp | 생성일시 (읽기 전용) |
| `modified_datetime` | timestamp | 수정일시 (읽기 전용) |

### employee_type 테이블 (읽기 전용)

| id | name |
|----|------|
| 1 | 대표원장 |
| 2 | 원장 |
| 3 | 매니저 |
| 4 | 데스크 |
| 5 | 기공실 |
| 6 | 진료실 |
| 7 | 알바 |

---

## 4. 페이지 구성

### 4-1. 직원 설정 페이지 (`/staff`)

**레이아웃**: 리스트 형태

- 상단: 페이지 제목 + "← 메인" 버튼 + "+ 직원 추가" 버튼
- 필터 칩: 전체 / 직원 유형별 / 휴직
- 리스트 행 (직원 1명당):
  - 체크박스 (일괄 선택용)
  - 아바타 (이름 첫 글자, 색상 구분)
  - 이름 + 직원 유형명
  - 경력 수준 (고/중/저/신규)
  - 팀 번호
  - 속성 뱃지: 교정·팀장·야간·평일·대표픽·휴직 해당하는 것만 표시
  - 휴직 직원: 흐리게(opacity) 처리
- 행 클릭(체크박스 영역 제외) → 개별 편집 모달 오픈
- "+ 추가" 버튼 → 빈 폼으로 개별 편집 모달 오픈
- **2명 이상 체크 시** 상단에 일괄 편집 툴바 노출 → "일괄 편집" 버튼 → 일괄 편집 모달 오픈

### 4-2. 개별 편집 모달

**헤더**: 이름을 input으로 직접 수정 가능

**기본 정보**
- 직원 유형 select (employee_type 목록)
- 경력 수준 select: 고 / 중 / 저 / 신규
- 팀 번호 select: 1팀 / 2팀 / 없음

**속성** (체크박스 2열 그리드)
- 교정과 / 팀장 / 야간고정 / 평일고정 / 대표원장픽 / 휴직 중

**메모**
- textarea (notes)

**액션 버튼**: `🗑 삭제` (빨간색, 왼쪽) / `취소` / `저장`
- 삭제 시 확인 다이얼로그 후 DB에서 제거

### 4-3. 일괄 편집 모달

- 상단에 선택된 직원 이름 목록 표시
- 적용할 항목을 체크박스로 선택 (미체크 항목은 변경하지 않음)
- 적용 가능 항목: 경력 수준 / 팀 번호 / 교정과 / 야간고정 / 평일고정 / 대표원장픽 / 휴직 중
- 각 항목: `[체크박스] 항목명 [값 select]` 형태, 체크 해제 시 select 비활성화
- **액션 버튼**: 취소 / 일괄 저장

---

## 5. 데이터 레이어

### 5-1. Supabase 클라이언트

- `@supabase/supabase-js` 패키지 설치
- `frontend/src/lib/supabaseClient.ts` 에 클라이언트 싱글톤 생성
- 접속 정보는 환경변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `frontend/.env` 에 값 추가 (gitignore 대상)

### 5-2. staffApi.ts

`frontend/src/lib/staffApi.ts` 신규 생성:

```
fetchStaff()              → staff 전체 목록 (use_yn 무관 모두)
fetchEmployeeTypes()      → employee_type 목록
updateStaff(id, data)     → 직원 정보 수정 (이름 포함)
createStaff(data)         → 직원 추가
deleteStaff(id)           → 직원 삭제
bulkUpdateStaff(ids, data) → 선택된 직원 일괄 수정 (지정 필드만)
```

- `staffConfig.ts` (localStorage)는 스케줄 생성 로직이 의존하므로 당장 제거하지 않음
- 직원 설정 페이지는 staffApi.ts 만 사용

### 5-3. 타입 정의

`types.ts` 에 추가:

```ts
export type EmployeeType = {
    id: number;
    name: string;
};

export type StaffRow = {
    id: number;
    name: string;
    use_yn: 'Y' | 'N';
    employee_type_id: number | null;
    career: '고' | '중' | '저' | '신규' | null;
    team_no: number | null;
    is_ortho: boolean;
    is_team_leader: boolean;
    is_night_fixed: boolean;
    is_weekday_fixed: boolean;
    is_on_leave: boolean;
    is_head_dentist_pick: boolean;
    notes: string | null;
};
```

---

## 6. 파일 변경 목록

| 파일 | 작업 |
|------|------|
| `package.json` | `react-router-dom`, `@supabase/supabase-js` 추가 |
| `main.tsx` | `BrowserRouter` 래핑 |
| `App.tsx` | 라우터 설정, 직원 설정 버튼 → navigate('/staff') |
| `types.ts` | `StaffRow`, `EmployeeType` 타입 추가 |
| `lib/supabaseClient.ts` | 신규 — Supabase 클라이언트 |
| `lib/staffApi.ts` | 신규 — DB CRUD 함수 |
| `components/StaffSettingsPage.tsx` | 신규 — 리스트 페이지 |
| `components/StaffEditModal.tsx` | 신규 — 개별 편집 모달 (이름 수정, 삭제 포함) |
| `components/StaffBulkEditModal.tsx` | 신규 — 일괄 편집 모달 |
| `components/StaffConfigModal.tsx` | 유지 (스케줄 생성 연동 전까지) |
| `frontend/.env` | Supabase 접속 정보 추가 |

---

## 7. 미결 사항

- 스케줄 생성 로직(`scheduleGenerator.ts`)의 직원 데이터 소스를 언제 DB로 전환할지 → 별도 작업으로 분리
- `staffConfig.ts` (localStorage) 제거 시점 → 스케줄 생성 연동 완료 후

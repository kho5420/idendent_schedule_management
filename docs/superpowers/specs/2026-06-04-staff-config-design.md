# 직원 설정 기능 설계

**날짜:** 2026-06-04  
**범위:** localStorage 기반 직원 목록 관리 UI

---

## 목표

사용자가 진료실 스텝 목록과 교정과 포함 여부를 앱 내에서 직접 추가/삭제/변경할 수 있도록 한다. 설정은 브라우저 localStorage에 저장되어 새로고침 후에도 유지된다.

---

## 데이터

### 타입 (`types.ts` 추가)

```ts
export type StaffMember = {
  name: string;
  isOrtho: boolean;
};

export type StaffConfig = {
  staff: StaffMember[];
};
```

### localStorage 키: `clinic_staff_config`

저장 형식: `JSON.stringify(StaffConfig)`

### 기본값

localStorage에 값이 없을 경우 아래 초기값 사용 (`base_data/진료실.md` 기준):

```ts
const DEFAULT_STAFF: StaffMember[] = [
  { name: '노이은',  isOrtho: false },
  { name: '강성민',  isOrtho: false },
  { name: '박민주',  isOrtho: false },
  { name: '김혜수',  isOrtho: true  },
  { name: '김윤정',  isOrtho: true  },
  { name: '하지수',  isOrtho: true  },
  { name: '최미연',  isOrtho: true  },
  { name: '차언경',  isOrtho: true  },
  { name: '강예진',  isOrtho: true  },
  { name: '김은경',  isOrtho: true  },
  { name: '전수현',  isOrtho: false },
  { name: '임서이',  isOrtho: false },
];
```

---

## 아키텍처

### 신규 파일

#### `src/lib/staffConfig.ts`
- `loadStaffConfig(): StaffConfig` — localStorage 읽기, 없으면 기본값 반환
- `saveStaffConfig(config: StaffConfig): void` — localStorage에 저장

#### `src/components/StaffConfigModal.tsx`
- Props: `isOpen`, `onClose`, `config`, `onChange`
- 직원 리스트 렌더링 (이름 + 교정과 체크박스 + 삭제 버튼)
- 이름 입력 + 추가 버튼
- 변경 즉시 `onChange` 호출 → 부모가 저장

### 변경 파일

#### `src/types.ts`
- `StaffMember`, `StaffConfig` 타입 추가

#### `src/App.tsx`
- 헤더 우측에 `⚙ 직원 설정` 버튼 추가
- `staffConfig` state + `isStaffModalOpen` state 추가
- 앱 초기화 시 `loadStaffConfig()` 호출
- `onChange` 핸들러에서 `saveStaffConfig()` 호출

---

## UI 상세

### 헤더
```
[언제나이든치과 뱃지]  진료실 스케줄 관리  [⚙ 직원 설정]
```
- `⚙ 직원 설정` 버튼: 우측 상단, 작은 보조 버튼 스타일

### 모달

- 오버레이(반투명 배경) + 중앙 카드
- max-height 80vh, overflow-y scroll (모바일 대응)
- 외부 클릭 또는 ✕ 버튼으로 닫기

**직원 행 레이아웃:**
```
[이름]          [교정과 □]  [✕]
```
- 교정과 체크박스 변경 즉시 저장
- ✕ 클릭 시 해당 직원 삭제 + 즉시 저장

**추가 영역 (모달 하단):**
```
[이름 입력____________]  [+ 추가]
```
- Enter 키로도 추가 가능
- 빈 이름 또는 중복 이름 입력 시 무시

---

## 제약 사항

- 저장 버튼 없음 — 모든 변경은 즉시 localStorage에 반영
- 직원이 0명이 되는 삭제는 허용 (사용자 책임)
- 이름 중복 체크: 동일 이름 추가 시 무시 (조용히 처리)

# Staff Sort Order — Design Spec

**Date:** 2026-06-05  
**Status:** Approved

## Goal

직원 목록을 유저가 원하는 순서로 배치할 수 있도록 drag & drop 재정렬 기능을 추가한다.
변경된 순서는 Supabase DB에 영구 저장된다.

---

## DB

`staff` 테이블에 `sort_order integer NOT NULL DEFAULT 0` 컬럼이 이미 추가되어 있다고 가정한다 (별도 마이그레이션 쿼리 실행 필요).

기존 직원 초기값 세팅 쿼리:
```sql
ALTER TABLE staff ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

UPDATE staff SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn FROM staff
) sub
WHERE staff.id = sub.id;
```

새 직원 추가 시: `createStaff()`에서 현재 최대 `sort_order + 1` 값을 자동 부여한다.

---

## 타입 변경 (`types.ts`)

```ts
export type StaffRow = {
  // 기존 필드들...
  sort_order: number;   // 추가
};

export type StaffUpdateData = Partial<Pick<StaffRow,
  // 기존 필드들...
  | 'sort_order'        // 추가
>>;
```

---

## API 변경 (`staffApi.ts`)

| 함수 | 변경 내용 |
|------|-----------|
| `fetchStaff()` | `.order('id')` → `.order('sort_order')` |
| `createStaff()` | 저장 전 `MAX(sort_order) + 1` 조회 후 `sort_order` 자동 설정 |
| `updateSortOrders(updates)` | 신규 추가. `{id, sort_order}[]` 배열을 받아 `Promise.all`로 병렬 update |

---

## UI 변경 (`StaffSettingsPage.tsx`)

### D&D 라이브러리
- **@dnd-kit/core** + **@dnd-kit/sortable** 사용
- 터치/포인터 이벤트 기반 → 모바일 지원

### 동작 조건
- 필터 = `'all'` 일 때만 D&D 활성화 (핸들 아이콘 ≡ 노출)
- 필터가 활성(직종별/휴직)인 경우 핸들 숨김, D&D 비활성

### D&D 핸들 위치
- 리스트 헤더/그리드의 맨 마지막 컬럼(현재 ›)을 D&D 핸들로 교체 (필터 = all일 때)
- 핸들: ≡ 아이콘, `cursor: grab`

### 업데이트 흐름
1. 드롭 완료 → `arrayMove()`로 로컬 상태 즉시 반영 (낙관적 업데이트)
2. 백그라운드에서 변경된 항목들만 `updateSortOrders()` 호출
3. 실패 시 `load()`로 서버 데이터 재조회

### 그리드 컬럼 변경
현재: `'20px 28px 1fr 50px 28px 1fr 16px'`  
변경: D&D 핸들 컬럼(24px)을 맨 앞 또는 맨 뒤에 추가

---

## 파일 수정 범위

| 파일 | 변경 |
|------|------|
| `types.ts` | `StaffRow`, `StaffUpdateData`에 `sort_order` 추가 |
| `lib/staffApi.ts` | `fetchStaff` 정렬 변경, `createStaff` 수정, `updateSortOrders` 추가 |
| `components/StaffSettingsPage.tsx` | dnd-kit 통합, D&D 핸들 렌더, 드롭 핸들러 |
| `package.json` | `@dnd-kit/core`, `@dnd-kit/sortable` 추가 |

---

## 제약 사항

- D&D는 "전체" 필터에서만 동작. 필터 중 재정렬 불가.
- 다중 선택(일괄 편집) 중에는 D&D 비활성화 (selectedIds.size > 0이면 핸들 숨김)

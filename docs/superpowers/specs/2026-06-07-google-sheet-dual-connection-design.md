# 구글 스프레드시트 2개 연결 UI 설계

## 배경

스케줄 생성을 위해서는 구글 스프레드시트 2개를 읽어야 한다.

1. **스케줄 시트** — 기존 스케줄 양식이 있는 시트 (현재 `GoogleSheetPicker`/`sheetsApi.ts`가 다루는 시트)
2. **휴무신청 시트** — 직원이 언제 휴가를 신청했는지 정보가 있는 시트. 스케줄 편성 시 이 정보를 기반으로 휴무를 반영해야 한다.

현재 `GoogleSheetPicker`는 로그인 후 시트 1개의 URL만 입력받는 구조이며, 연결 여부 표시도 모호하다 ("시트 ID: 1d4Wr03U...c..." 정도만 노출). 또한 사용자가 편집/조회할 **탭(시트 내 탭) 이름**을 직접 입력할 곳이 없다.

이번 설계의 범위는 **연결 UI까지**다. 휴무신청 시트의 실제 데이터 구조를 파싱하고 스케줄 생성 로직에 반영하는 작업은 별도 스펙으로 다룬다.

## 목표

- 사용자가 스케줄 시트와 휴무신청 시트, 두 개의 시트를 각각 URL + 탭 이름으로 입력할 수 있다
- 두 입력 영역이 용도(스케줄용 / 휴무신청용)를 명확히 구분해서 보인다
- "연결 완료" 여부를 실제 API 호출로 검증하고, 사용자가 한눈에 알 수 있게 상태를 표시한다
- 휴무신청 시트는 선택 사항이며, 스케줄 시트만 연결되어도 다음 단계(스케줄 생성)로 진행할 수 있다

## 화면 구성

기존 "구글 스프레드시트" 카드 안에서, 로그인 영역 아래로 두 개의 연결 섹션을 위아래로 배치한다.

```
📊 구글 스프레드시트  ✅ 로그인됨           [로그아웃]

┌─ 📅 스케줄 시트 ──────────────────────┐
│ [시트 URL 입력_______________] [확인]  │
│ [탭 이름 (예: 26.07)__________]        │
│ ✅ 연결됨 — 26.07 탭                   │
└────────────────────────────────────────┘

┌─ 🌴 휴무신청 시트 (선택) ──────────────┐
│ [시트 URL 입력_______________] [확인]  │
│ [탭 이름______________________]        │
│ ⬜ 아직 연결 안 됨                      │
└────────────────────────────────────────┘
```

- 각 섹션은 라벨(📅 스케줄 시트 / 🌴 휴무신청 시트)로 용도를 구분한다. 휴무신청 시트는 "(선택)"을 표기해 필수가 아님을 알린다
- 상태 배지는 4단계로 표현한다: `⬜ 미입력` → `⏳ 확인 중...` → `✅ 연결됨 — {탭이름} 탭` / `⚠️ {탭이름} 탭을 찾을 수 없음`
- 연결된 이후에도 URL/탭 이름 입력 필드는 그대로 남아있어 값을 수정할 수 있다. 값을 바꾸고 "확인"을 다시 누르면 재검증하며, 기존처럼 한 번 연결되면 입력이 잠기는 방식은 아니다
- 기존 "✏️ 쓰기 테스트" 버튼은 OAuth 쓰기 권한 검증용 임시 기능이었으므로 이번 작업에서 제거한다

## 컴포넌트 구조

연결 입력부(URL 입력 + 탭 이름 입력 + 확인 버튼 + 상태 배지)를 재사용 가능한 서브컴포넌트 **`SheetConnectionField`**로 분리하고, `GoogleSheetPicker` 내부에서 스케줄/휴무신청 두 곳에 사용한다.

- `GoogleSheetPicker`: 로그인/로그아웃, 토큰 발급·저장만 담당 (기존 역할 유지, 범위 축소)
- `SheetConnectionField`: URL 파싱 → 탭 이름 입력 → "확인" 버튼 클릭 시 API로 탭 존재 검증 → 상태 표시까지 독립적으로 처리

검증 로직을 한 곳에만 작성해 두 시트에 동일하게 적용함으로써 중복을 피하고, 서브컴포넌트 단위로 테스트하기 쉽게 한다.

```tsx
interface SheetConnectionFieldProps {
    label: string;            // "📅 스케줄 시트" / "🌴 휴무신청 시트 (선택)"
    token: string;
    placeholder: string;      // 탭 이름 입력란 placeholder
    value: SheetConnection;   // 현재 연결 정보 (null이면 미연결)
    onChange: (connection: SheetConnection) => void;
}
```

## 데이터 흐름 / 타입

`App.tsx`가 들고 있던 단일 `sheetId: string | null`을 시트 연결 정보 묶음 두 개로 교체한다.

```ts
// types.ts
export type SheetConnection = {
    sheetId: string;
    tabName: string;
} | null;  // null = 아직 연결 전
```

- `App.tsx`: `scheduleSheet: SheetConnection`, `leaveRequestSheet: SheetConnection` 두 state로 교체 (기존 `sheetId`/`onSheetIdChange` 제거)
- `isReady` 조건: `googleToken !== null && scheduleSheet !== null` — 휴무신청 시트는 선택사항이므로 조건에서 제외
- URL 파싱 결과, 입력 중 상태(확인 중 / 오류 메시지) 등은 `SheetConnectionField` 내부 로컬 state로만 관리한다. **검증에 성공했을 때만** `onChange`로 `{ sheetId, tabName }`을 상위에 전달하고, 실패 시에는 `null`을 전달한다 — `App`은 "확정된 연결 정보"만 알면 되고 중간 과정(로딩, 에러 메시지)은 몰라도 된다

`InputMethodCard`도 `sheetId`/`onSheetIdChange` props를 `scheduleSheet`/`onScheduleSheetChange`, `leaveRequestSheet`/`onLeaveRequestSheetChange`로 교체해 그대로 전달한다.

## 연결 확인 로직

`sheetsApi.ts`에 새 함수를 추가한다.

```ts
export async function checkSheetTab(sheetId: string, token: string, tabName: string): Promise<boolean>
```

- `GET /v4/spreadsheets/{sheetId}?fields=sheets.properties.title` 호출 — 셀 데이터 없이 탭 제목 목록만 가벼운 메타데이터로 조회한다
- 응답의 시트 제목 목록에 입력한 `tabName`이 포함되어 있으면 `true`를 반환한다
- API 오류(404, 403 등) 시 에러를 던지고, `SheetConnectionField`는 이를 받아 `⚠️ 연결 확인 중 오류가 발생했습니다` 메시지로 표시한다

`SheetConnectionField`의 흐름: URL 입력 → 탭 이름 입력 → "확인" 버튼 클릭 → `checkSheetTab` 호출 (`⏳ 확인 중...` 표시) → 성공 시 `✅ 연결됨 — {탭이름} 탭` 배지 표시 + 상위로 `{ sheetId, tabName }` 전달, 실패 시 `⚠️ {탭이름} 탭을 찾을 수 없음` 메시지 표시 + 상위로 `null` 전달

실제 셀 데이터 조회(`fetchSheetData` 등)는 연결 확인 단계에서 수행하지 않고, 스케줄 생성 시점에 별도로 호출한다 (기존 흐름 유지).

## 에러 처리

- URL 형식이 잘못된 경우: 기존처럼 클라이언트 단에서 정규식으로 검증 후 "올바른 구글 스프레드시트 URL이나 ID를 입력해주세요" 표시
- 탭 이름이 비어있는 채로 "확인"을 누른 경우: API 호출 없이 "탭 이름을 입력해주세요" 표시
- `checkSheetTab`이 `false`를 반환한 경우 (탭 없음): `⚠️ {탭이름} 탭을 찾을 수 없음`
- API 호출 자체가 실패한 경우 (네트워크 오류, 403 등): `⚠️ 연결 확인 중 오류가 발생했습니다`

## 테스트

- `sheetsApi.test.ts`에 `checkSheetTab` 테스트 추가: 응답에 탭 제목이 포함된 경우 `true`, 없는 경우 `false`, API 오류 시 예외를 던지는지 검증 (기존 `fetchSheetData` 테스트와 동일하게 `fetch`를 모킹)
- `SheetConnectionField`는 새로 추가하는 컴포넌트이므로, URL 파싱 → 확인 버튼 클릭 → 상태 배지 전환(미입력 → 확인 중 → 연결됨/오류) 흐름에 대한 컴포넌트 테스트를 추가한다

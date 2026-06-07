# 구글 스프레드시트 2개 연결 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구글 입력 방식에서 스케줄 시트와 휴무신청 시트, 두 개의 스프레드시트를 각각 URL+탭이름으로 입력받고 실제 API로 연결 상태를 검증·표시한다.

**Architecture:** 연결 입력부(URL+탭이름+확인버튼+상태배지)를 `SheetConnectionField` 컴포넌트로 분리해 두 시트에 재사용한다. `GoogleSheetPicker`는 로그인/토큰 관리만 담당하고, `App`은 `sheetId: string | null` 대신 `scheduleSheet`/`leaveRequestSheet: SheetConnection` 두 state를 관리한다.

**Tech Stack:** React 19 + TypeScript, Vitest (API 함수 테스트), Google Sheets API v4

参考 spec: `docs/superpowers/specs/2026-06-07-google-sheet-dual-connection-design.md`

---

## 사전 확인 사항

- 이 프로젝트는 `lib/` 함수만 Vitest로 테스트하고 React 컴포넌트 단위 테스트(`*.test.tsx`)는 작성하지 않는 컨벤션을 따른다 (`frontend/src/lib/__tests__/`에 6개 파일 존재, `components/__tests__/`는 없음). 이 계획도 동일한 컨벤션을 따라 `checkSheetTab`만 Vitest로 테스트하고, 컴포넌트 변경은 마지막 Task에서 브라우저로 직접 검증한다.
- 작업 전 `cd frontend` 로 이동해서 모든 명령을 실행한다.

## File Structure 개요

| 파일 | 변경 내용 |
|---|---|
| `frontend/src/types.ts` | `SheetConnection` 타입 추가 |
| `frontend/src/lib/sheetsApi.ts` | `checkSheetTab` 추가, 미사용 `updateSheetCell` 제거 |
| `frontend/src/lib/__tests__/sheetsApi.test.ts` | `checkSheetTab` 테스트 추가 |
| `frontend/src/components/SheetConnectionField.tsx` | 신규 — URL+탭이름 입력, 연결 확인, 상태 배지 |
| `frontend/src/components/GoogleSheetPicker.tsx` | 로그인 전용으로 축소, `SheetConnectionField` 2개 렌더 |
| `frontend/src/components/InputMethodCard.tsx` | `sheetId` → `scheduleSheet`/`leaveRequestSheet` props 교체 |
| `frontend/src/App.tsx` | `sheetId` state → `scheduleSheet`/`leaveRequestSheet`, `isReady` 조건 수정 |

---

### Task 1: `SheetConnection` 타입 추가

**Files:**
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: `InputMethod` 타입 바로 아래에 `SheetConnection` 타입 추가**

`frontend/src/types.ts`에서 `export type InputMethod = 'excel' | 'google';` 줄(3번째 줄) 바로 다음 빈 줄 뒤에 추가:

```ts
export type SheetConnection = {
    sheetId: string;
    tabName: string;
} | null;
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/types.ts
git commit -m "$(cat <<'EOF'
feat(types): 구글 시트 연결 정보 타입 추가

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `checkSheetTab` API 함수 추가 (TDD)

**Files:**
- Modify: `frontend/src/lib/sheetsApi.ts`
- Test: `frontend/src/lib/__tests__/sheetsApi.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/src/lib/__tests__/sheetsApi.test.ts` 맨 위 import 줄을 다음으로 교체:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSheetData, checkSheetTab } from '../sheetsApi';
```

파일 맨 끝(마지막 `});` 다음, 43번째 줄 이후)에 새 `describe` 블록 추가:

```ts

describe('checkSheetTab', () => {
    it('탭 제목 목록에 포함되어 있으면 true를 반환한다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                sheets: [{ properties: { title: '26.06' } }, { properties: { title: '26.07' } }],
            }),
        } as Response);

        const result = await checkSheetTab('sheet-id', 'token', '26.07');
        expect(result).toBe(true);
    });

    it('탭 제목 목록에 없으면 false를 반환한다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ sheets: [{ properties: { title: '26.06' } }] }),
        } as Response);

        const result = await checkSheetTab('sheet-id', 'token', '26.07');
        expect(result).toBe(false);
    });

    it('API 오류 시 에러를 던진다', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 403,
            json: async () => ({ error: { message: 'Forbidden' } }),
        } as Response);

        await expect(checkSheetTab('id', 'token', '26.07')).rejects.toThrow(
            'Google Sheets API 오류'
        );
    });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm test -- sheetsApi`
Expected: FAIL — `checkSheetTab` is not exported from `../sheetsApi` (또는 `is not a function`)

- [ ] **Step 3: `checkSheetTab` 구현**

`frontend/src/lib/sheetsApi.ts`에서 `export async function fetchSheetData(` 바로 위(44번째 줄 위)에 추가:

```ts
export async function checkSheetTab(sheetId: string, token: string, tabName: string): Promise<boolean> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`;

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        throw new Error(`Google Sheets API 오류 (${res.status})`);
    }

    const data = await res.json();
    const sheets: Array<{ properties?: { title?: string } }> = data.sheets ?? [];
    return sheets.some((sheet) => sheet.properties?.title === tabName);
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm test -- sheetsApi`
Expected: PASS — 6개 테스트 모두 통과 (`fetchSheetData` 2개 + `checkSheetTab` 3개... 기존 파일 구조에 따라 갯수는 달라질 수 있으나 실패 없이 통과해야 함)

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/sheetsApi.ts frontend/src/lib/__tests__/sheetsApi.test.ts
git commit -m "$(cat <<'EOF'
feat(sheets): 시트 탭 존재 여부 확인 API 함수 추가

연결 UI에서 사용자가 입력한 탭 이름이 실제로 존재하는지
가벼운 메타데이터 조회로 검증할 수 있도록 함

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `SheetConnectionField` 컴포넌트 생성

**Files:**
- Create: `frontend/src/components/SheetConnectionField.tsx`

- [ ] **Step 1: 컴포넌트 파일 작성**

`frontend/src/components/SheetConnectionField.tsx` 새로 작성:

```tsx
import { useState } from 'react';
import { checkSheetTab } from '../lib/sheetsApi';
import type { SheetConnection } from '../types';

type Status = 'idle' | 'checking' | 'connected' | 'error';

interface Props {
    label: string;
    token: string;
    tabPlaceholder: string;
    onConnectionChange: (connection: SheetConnection) => void;
}

function extractSheetId(input: string): string | null {
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim();
    return null;
}

export function SheetConnectionField({ label, token, tabPlaceholder, onConnectionChange }: Props) {
    const [urlInput, setUrlInput] = useState('');
    const [tabNameInput, setTabNameInput] = useState('');
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState('');

    async function handleCheck() {
        const sheetId = extractSheetId(urlInput);
        if (!sheetId) {
            setStatus('error');
            setMessage('올바른 구글 스프레드시트 URL이나 ID를 입력해주세요.');
            onConnectionChange(null);
            return;
        }

        const tabName = tabNameInput.trim();
        if (!tabName) {
            setStatus('error');
            setMessage('탭 이름을 입력해주세요.');
            onConnectionChange(null);
            return;
        }

        setStatus('checking');
        setMessage('');
        try {
            const exists = await checkSheetTab(sheetId, token, tabName);
            if (exists) {
                setStatus('connected');
                setMessage(`연결됨 — ${tabName} 탭`);
                onConnectionChange({ sheetId, tabName });
            } else {
                setStatus('error');
                setMessage(`${tabName} 탭을 찾을 수 없습니다.`);
                onConnectionChange(null);
            }
        } catch (e) {
            setStatus('error');
            setMessage(e instanceof Error ? e.message : '연결 확인 중 오류가 발생했습니다.');
            onConnectionChange(null);
        }
    }

    const inputStyle = {
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border-hover)',
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: 13,
        color: 'var(--color-text)',
        width: '100%',
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: 12,
            }}
        >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{label}</div>
            <div style={{ display: 'flex', gap: 6 }}>
                <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="시트 URL 또는 ID 입력"
                    style={inputStyle}
                />
                <button
                    onClick={handleCheck}
                    disabled={status === 'checking'}
                    style={{
                        background: 'var(--color-border)',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 13,
                        color: 'var(--color-text)',
                        cursor: status === 'checking' ? 'default' : 'pointer',
                        opacity: status === 'checking' ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                    }}
                >
                    확인
                </button>
            </div>
            <input
                value={tabNameInput}
                onChange={(e) => setTabNameInput(e.target.value)}
                placeholder={tabPlaceholder}
                style={inputStyle}
            />
            <div
                style={{
                    fontSize: 12,
                    color:
                        status === 'connected'
                            ? 'var(--color-success)'
                            : status === 'error'
                              ? '#dc2626'
                              : 'var(--color-text-sub)',
                }}
            >
                {status === 'idle' && '⬜ 아직 연결 안 됨'}
                {status === 'checking' && '⏳ 확인 중...'}
                {status === 'connected' && `✅ ${message}`}
                {status === 'error' && `⚠️ ${message}`}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/components/SheetConnectionField.tsx
git commit -m "$(cat <<'EOF'
feat(sheets): 시트 URL+탭이름 연결 입력 컴포넌트 추가

URL 파싱, 탭 이름 입력, 확인 버튼 클릭 시 API로 탭 존재를
검증하고 상태 배지를 표시하는 로직을 재사용 가능한 단위로 분리

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `GoogleSheetPicker` 리팩터링 — 로그인 전용 + 두 개의 `SheetConnectionField`

**Files:**
- Modify: `frontend/src/components/GoogleSheetPicker.tsx`

- [ ] **Step 1: import 및 모듈 상단 정리**

`frontend/src/components/GoogleSheetPicker.tsx`의 1~5번째 줄을 다음으로 교체 (불필요한 `updateSheetCell` import, `TEST_CELL` 상수, `extractSheetId` 헬퍼 제거 — `extractSheetId`는 `SheetConnectionField`로 이동했음):

```tsx
import { useEffect, useState } from 'react';
import { SheetConnectionField } from './SheetConnectionField';
import type { SheetConnection } from '../types';

const TOKEN_KEY = 'google_access_token';
```

그리고 30~35번째 줄의 `function extractSheetId(...)` 함수 전체를 삭제한다 (이미 `SheetConnectionField.tsx`에 동일한 정의가 있음).

- [ ] **Step 2: `Props` 인터페이스 교체**

7~12번째 줄의 `interface Props { ... }`를 다음으로 교체:

```tsx
interface Props {
    token: string | null;
    onTokenChange: (token: string | null) => void;
    onScheduleSheetChange: (connection: SheetConnection) => void;
    onLeaveRequestSheetChange: (connection: SheetConnection) => void;
}
```

- [ ] **Step 3: 컴포넌트 함수 시그니처 및 내부 state 정리**

`export function GoogleSheetPicker({ token, sheetId, onTokenChange, onSheetIdChange }: Props) {` 줄을 다음으로 교체:

```tsx
export function GoogleSheetPicker({
    token,
    onTokenChange,
    onScheduleSheetChange,
    onLeaveRequestSheetChange,
}: Props) {
```

그 아래 state 선언부(`const [urlInput, ...` 부터 `const [testMessage, ...` 까지 5줄)를 다음으로 교체 — `comingSoon`만 로그인 버튼에서 계속 사용하므로 유지:

```tsx
    const [comingSoon, setComingSoon] = useState(false);
```

- [ ] **Step 4: `logout`에서 시트 연결 초기화 대상 변경**

`logout` 함수 내부의 `onSheetIdChange(null);`과 `setUrlInput('');` 두 줄을 다음으로 교체:

```tsx
        onScheduleSheetChange(null);
        onLeaveRequestSheetChange(null);
```

- [ ] **Step 5: `handleWriteTest`, `handleUrlSubmit` 함수 삭제**

`handleWriteTest`와 `handleUrlSubmit` 함수 정의(현재 76~99번째 줄 부근, `async function handleWriteTest() {` 부터 `}` 두 개로 끝나는 `handleUrlSubmit`까지) 전체를 삭제한다.

- [ ] **Step 6: 로그인 후 화면(return문 두 번째 블록) 교체**

`return (` 으로 시작하는 두 번째 반환문 전체(현재 139~226번째 줄, `<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>`부터 끝의 `</div>\n    );`까지)를 다음으로 교체:

```tsx
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--color-success)' }}>✅ 로그인됨</div>
                <button
                    onClick={logout}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 12,
                        color: 'var(--color-text-sub)',
                        cursor: 'pointer',
                    }}
                >
                    로그아웃
                </button>
            </div>
            <SheetConnectionField
                label="📅 스케줄 시트"
                token={token}
                tabPlaceholder="탭 이름 (예: 26.07)"
                onConnectionChange={onScheduleSheetChange}
            />
            <SheetConnectionField
                label="🌴 휴무신청 시트 (선택)"
                token={token}
                tabPlaceholder="탭 이름"
                onConnectionChange={onLeaveRequestSheetChange}
            />
        </div>
    );
}
```

- [ ] **Step 7: 변경 후 파일 전체를 다시 읽어 일관성 확인**

`frontend/src/components/GoogleSheetPicker.tsx`를 Read 도구로 다시 열어, `sheetId`/`onSheetIdChange`/`urlInput`/`urlError`/`testStatus`/`testMessage`/`updateSheetCell`/`TEST_CELL`/`extractSheetId` 참조가 전혀 남아있지 않은지 확인한다. 남아있다면 해당 줄을 제거한다.

- [ ] **Step 8: 커밋**

```bash
git add frontend/src/components/GoogleSheetPicker.tsx
git commit -m "$(cat <<'EOF'
refactor(sheets): GoogleSheetPicker를 로그인 전용으로 축소

시트 연결 입력은 SheetConnectionField로 위임하고,
검증용으로 추가했던 쓰기 테스트 버튼은 제거

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `sheetsApi.ts`에서 미사용 `updateSheetCell` 제거

**Files:**
- Modify: `frontend/src/lib/sheetsApi.ts`

- [ ] **Step 1: 사용처가 없는지 확인**

Run: `grep -rn "updateSheetCell" frontend/src --include="*.ts" --include="*.tsx"`
Expected: `frontend/src/lib/sheetsApi.ts`의 정의 한 곳만 출력됨 (Task 4에서 `GoogleSheetPicker`의 호출부를 제거했으므로)

- [ ] **Step 2: `updateSheetCell` 함수 삭제**

`frontend/src/lib/sheetsApi.ts`의 21~42번째 줄, `export async function updateSheetCell(` 부터 그 함수의 닫는 `}` 까지 전체를 삭제한다.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/lib/sheetsApi.ts
git commit -m "$(cat <<'EOF'
chore(sheets): 미사용 쓰기 테스트용 함수 제거

OAuth 쓰기 권한 검증을 위해 임시로 추가했던 updateSheetCell이
연결 UI 개편으로 더 이상 쓰이지 않아 정리

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `InputMethodCard` props를 두 시트 연결 정보로 교체

**Files:**
- Modify: `frontend/src/components/InputMethodCard.tsx`

- [ ] **Step 1: import에 `SheetConnection` 타입 추가**

1번째 줄을 다음으로 교체:

```tsx
import type { InputMethod, SheetConnection } from '../types';
```

- [ ] **Step 2: `Props` 인터페이스의 시트 관련 필드 교체**

8~9번째 줄(`googleToken: string | null;` / `sheetId: string | null;`)과 14번째 줄(`onSheetIdChange: (id: string | null) => void;`)을 다음으로 교체:

```tsx
    googleToken: string | null;
    scheduleSheet: SheetConnection;
    leaveRequestSheet: SheetConnection;
```

```tsx
    onScheduleSheetChange: (connection: SheetConnection) => void;
    onLeaveRequestSheetChange: (connection: SheetConnection) => void;
```

(즉 `sheetId`/`onSheetIdChange` 줄을 제거하고 위 4개 필드로 교체한다 — `onScheduleSheetChange`/`onLeaveRequestSheetChange`는 `onSheetIdChange`가 있던 자리에 추가)

- [ ] **Step 3: 함수 매개변수 구조분해 교체**

62~63번째 줄(`googleToken,` / `sheetId,`)과 68번째 줄(`onSheetIdChange,`)을 다음으로 교체:

```tsx
    googleToken,
    scheduleSheet,
    leaveRequestSheet,
```

```tsx
    onScheduleSheetChange,
    onLeaveRequestSheetChange,
```

- [ ] **Step 4: `GoogleSheetPicker`에 전달하는 props 교체**

93~96번째 줄을 다음으로 교체:

```tsx
                <GoogleSheetPicker
                    token={googleToken}
                    onTokenChange={onTokenChange}
                    onScheduleSheetChange={onScheduleSheetChange}
                    onLeaveRequestSheetChange={onLeaveRequestSheetChange}
                />
```

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/components/InputMethodCard.tsx
git commit -m "$(cat <<'EOF'
refactor(sheets): InputMethodCard가 시트 2개 연결 정보를 전달하도록 변경

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `App.tsx` state 및 `isReady` 조건 업데이트

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: import에 `SheetConnection` 타입 추가**

3번째 줄을 다음으로 교체:

```tsx
import type { ScheduleMonth, InputMethod, GeneratedSchedule, SheetConnection } from './types';
```

- [ ] **Step 2: `sheetId` state를 두 개의 시트 연결 state로 교체**

26번째 줄 `const [sheetId, setSheetId] = useState<string | null>(null);`을 다음으로 교체:

```tsx
    const [scheduleSheet, setScheduleSheet] = useState<SheetConnection>(null);
    const [leaveRequestSheet, setLeaveRequestSheet] = useState<SheetConnection>(null);
```

- [ ] **Step 3: `isReady` 조건에서 `sheetId`를 `scheduleSheet`로 교체**

38번째 줄 `? googleToken !== null && sheetId !== null`을 다음으로 교체:

```tsx
              ? googleToken !== null && scheduleSheet !== null
```

- [ ] **Step 4: `InputMethodCard`에 전달하는 props 교체**

179번째 줄 `sheetId={sheetId}`와 184번째 줄 `onSheetIdChange={setSheetId}`를 다음으로 교체:

```tsx
                scheduleSheet={scheduleSheet}
                leaveRequestSheet={leaveRequestSheet}
```

```tsx
                onScheduleSheetChange={setScheduleSheet}
                onLeaveRequestSheetChange={setLeaveRequestSheet}
```

(두 줄이 들어갈 위치는 각각 기존 `sheetId={sheetId}` 자리와 `onSheetIdChange={setSheetId}` 자리이며, `InputMethodCard`의 `Props` 순서와 맞출 필요는 없으나 가독성을 위해 `googleToken`/`onTokenChange` 인접 위치에 둔다)

- [ ] **Step 5: 타입 체크로 누락된 참조 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (만약 `sheetId`/`onSheetIdChange` 관련 타입 에러가 남아있다면 Task 4~7에서 빠뜨린 수정 위치가 있다는 뜻이므로 해당 파일을 다시 확인한다)

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/App.tsx
git commit -m "$(cat <<'EOF'
refactor(sheets): App이 스케줄/휴무신청 시트 연결 정보를 분리 관리

단일 sheetId 대신 두 개의 SheetConnection state로 교체하고
구글 입력 방식의 준비 완료 조건을 스케줄 시트 연결 여부로 판단

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 브라우저에서 동작 확인

**Files:** (변경 없음 — 수동 검증)

- [ ] **Step 1: 개발 서버 실행**

Run: `npm run dev` (frontend 디렉터리에서)

- [ ] **Step 2: 로그인 및 화면 구조 확인**

브라우저에서 메인 화면 → "구글" 입력 방식 선택 → 로그인. 로그인 후 "📅 스케줄 시트"와 "🌴 휴무신청 시트 (선택)" 두 섹션이 위아래로 나란히 보이는지 확인한다. 각 섹션에 URL 입력창, 탭 이름 입력창, 확인 버튼, `⬜ 아직 연결 안 됨` 상태 문구가 보여야 한다.

- [ ] **Step 3: 정상 연결 시나리오 확인**

실제 존재하는 스프레드시트 URL과 탭 이름(예: `26.07`)을 "스케줄 시트" 영역에 입력하고 "확인" 클릭. `⏳ 확인 중...` → `✅ 연결됨 — 26.07 탭`으로 바뀌는지 확인한다.

- [ ] **Step 4: 오류 시나리오 확인**

같은 시트 URL에 존재하지 않는 탭 이름(예: `존재안함`)을 입력하고 "확인" 클릭. `⚠️ 존재안함 탭을 찾을 수 없습니다.` 메시지가 보이는지 확인한다. 이어서 탭 이름을 비운 채 "확인"을 누르면 `⚠️ 탭 이름을 입력해주세요.`가 보이는지 확인한다.

- [ ] **Step 5: "휴무신청 시트" 섹션과 생성 버튼 동작 확인**

"휴무신청 시트" 영역은 비워둔 채로, "스케줄 시트"만 연결된 상태에서 "생성하기" 버튼이 활성화되는지 확인한다 (휴무신청 시트는 선택사항이므로 비어 있어도 진행 가능해야 함).

- [ ] **Step 6: 로그아웃 후 초기화 확인**

"로그아웃" 클릭 후 다시 로그인했을 때, 이전에 입력했던 URL/탭이름/연결 상태가 모두 초기화되어 빈 입력창과 `⬜ 아직 연결 안 됨` 상태로 보이는지 확인한다.

- [ ] **Step 7: 전체 테스트 스위트 실행**

Run: `npm test`
Expected: 모든 테스트 PASS

---

## 완료 기준

- [ ] Task 1~7의 모든 커밋이 생성됨
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] `npm test` 전체 통과
- [ ] Task 8의 브라우저 검증 시나리오(정상 연결/오류/선택사항/로그아웃 초기화) 모두 확인됨

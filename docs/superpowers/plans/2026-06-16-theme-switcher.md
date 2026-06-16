# 테마 전환 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인 화면에 테마 선택 기능을 추가해 기본(그린 라이트) ↔ Spotify(다크) 테마를 전환·기억하게 한다.

**Architecture:** 색·형태를 CSS 디자인 토큰 변수로 통일하고, `<html>`의 `data-theme` 속성 하나로 전 화면을 전환한다. React `ThemeProvider` context가 상태의 단일 출처이며 localStorage(`app-theme`)에 저장·복원한다. `index.html` 인라인 스크립트가 첫 페인트 전 테마를 적용해 깜빡임(FOUC)을 막는다.

**Tech Stack:** React 19 + TypeScript(strict), Vite, CSS 커스텀 프로퍼티, Vitest(jsdom)

> 모든 명령은 `frontend/`에서 실행한다. 타입체크는 `npx tsc -b`, 테스트는 `npx vitest run`, 린트는 `npm run lint`.
> 참고 스펙: `docs/superpowers/specs/2026-06-16-theme-switcher-design.md`

---

## 파일 구조

- **신규** `frontend/src/lib/theme.ts` — 테마 정의(타입·`THEMES` 배열)와 localStorage/DOM 헬퍼. 순수 로직 + DOM 적용 한 함수.
- **신규** `frontend/src/lib/__tests__/theme.test.ts` — `theme.ts` 단위 테스트.
- **신규** `frontend/src/components/ThemeProvider.tsx` — context로 `{ theme, setTheme }` 제공, 마운트 복원·변경 적용.
- **신규** `frontend/src/components/ThemePanel.tsx` — 테마 선택 패널(모달 패턴 재사용).
- **수정** `frontend/src/index.css` — 형태 토큰 추가 + `[data-theme="spotify"]` 오버라이드 + 공유 클래스 토큰화 + body 폰트 토큰화.
- **수정** `frontend/index.html` — FOUC 방지 인라인 스크립트.
- **수정** `frontend/src/main.tsx` — `<ThemeProvider>`로 `<App/>` 래핑.
- **수정** `frontend/src/App.tsx` — 헤더에 🎨 버튼 + `ThemePanel` 연결.
- **수정** `frontend/src/components/GenerateButton.tsx` — 인라인 형태 값 토큰화.

---

## Task 1: 테마 모듈 `lib/theme.ts` (TDD)

**Files:**
- Create: `frontend/src/lib/theme.ts`
- Test: `frontend/src/lib/__tests__/theme.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`frontend/src/lib/__tests__/theme.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { THEMES, loadTheme, saveTheme, applyTheme } from '../theme';

describe('theme', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    });

    it('THEMES에 기본과 spotify가 포함된다', () => {
        const ids = THEMES.map((t) => t.id);
        expect(ids).toContain('default');
        expect(ids).toContain('spotify');
    });

    it('저장한 테마를 그대로 복원한다', () => {
        saveTheme('spotify');
        expect(loadTheme()).toBe('spotify');
    });

    it('저장값이 없으면 default를 반환한다', () => {
        expect(loadTheme()).toBe('default');
    });

    it('잘못된 저장값이면 default로 폴백한다', () => {
        localStorage.setItem('app-theme', 'banana');
        expect(loadTheme()).toBe('default');
    });

    it('applyTheme가 html의 data-theme을 설정한다', () => {
        applyTheme('spotify');
        expect(document.documentElement.dataset.theme).toBe('spotify');
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/lib/__tests__/theme.test.ts`
Expected: FAIL — `../theme` 모듈/내보내기 없음.

- [ ] **Step 3: 최소 구현 작성**

`frontend/src/lib/theme.ts`:

```ts
export type ThemeId = 'default' | 'spotify';

export interface ThemeMeta {
    id: ThemeId;
    label: string;
    /** 패널 미리보기 스와치 (배경, 카드/표면, 강조색) */
    swatch: [string, string, string];
}

export const THEMES: ThemeMeta[] = [
    { id: 'default', label: '기본', swatch: ['#f0fdf4', '#ffffff', '#16a34a'] },
    { id: 'spotify', label: 'Spotify', swatch: ['#121212', '#181818', '#1ed760'] },
];

const STORAGE_KEY = 'app-theme';

function isThemeId(value: string | null): value is ThemeId {
    return value !== null && THEMES.some((t) => t.id === value);
}

export function loadTheme(): ThemeId {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return isThemeId(stored) ? stored : 'default';
    } catch {
        return 'default';
    }
}

export function saveTheme(id: ThemeId): void {
    try {
        localStorage.setItem(STORAGE_KEY, id);
    } catch {
        // localStorage 불가 환경은 무시 (세션 한정 동작)
    }
}

export function applyTheme(id: ThemeId): void {
    document.documentElement.dataset.theme = id;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/__tests__/theme.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/theme.ts frontend/src/lib/__tests__/theme.test.ts
git commit -m "feat(theme): 테마 정의·저장·적용 모듈 추가"
```

---

## Task 2: CSS 디자인 토큰 + Spotify 테마 블록

**Files:**
- Modify: `frontend/src/index.css:3-23` (`:root` + `body`), 그리고 공유 클래스들

> CSS는 자동 테스트가 어렵다. 검증은 타입체크·린트 + Task 6 이후 개발 서버 육안 확인으로 한다. 기본 테마의 시각적 결과는 변경 전후 동일해야 한다(회귀 금지).

- [ ] **Step 1: `:root`에 형태 토큰 추가**

`frontend/src/index.css`의 `:root` 블록(현재 색상 변수들 아래)에 토큰을 추가한다. 기존 색상 변수는 그대로 둔다.

```css
:root {
    --color-bg: #f0fdf4;
    --color-card: #ffffff;
    --color-border: #86efac;
    --color-border-hover: #4ade80;
    --color-accent-from: #4ade80;
    --color-accent-to: #16a34a;
    --color-text: #14532d;
    --color-text-sub: #166534;
    --color-success: #16a34a;
    --color-tag-bg: #dcfce7;
    --color-tag-text: #166534;

    /* 형태 토큰 (테마별로 덮어씀) */
    --radius-btn: 10px;
    --radius-card: 16px;
    --radius-chip: 8px;
    --shadow-card: none;
    --btn-transform: none;
    --btn-tracking: normal;
    --font-ui: 'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, sans-serif;
}
```

- [ ] **Step 2: `body` 폰트를 토큰 참조로 교체**

`index.css`의 `body` 규칙에서 `font-family` 한 줄을 토큰 참조로 바꾼다.

```css
body {
    background-color: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-ui);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 3: Spotify 테마 오버라이드 블록 추가**

`body` 규칙 바로 아래에 추가한다. CircularSp 전용 폰트는 비공개라 폴백 스택 + 한글용 Pretendard/Noto를 뒤에 둔다.

```css
[data-theme='spotify'] {
    --color-bg: #121212;
    --color-card: #181818;
    --color-border: #4d4d4d;
    --color-border-hover: #7c7c7c;
    --color-accent-from: #1ed760;
    --color-accent-to: #1ed760;
    --color-text: #ffffff;
    --color-text-sub: #b3b3b3;
    --color-success: #1ed760;
    --color-tag-bg: #1f1f1f;
    --color-tag-text: #b3b3b3;

    --radius-btn: 9999px;
    --radius-card: 8px;
    --radius-chip: 9999px;
    --shadow-card: rgba(0, 0, 0, 0.5) 0px 8px 24px;
    --btn-transform: uppercase;
    --btn-tracking: 1.4px;
    --font-ui: 'Helvetica Neue', helvetica, arial, 'Hiragino Sans',
        'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, sans-serif;
}
```

- [ ] **Step 4: 공유 버튼/칩/카드 클래스에 형태 토큰 적용**

아래 4개 규칙에 형태 토큰을 추가한다. **기존 색상 속성은 유지**하고 명시된 속성만 추가/변경한다.

`.header-action-btn` 규칙(현재 색상만 있음)에 형태 3줄 추가:

```css
.header-action-btn {
    background-color: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-sub);
    border-radius: var(--radius-btn);
    text-transform: var(--btn-transform);
    letter-spacing: var(--btn-tracking);
    transition:
        border-color 0.15s ease,
        background-color 0.15s ease,
        color 0.15s ease;
}
```

> 주의: `App.tsx`의 헤더 버튼들은 인라인 `borderRadius: 8`을 갖고 있어 CSS보다 우선한다. Task 5에서 해당 인라인을 제거해 클래스 토큰이 적용되도록 한다.

`.staff-filter-chip` 규칙에 `border-radius: var(--radius-chip);` 한 줄 추가(기존 속성 유지).

`.schedule-setting-card` 규칙의 `border-radius: 16px;`를 `border-radius: var(--radius-card);`로 교체.

`.month-chip` 규칙에 `border-radius: var(--radius-chip);` 한 줄 추가(기존 속성 유지).

- [ ] **Step 5: 타입체크·린트로 회귀 확인**

Run: `npx tsc -b && npm run lint`
Expected: 통과(에러 0). CSS는 빌드 영향 없음. 시각 확인은 Task 6 이후.

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/index.css
git commit -m "feat(theme): 형태 디자인 토큰과 Spotify 테마 변수 추가"
```

---

## Task 3: FOUC 방지 스크립트 (`index.html`)

**Files:**
- Modify: `frontend/index.html` (`<head>` 내, 기존 경로 복원 스크립트 아래)

- [ ] **Step 1: 인라인 스크립트 추가**

`frontend/index.html`의 `<head>` 안, 기존 `(function () { var p = ... })();` 스크립트 블록 **다음 줄**에 새 `<script>`를 추가한다. theme.ts와 동일한 키(`app-theme`)·동일한 적용 방식(`data-theme` 속성)을 사용한다.

```html
    <script>
      // 첫 페인트 전에 저장된 테마를 적용해 깜빡임(FOUC) 방지
      (function () {
        try {
          var t = localStorage.getItem('app-theme');
          if (t === 'spotify') {
            document.documentElement.setAttribute('data-theme', t);
          }
        } catch (e) {}
      })();
    </script>
```

- [ ] **Step 2: 타입체크로 회귀 없음 확인**

Run: `npx tsc -b`
Expected: 통과(HTML은 영향 없음, 구문 오류만 없으면 됨).

- [ ] **Step 3: 커밋**

```bash
git add frontend/index.html
git commit -m "feat(theme): 새로고침 시 테마 깜빡임 방지 스크립트 추가"
```

---

## Task 4: `ThemeProvider` context + `main.tsx` 래핑

**Files:**
- Create: `frontend/src/components/ThemeProvider.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: ThemeProvider 작성**

`frontend/src/components/ThemeProvider.tsx`:

```tsx
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import { loadTheme, saveTheme, applyTheme, type ThemeId } from '../lib/theme';

interface ThemeContextValue {
    theme: ThemeId;
    setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeId>(loadTheme);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    function setTheme(id: ThemeId) {
        saveTheme(id);
        setThemeState(id);
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
```

- [ ] **Step 2: main.tsx에서 App을 ThemeProvider로 래핑**

`frontend/src/main.tsx`를 아래와 같이 수정한다(`ThemeProvider` import 추가, `<App/>`를 감쌈).

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { ThemeProvider } from './components/ThemeProvider';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </BrowserRouter>
    </StrictMode>
);
```

- [ ] **Step 3: 타입체크·린트 확인**

Run: `npx tsc -b && npm run lint`
Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/components/ThemeProvider.tsx frontend/src/main.tsx
git commit -m "feat(theme): ThemeProvider로 테마 상태 관리·적용"
```

---

## Task 5: `ThemePanel` + App 헤더 버튼 연결

**Files:**
- Create: `frontend/src/components/ThemePanel.tsx`
- Modify: `frontend/src/App.tsx` (헤더 버튼줄, 기존 ChangelogModal import 부근 및 state)

- [ ] **Step 1: ThemePanel 작성**

`frontend/src/components/ThemePanel.tsx` (ChangelogModal의 오버레이 패턴 재사용):

```tsx
import { THEMES } from '../lib/theme';
import { useTheme } from './ThemeProvider';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function ThemePanel({ isOpen, onClose }: Props) {
    const { theme, setTheme } = useTheme();
    if (!isOpen) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: 16,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border-hover)',
                    borderRadius: 'var(--radius-card)',
                    padding: 24,
                    width: '100%',
                    maxWidth: 360,
                    maxHeight: '80dvh',
                    overflowY: 'auto',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 20,
                    }}
                >
                    <span
                        style={{
                            fontWeight: 700,
                            fontSize: 15,
                            color: 'var(--color-text)',
                        }}
                    >
                        테마 선택
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-sub)',
                            fontSize: 18,
                            cursor: 'pointer',
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {THEMES.map((t) => {
                        const selected = t.id === theme;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setTheme(t.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '12px 14px',
                                    borderRadius: 12,
                                    cursor: 'pointer',
                                    background: 'var(--color-tag-bg)',
                                    border: selected
                                        ? '2px solid var(--color-accent-to)'
                                        : '1px solid var(--color-border)',
                                    color: 'var(--color-text)',
                                    textAlign: 'left',
                                }}
                            >
                                <span style={{ display: 'flex', gap: 3 }}>
                                    {t.swatch.map((c, i) => (
                                        <span
                                            key={i}
                                            style={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                background: c,
                                                border: '1px solid rgba(0,0,0,0.15)',
                                            }}
                                        />
                                    ))}
                                </span>
                                <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                                    {t.label}
                                </span>
                                {selected && (
                                    <span style={{ color: 'var(--color-accent-to)' }}>✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: App.tsx에 import·state 추가**

`frontend/src/App.tsx` 상단 import 목록에 추가:

```tsx
import { ThemePanel } from './components/ThemePanel';
```

`MainPage` 컴포넌트의 다른 `useState` 선언 부근(예: `isChangelogOpen` 옆)에 추가:

```tsx
const [isThemeOpen, setIsThemeOpen] = useState(false);
```

- [ ] **Step 3: 헤더에 🎨 버튼 추가 + 인라인 radius 제거**

`App.tsx` 헤더 버튼줄에서 "📅 스케줄 설정" 버튼 **다음**에 테마 버튼을 추가한다. 동시에 기존 3개 헤더 버튼의 인라인 `borderRadius: 8,`을 **삭제**한다(클래스의 `--radius-btn` 토큰이 적용되도록). 나머지 인라인(`padding`, `fontSize`, `cursor` 등)은 유지한다.

추가할 버튼:

```tsx
                    <button
                        onClick={() => setIsThemeOpen(true)}
                        className="header-action-btn"
                        style={{
                            padding: '6px 10px',
                            fontSize: 12,
                            cursor: 'pointer',
                        }}
                    >
                        🎨 테마
                    </button>
```

- [ ] **Step 4: 패널 렌더링 연결**

`App.tsx`에서 기존 `<ChangelogModal ... />`가 렌더되는 곳 근처에 추가한다:

```tsx
            <ThemePanel isOpen={isThemeOpen} onClose={() => setIsThemeOpen(false)} />
```

- [ ] **Step 5: 타입체크·린트 확인**

Run: `npx tsc -b && npm run lint`
Expected: 통과.

- [ ] **Step 6: 개발 서버로 육안 확인**

Run: `npm run dev` 후 브라우저에서 `🎨 테마` 클릭 → 패널 표시 → `Spotify` 선택 시 전 화면 다크 전환, 새로고침 후에도 유지, `기본` 선택 시 원복.
Expected: 헤더 버튼이 Spotify에서 알약형(라운드)으로 바뀌고 배경이 `#121212`로 전환됨.

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/components/ThemePanel.tsx frontend/src/App.tsx
git commit -m "feat(theme): 테마 선택 패널과 헤더 버튼 추가"
```

---

## Task 6: `GenerateButton` 형태 토큰화

**Files:**
- Modify: `frontend/src/components/GenerateButton.tsx`

> 메인 화면 1차 CTA. 인라인 `borderRadius`를 토큰으로 바꿔 Spotify에서 알약형이 되게 한다. 색상 그라데이션은 accent 변수가 둘 다 `#1ed760`이라 자동으로 플랫 그린이 된다.

- [ ] **Step 1: borderRadius 토큰화**

`GenerateButton.tsx`의 버튼 `style` 객체에서 `borderRadius: 10,`을 다음으로 교체:

```tsx
                borderRadius: 'var(--radius-btn)',
```

- [ ] **Step 2: 타입체크·린트 확인**

Run: `npx tsc -b && npm run lint`
Expected: 통과.

- [ ] **Step 3: 개발 서버 육안 확인**

Run: `npm run dev` — Spotify 테마에서 "스케줄 생성" 버튼이 알약형 + 플랫 그린, 기본 테마에서는 기존과 동일(라운드 10px + 그라데이션).
Expected: 두 테마 모두 정상.

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/components/GenerateButton.tsx
git commit -m "feat(theme): 스케줄 생성 버튼 형태를 테마 토큰으로 전환"
```

---

## Task 7: CHANGELOG 업데이트

**Files:**
- Modify: `frontend/CHANGELOG.md`

> 일반 사용자 노출 문서. 코드 용어 금지, 일상어로 작성.

- [ ] **Step 1: 새 버전 항목 추가**

`frontend/CHANGELOG.md` 최상단에 추가(버전 번호는 직전 버전에서 한 단계 올림, 날짜는 작업일):

```markdown
## vX.Y.Z — 2026-06-16

- 화면 테마를 고를 수 있는 기능이 생겼습니다. 상단 '🎨 테마' 버튼에서 기본 테마와 어두운 테마(Spotify 스타일) 중 선택할 수 있고, 선택한 테마는 다음에 다시 열 때도 유지됩니다.
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/CHANGELOG.md
git commit -m "docs(changelog): 테마 선택 기능 안내 추가"
```

---

## Self-Review 결과

**스펙 커버리지:**
- 기본↔Spotify 전환 → Task 1·2 (토큰/팔레트) + Task 5 (패널)
- 색상+형태 풀 재현 → Task 2 (형태 토큰), Task 5·6 (인라인 토큰화). 깊은 모달의 형태는 스펙대로 점진 적용/현상 유지 — 색상은 변수라 자동 전환됨.
- 전 화면 적용 → `[data-theme]`가 `<html>`에 걸려 전역 + 공유 클래스 토큰화(Task 2).
- 기억(localStorage) → Task 1 (`save/loadTheme`) + Task 4 (Provider).
- FOUC 방지 → Task 3.
- 확장성(N 테마) → `THEMES` 배열 기반 패널(Task 1·5).
- 테스트 → Task 1 단위 테스트(jsdom).
- 폰트 비공개 이슈 → Task 2에서 폴백 스택 + 한글 폰트 유지로 해결.

**플레이스홀더:** Task 7의 `vX.Y.Z`는 실행 시점 직전 버전 확인 후 채운다(의도된 변수, 단계에 명시).

**타입 일관성:** `ThemeId`, `THEMES`, `loadTheme/saveTheme/applyTheme`, `useTheme`, `ThemeProvider`, `ThemePanel`, localStorage 키 `app-theme`, 속성 `data-theme` — Task 1~5에서 동일 명칭으로 일관 사용 확인.

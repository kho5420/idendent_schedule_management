# 테마 전환 기능 설계

> 작성일: 2026-06-16

## 1. 목표

메인 화면에 테마 선택 기능을 추가한다. 사용자는 **기본 테마**(현재 그린 라이트
테마)와 **Spotify 테마**(`.claude/DESIGN-spotify.md` 기반 다크 테마) 중 선택할 수
있고, 선택은 다음 방문까지 유지된다.

- 충실도: **색상 + 형태까지 풀 재현** (다크 팔레트, 알약형 버튼, 대문자 라벨,
  무거운 그림자, CircularSp 폴백 폰트)
- 적용 범위: **전 화면** (메인 / 직원 설정 / 스케줄 설정 및 모든 모달)
- 기억: localStorage에 저장, 재방문·새로고침 시 복원
- 확장성: 테마를 배열로 정의해 항목 추가만으로 N개 테마 지원

## 2. 접근 방식

**디자인 토큰 CSS 변수 + `[data-theme]` 속성** 방식(브레인스토밍에서 채택한
접근법 1).

현재 코드는 색상 대부분이 `var(--color-*)` CSS 변수로 들어가 있어 색상 전환은
변수 교체만으로 거의 전 화면에 자동 반영된다. 다만 형태(`borderRadius`,
`fontSize`, 그라데이션 등)는 컴포넌트에 인라인으로 하드코딩되어 있어 CSS
셀렉터로 덮을 수 없다. 따라서 형태도 토큰 변수로 승격하고, 인라인 하드코딩
값을 토큰 참조로 교체한다.

검토했으나 채택하지 않은 대안:

- **React ThemeProvider + JS 스타일 객체**: 모든 컴포넌트를 context 소비형으로
  고쳐야 해 가장 침습적. 코드량·리렌더 증가.
- **`!important` 오버라이드 시트만 추가**: 인라인 전용(클래스 없는) 요소를 못
  잡고 `!important` 남발로 유지보수가 나빠짐.

## 3. 아키텍처

```
ThemeContext (React)  ──사용자 선택──▶  document.documentElement.dataset.theme = 'spotify'
        │                                          │
        └─ localStorage 'app-theme' 저장/복원        ▼
                                    index.css의 [data-theme="spotify"] { 토큰 덮어쓰기 }
                                                   │
                                  색상 + 형태 토큰 변수 ──▶ 전 컴포넌트 자동 전환
```

- 테마 상태의 단일 출처는 `ThemeContext`. 실제 적용은 오직 `<html>`의
  `data-theme` 속성 하나로 이뤄진다.
- 기본 테마는 `data-theme` 미설정(또는 `default`) 상태 = 현재 `:root` 값 그대로.
- **FOUC(첫 페인트 깜빡임) 방지**: `index.html`에 작은 인라인 스크립트를 두어
  React 마운트 전에 localStorage 값을 읽어 `data-theme`를 즉시 세팅한다.

## 4. 디자인 토큰

기존 `--color-*` 변수는 유지하고, 형태 토큰을 신규 추가한다. 기본 테마는 현재
값을 그대로 사용한다.

| 토큰 | 기본 | Spotify |
|------|------|---------|
| `--color-bg` | `#f0fdf4` | `#121212` |
| `--color-card` | `#ffffff` | `#181818` |
| `--color-border` | `#86efac` | `#4d4d4d` |
| `--color-border-hover` | `#4ade80` | `#7c7c7c` |
| `--color-text` | `#14532d` | `#ffffff` |
| `--color-text-sub` | `#166534` | `#b3b3b3` |
| `--color-accent-from` | `#4ade80` | `#1ed760` |
| `--color-accent-to` | `#16a34a` | `#1ed760` (= 플랫 그린) |
| `--color-success` | `#16a34a` | `#1ed760` |
| `--color-tag-bg` | `#dcfce7` | `#1f1f1f` |
| `--color-tag-text` | `#166534` | `#b3b3b3` |
| `--radius-btn` (신규) | `10px` | `9999px` |
| `--radius-card` (신규) | `16px` | `8px` |
| `--radius-chip` (신규) | `8px` | `9999px` |
| `--shadow-card` (신규) | `none` (현재 카드는 테두리 기반, 그림자 없음) | `rgba(0,0,0,.5) 0 8px 24px` |
| `--font-ui` (신규) | Pretendard 스택 | CircularSp 폴백 스택 |
| `--btn-transform` (신규) | `none` | `uppercase` |
| `--btn-tracking` (신규) | `normal` | `1.4px` |

### 폰트 주의

Spotify 전용 폰트(SpotifyMixUI/CircularSp)는 비공개라 사용할 수 없다. DESIGN
문서의 폴백 스택(`Helvetica Neue, helvetica, arial, Hiragino Sans, ...`)을
사용하고, 한글 렌더링을 위해 기존 `Pretendard`/`Noto Sans KR`을 폴백 뒤쪽에
유지한다.

### accent 그라데이션 처리

현재 버튼은 `linear-gradient(135deg, var(--color-accent-from),
var(--color-accent-to))`를 사용한다. Spotify에서 두 accent 변수를 동일한
`#1ed760`으로 두면 그라데이션이 자연스럽게 플랫 그린이 된다. 별도 분기 불필요.

## 5. 인라인 → 토큰 마이그레이션 범위

색상은 이미 대부분 변수라 자동 전환된다. **형태 토큰** 적용 대상(우선순위순):

1. **공유 CSS 클래스** (`.header-action-btn`, `.month-chip`,
   `.staff-filter-chip`, `.staff-row`, `.schedule-setting-card` 등): `index.css`
   에서 `border-radius`/`text-transform`/`letter-spacing`/`font-family`를 토큰
   참조로 교체 → 전 화면 즉시 반영.
2. **메인 화면 핵심 컴포넌트 인라인**: `GenerateButton`, 헤더 버튼들, 상단
   배지·제목 카드 → `borderRadius`·`background`·`fontFamily` 등을 토큰 참조로
   교체.
3. **깊은 모달**(`StaffEditModal` 등): 색상은 변수 기반이라 다크가 자동
   적용된다. 형태(둥근 정도)는 토큰으로 바꿀 수 있는 인라인만 점진 교체하고,
   효과 대비 작업량이 큰 나머지는 현 상태를 유지한다.

> 본 기능은 "동작 변경 없는 스타일 토큰화 + 신규 테마"이므로, 기본 테마의
> 시각적 결과는 마이그레이션 전후로 동일해야 한다(회귀 없음).

## 6. 테마 패널 UI

- 헤더 버튼줄(업데이트 / 직원 설정 / 스케줄 설정 옆)에 **🎨 키 아이콘 버튼**을
  `header-action-btn` 스타일로 추가한다.
- 클릭 시 작은 선택 패널(기존 모달 패턴 재사용)을 연다. 테마 카드 목록:
  - `기본` — 그린 미리보기 스와치
  - `Spotify` — 다크 + 그린 스와치
  - 현재 선택된 테마에 체크 표시. 카드 클릭 즉시 적용 + 저장.
- 확장성: 테마 목록을 `THEMES` 배열로 정의해, 항목 추가만으로 패널과 적용
  로직이 함께 늘어난다.

## 7. 컴포넌트/파일 구성

### 신규

- `lib/theme.ts`
  - `ThemeId = 'default' | 'spotify'` 타입
  - `THEMES: { id: ThemeId; label: string; swatch: string[] }[]` 정의
  - `loadTheme()` / `saveTheme(id)`: localStorage 읽기·쓰기 (`'app-theme'` 키),
    잘못된 값은 `'default'`로 폴백
  - `applyTheme(id)`: `document.documentElement.dataset.theme` 설정
- `components/ThemeProvider.tsx`
  - context로 `{ theme, setTheme }` 제공, 마운트 시 복원, 변경 시 적용+저장
- `components/ThemePanel.tsx`
  - 테마 카드 목록 패널(모달/드롭다운), 선택 UI

### 수정

- `index.css` — 형태 토큰 추가 + `[data-theme="spotify"]` 블록 + 공유 클래스
  형태 토큰화
- `index.html` — FOUC 방지 인라인 스크립트
- `main.tsx` — `<ThemeProvider>`로 `<App/>` 래핑
- `App.tsx` — 헤더에 키 아이콘 버튼 + `ThemePanel` 연결
- `GenerateButton.tsx` 등 메인 핵심 컴포넌트 — 인라인 형태 값 토큰화

## 8. 테스트

- `lib/theme.ts` 단위 테스트(Vitest):
  - 저장 후 복원 시 동일 값 반환
  - localStorage에 잘못된 값이 있을 때 `'default'`로 폴백
- `applyTheme` 호출 시 `document.documentElement.dataset.theme`가 올바르게
  바뀌는지 검증

## 9. 적용 범위 밖 (YAGNI)

- 시스템 다크모드(`prefers-color-scheme`) 자동 감지 — 명시 선택만 지원
- 사용자 커스텀 색상 편집 — 사전 정의 테마만
- 테마별 애니메이션/트랜지션 차별화 — 색·형태 전환만

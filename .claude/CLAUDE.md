@commit-convention.md

## 프로젝트 개요
언제나이든치과 진료실 스케줄 관리 웹앱. 엑셀(.xlsx) 업로드 → 월별 스케줄 자동 생성.
브라우저 전용(별도 백엔드 없음). GitHub Pages: `/idendent_schedule_management/`

## 기술 스택
React 19 + TypeScript (strict), Vite 8, Tailwind CSS 4, @dnd-kit/core+sortable, xlsx, Vitest

## 디렉토리 구조
```
frontend/src/
  components/   # UI 컴포넌트
  lib/          # 핵심 로직
  types.ts      # 공유 타입 정의
base_data/      # 스케줄 규칙, 진료실 정보 문서
```

## 개발 환경 (WSL2)
- 프로젝트 경로 `/mnt/c/` — inotify 미작동, 폴링 방식(`vite.config.ts`에 적용 완료)
- npm은 반드시 `frontend/` 디렉토리에서 실행
- **Windows Git(IntelliJ) commit 불가** — lint-staged가 WSL2에만 있음, WSL2 터미널에서 commit

```bash
cd frontend && npm run dev        # 개발 서버 (localhost:5173)
cd frontend && npm test           # 테스트 실행
cd frontend && npx tsc --noEmit   # 타입 체크
cd frontend && npm run lint       # ESLint 검사
```

## 라우트
- `/` — 메인 (스케줄 생성)
- `/staff` — 직원 설정 (새로고침 404 → `public/404.html`로 SPA 우회 처리)

## 도메인 지식
- 수요일은 항상 전체 출근 (`wednesday` 필드: `'all' | null`)
- 스케줄 규칙 상세: `base_data/SCHEDULE_RULE.md`

## 핵심 파일
- `lib/staffApi.ts` — Supabase 직원 CRUD (`sort_order` 기반 정렬, D&D 순서 저장)
- `lib/excelParser.ts` / `excelExporter.ts` — 엑셀 파싱·생성
- `lib/scheduleGenerator.ts` — 규칙 적용 스케줄 생성
- `components/StaffSettingsPage.tsx` — 직원 목록 + drag & drop 정렬 (전체 필터에서만 활성)
- `components/StaffEditModal.tsx` / `StaffBulkEditModal.tsx` — 직원 편집 모달

## 환경변수
`frontend/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID`
GitHub Actions Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (workflow에서 `VITE_` prefix 부여)

## DB (Supabase PostgreSQL)
- 접속정보 → `.claude/secrets.md` (gitignore됨)
- 허용: `SELECT`, `\d`, `\dt` / 금지: `INSERT`, `UPDATE`, `DELETE`, DDL (명시 요청 없는 한)
- `staff.team_no` — varchar (A/B팀), `staff.sort_order` — integer (D&D 정렬 순서)

## UI 작업 규칙
- 모바일 우선, 반응형 분기점 640px
- 반응형 스타일은 `index.css` + 미디어 쿼리. 모달 maxHeight는 `dvh` 단위 (iOS Safari 대응)

## 코드 규칙
- 스타일은 inline style 중심, 반응형만 `index.css`
- 공유 타입은 `types.ts`에서 관리, 컴포넌트 내 타입 선언 지양
- public 에셋 경로: `import.meta.env.BASE_URL + 'filename'` (GitHub Pages base)
- pre-commit: lint-staged 자동 포맷/린트

## 업데이트 내역 관리
`frontend/CHANGELOG.md` 수정 시 `## vX.Y.Z — YYYY-MM-DD` 형식, 항목은 `- ` 로 시작

## 작업 규칙
- `git commit`은 사용자가 요청하기 전에는 하지 말것. `git config` 수정 금지
- 빌드확인은 하지 말것

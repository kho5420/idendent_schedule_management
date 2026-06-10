@commit-convention.md

## 프로젝트 개요
언제나이든치과 진료실 스케줄 관리 웹앱. 엑셀(.xlsx) 업로드 → 월별 스케줄 자동 생성.
브라우저 전용(별도 백엔드 없음). GitHub Pages: `/idendent_schedule_management/`

## 기술 스택
React 19 + TypeScript (strict), Vite 8, Tailwind CSS 4, @dnd-kit/core+sortable, xlsx, Vitest

## 개발 환경 (WSL2)
- 경로 `/mnt/d/` — inotify 미작동, 폴링 방식(`vite.config.ts`에 적용 완료)
- npm은 반드시 `frontend/`에서 실행. **Windows Git commit 불가** — WSL2 터미널에서 commit

```bash
cd frontend && npm run dev        # 개발 서버 (localhost:5173)
cd frontend && npx vitest run     # 테스트 1회 실행 (npm test는 watch 모드)
cd frontend && npx tsc -b         # 타입 체크 — --noEmit 쓰지 말 것 (배포와 검사 범위 다름)
cd frontend && npm run lint       # ESLint 검사
```

## 라우트
- `/` — 메인 (스케줄 생성)
- `/staff` — 직원 설정 (새로고침 404 → `public/404.html`로 SPA 우회 처리)
- `/schedule-settings` — 요일별 최소 인원·야간 분리 설정

## 도메인 지식
- 수요일은 항상 전체 출근 (`wednesday` 필드: `'all' | null`)
- 스케줄 규칙 상세: `base_data/SCHEDULE_RULE.md`

## 핵심 파일
- `lib/weeklyOffPlanner.ts` — 주차·연차·반차 배정 핵심 로직
- `lib/scheduleAssigner.ts` — 일별 출근/배정 로직
- `lib/doctorScheduleParser.ts` / `leaveRequestParser.ts` — 원장 스케줄·휴가 요청 파싱
- `lib/sheetsApi.ts` / `sheetWriter.ts` — Google Sheets 읽기·쓰기
- `lib/staffApi.ts` — Supabase 직원 CRUD (`sort_order` 기반 정렬, D&D 순서 저장)
- `lib/excelParser.ts` / `excelExporter.ts` — 엑셀 파싱·생성
- `lib/scheduleGenerator.ts` — stub (미구현). App.tsx가 위 lib 직접 조합
- `components/StaffSettingsPage.tsx` — 직원 목록 + drag & drop 정렬 (전체 필터에서만 활성)
- `components/ScheduleSettingsPage.tsx` — 요일별 스케줄 설정 편집
- `components/StaffEditModal.tsx` / `StaffBulkEditModal.tsx` — 직원 편집 모달

## 환경변수
`frontend/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID`
GitHub Actions Secrets: 동일 키 (`VITE_` prefix 없는 이름으로 등록, workflow에서 prefix 부여)

## DB (Supabase PostgreSQL)
- 접속정보 → `.claude/secrets.md` (gitignore됨)
- 허용: `SELECT`, `\d`, `\dt` / 금지: `INSERT`, `UPDATE`, `DELETE`, DDL (명시 요청 없는 한)
- 테이블: `staff`(`team_no` varchar A/B팀, `sort_order` integer), `employee_type`, `schedule_setting`

## UI·코드 규칙
- 모바일 우선, 반응형 분기점 640px. 스타일은 inline 중심, 반응형만 `index.css`
- 모달 maxHeight는 `dvh` 단위 (iOS Safari 대응)
- 공유 타입은 `types.ts`. public 에셋: `import.meta.env.BASE_URL + 'filename'`
- pre-commit: lint-staged 자동 포맷/린트

## 업데이트 내역 관리
`frontend/CHANGELOG.md`: `## vX.Y.Z — YYYY-MM-DD` 형식, 항목 `- ` 로 시작
빌드 시 파싱 → **일반 사용자에게 노출** — 코드 용어 금지, 일상어로 작성 (병원 도메인 용어는 가능)

## 작업 규칙
- **`git commit`은 사용자가 명시적으로 요청할 때만** (관행적 커밋 금지)
- **feature branch 임의 생성 금지** — 항상 main에서 직접, 필요 시 먼저 물어볼 것
- `git config` 수정 금지. 전체 빌드(`npm run build`) 확인 금지

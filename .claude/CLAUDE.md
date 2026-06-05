@commit-convention.md

## 프로젝트 개요
언제나이든치과 진료실 스케줄 관리 웹앱. 엑셀(.xlsx) 업로드 → 월별 스케줄 자동 생성.
모든 처리는 브라우저에서 실행(별도 백엔드 없음). GitHub Pages 배포: `/idendent_schedule_management/`

## 기술 스택
- React 19 + TypeScript (strict), Vite 8, Tailwind CSS 4
- xlsx (엑셀 파싱/생성), Vitest + Testing Library, Pretendard 폰트 (CDN)

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
- npm 명령은 반드시 `frontend/` 디렉토리에서 실행
- **Windows Git(IntelliJ) commit 불가** — lint-staged가 WSL2에만 있음, WSL2 터미널에서 commit

```bash
cd frontend && npm install                                    # 최초 1회
cd frontend && npm run dev                                    # 개발 서버 (localhost:5173)
cd frontend && npm test                                       # 테스트 실행
cd frontend && npm run lint                                   # ESLint 검사
cd frontend && npx prettier --write "src/**/*.{ts,tsx,css}"  # 포맷
```

## 도메인 지식
- 수요일은 항상 전체 출근 (`wednesday` 필드: `'all' | null`)
- 진료실 스텝 상세 규칙: `base_data/SCHEDULE_RULE.md` 참고
- 스케줄 출력 단위: 주차별(WeekRow), 월~토 각 스텝 이름 배열

## 핵심 파일
- `lib/excelParser.ts` — 엑셀 → ScheduleData 변환
- `lib/scheduleGenerator.ts` — 규칙 적용 후 GeneratedSchedule 생성
- `lib/excelExporter.ts` — GeneratedSchedule → 엑셀 파일 출력
- `lib/staffConfig.ts` — 직원 설정 localStorage 읽기/쓰기 (기본값 포함)
- `lib/changelog.ts` — CHANGELOG.md 파싱 및 버전 추적 (localStorage)
- `lib/sheetsApi.ts` — Google Sheets API 연동 (미완성)
- `components/StaffConfigModal.tsx` — 직원 추가/삭제/교정과 토글 모달
- `components/ChangelogModal.tsx` — 업데이트 내역 모달 (NEW 뱃지)

## 환경변수
Google Sheets 연동 시 `frontend/.env` 필요: `VITE_GOOGLE_CLIENT_ID=<OAuth 클라이언트 ID>`

## DB 접속 (Supabase PostgreSQL)
- 접속 방식: psql / DB명 `postgres` / 접속정보 → `.claude/secrets.md` 참조 (gitignore됨, 로컬 전용)
- 허용: `SELECT`, `\d`, `\dt` / 금지: `INSERT`, `UPDATE`, `DELETE`, DDL (명시 요청 없는 한)

## UI 작업 규칙
- 모든 UI 작업은 모바일 환경(반응형)을 염두에 두고 작업한다
- 반응형 분기점: 640px 이하를 모바일로 간주
- 반응형 스타일은 `index.css` 클래스 + 미디어 쿼리로 처리

## 코드 규칙
- 스타일은 inline style 중심, 반응형만 `index.css` 클래스로 처리
- 공유 타입은 `types.ts`에서 관리, 컴포넌트 내 타입 선언 지양
- 테스트: `lib/__tests__/*.test.ts` — localStorage 사용 시 `beforeEach(() => localStorage.clear())`
- public 에셋 경로: `/filename` 대신 `import.meta.env.BASE_URL + 'filename'` (GitHub Pages base)
- `.md?raw` import 시 `src/vite-env.d.ts`에 타입 선언 필요
- pre-commit: lint-staged가 staged 파일 포맷/린트 자동 처리

## 업데이트 내역 관리
`frontend/CHANGELOG.md` 수정 시 `## vX.Y.Z — YYYY-MM-DD` 형식 유지, 항목은 `- ` 로 시작

## 작업 규칙
- `git commit`은 사용자가 요청하기 전에는 하지 말것. `git config` 수정 금지
- 빌드확인은 하지 말것

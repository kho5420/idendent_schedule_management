@commit-convention.md

## 프로젝트 개요
언제나이든치과 진료실 스케줄 관리 웹앱.
엑셀(.xlsx) 파일을 업로드하면 조건에 맞게 월별 스케줄을 자동 생성한다.
모든 처리는 브라우저에서 실행되며 별도 백엔드 서버 없음.

## 기술 스택
- React 19 + TypeScript (strict)
- Vite 8 (번들러), Tailwind CSS 4
- xlsx (엑셀 파싱/생성), Vitest + Testing Library
- Pretendard 폰트 (CDN, 한국어 최적화)

## 디렉토리 구조
```
frontend/src/
  components/   # UI 컴포넌트
  lib/          # 핵심 로직
  types.ts      # 공유 타입 정의
base_data/      # 스케줄 규칙, 진료실 정보 문서
```

## 개발 환경 (WSL2)
- 프로젝트 경로 `/mnt/c/` — inotify 미작동, 폴링 방식으로 파일 감지
- npm 명령은 반드시 `frontend/` 디렉토리에서 실행

```bash
cd frontend && npm install   # 최초 1회
cd frontend && npm run dev   # 개발 서버 (localhost:5173)
cd frontend && npm test      # 테스트 실행
cd frontend && npm run lint  # ESLint 검사
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
- `lib/sheetsApi.ts` — Google Sheets API 연동 (미완성)

## 환경변수
Google Sheets 연동 시 `frontend/.env` 파일 생성 필요 (`.env.example` 참고):
```
VITE_GOOGLE_CLIENT_ID=<Google Cloud OAuth 클라이언트 ID>
```

## 배포
GitHub Pages로 배포됨. base 경로: `/idendent_schedule_management/`
```bash
cd frontend && npm run build   # dist/ 생성
```

## 코드 규칙
- 스타일은 inline style 중심, 반응형만 `index.css` 클래스로 처리
- 공유 타입은 `types.ts`에서 관리, 컴포넌트 내 타입 선언 지양
- pre-commit: lint-staged가 staged 파일 포맷/린트 자동 처리

## pre-commit hook 관련
WSL2 `/mnt/c/` 경로에서 hook 실행 권한이 유지되지 않을 수 있음.
커밋이 막힐 경우:
```bash
sed -i 's/\r//' .githooks/pre-commit   # CRLF 제거
git add .githooks/pre-commit           # 인덱스 갱신
```

## 작업 규칙
- `git commit`은 사용자가 요청하기 전에는 하지 말것. `git config` 수정 금지
- 빌드확인은 하지 말것

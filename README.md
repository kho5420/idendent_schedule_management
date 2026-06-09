# Idendent Schedule Management

엑셀 파일을 업로드하면 조건에 맞게 가공하여 새 엑셀 파일로 제공하는 웹 앱.
React SPA(`frontend/`)로 구성되며, 모든 처리는 브라우저에서 실행된다.

## 1. 설치 (사전 준비물)

| 도구 | 버전 | 설치 |
|---|---|---|
| **Node.js** | 22 LTS | [nodejs.org](https://nodejs.org/) 또는 nvm: `nvm install 22 && nvm use 22` |

## 2. 프론트엔드 실행

최초 1회 의존성 설치:
```bash
cd frontend && npm install
```

> `npm install` 실행 시 `prepare` 스크립트가 자동으로 `.githooks/pre-commit` 훅을 활성화한다.

개발 서버 실행:
```bash
cd frontend && npm run dev
```

- 포트 **5173**: http://localhost:5173

## 3. 테스트

테스트 러너는 **Vitest**다. 모두 `frontend/`에서 실행한다.

```bash
cd frontend

npx vitest run     # 전체 테스트 1회 실행 후 종료 (CI/수동 검증용)
npm test           # watch 모드 — 파일 변경을 감지해 자동 재실행 (개발 중)
```

> `npm test` 스크립트는 `vitest`이며 기본이 watch 모드다. watch 중에는 `a`(전체 재실행), `q`(종료), `p`(파일명 필터) 단축키를 쓸 수 있다.

자주 쓰는 변형:
```bash
npx vitest run src/lib/__tests__/weeklyOffPlanner.test.ts   # 특정 파일만
npx vitest run -t "전체휴진"                                 # 이름에 키워드가 포함된 테스트만
npx vitest run --reporter=basic                            # PASS/FAIL 요약만 출력
```

타입 체크:
```bash
cd frontend && npx tsc --noEmit
```

## 4. 코드 스타일

### 들여쓰기 규칙

**4칸** 들여쓰기를 사용한다. 설정은 `frontend/.prettierrc`의 `tabWidth`로 관리한다.

### 사용 도구

| 도구 | 역할 |
|---|---|
| **Prettier** | TS/TSX/JS/CSS 포맷 자동 수정 |
| **ESLint** | 코드 품질 검사 |
| **lint-staged** | staged 파일만 선별 검사 (빠름) |
| `.githooks/pre-commit` | 커밋 시 자동 검사 — 위반 시 커밋 차단 |

### pre-commit hook 활성화

`npm install` 실행 시 `prepare` 스크립트가 자동으로 설정되므로 **별도 설정 불필요**.

수동으로 활성화하려면:
```bash
git config core.hooksPath .githooks
```

### 수동 포맷 및 검사

```bash
# Prettier — 자동 수정
cd frontend && npx prettier --write "src/**/*.{ts,tsx,css}"

# Prettier — 검사만
cd frontend && npx prettier --check "src/**/*.{ts,tsx,css}"

# ESLint — 검사
cd frontend && npm run lint
```

### 커밋이 차단된 경우

```bash
cd frontend && npx prettier --write "src/**/*.{ts,tsx,css}"
git add -u
git commit -m "..."
```

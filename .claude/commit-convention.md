## 커밋 메시지 규칙

- 형식은 Conventional Commits 기반으로 작성한다.

형식: `type(scope): subject`

### type

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `refactor`: 동작 변경 없는 구조 개선
- `perf`: 성능 개선
- `test`: 테스트 추가 또는 수정
- `docs`: 문서 수정
- `style`: 포맷팅, 공백 등 동작 영향 없는 수정
- `chore`: 빌드, 설정, 의존성, 기타 잡무
- `revert`: 이전 커밋 되돌림

### subject

- 한국어, 50자 내외, 마침표 없음
- 변경 목적이 드러나게 작성 (파일명 나열 금지)
- 좋은 예: `fix(order): 합포장번호 재채번 조건 수정`
- 나쁜 예: `수정`, `버그 수정`, `OrderCmmnService 수정`

### 본문

- 단순 변경은 제목만 작성
- 이유나 영향 범위가 필요한 경우에만 본문 추가
- "무엇을 바꿨는지"보다 "왜 바꿨는지" 우선

### Co-Authored-By

- Claude가 커밋할 때는 반드시 본문 마지막에 아래 형식으로 추가한다.
- `Co-Authored-By:` 는 고정, 모델명은 실제 사용 모델을 반영한다.

```
Co-Authored-By: Claude {모델명} <noreply@anthropic.com>
```

예시: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
예시: `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`

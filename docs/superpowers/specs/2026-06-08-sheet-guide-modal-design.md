# 구글 시트 연동 가이드 모달 설계

**날짜:** 2026-06-08  
**상태:** 확정

---

## 개요

메인 페이지에서 버튼을 눌러 Google Sheets OAuth 클라이언트 ID 발급 가이드(5단계)를 단계별 모달로 확인할 수 있도록 한다.

---

## 구성 요소

### 1. 안내 배너 (App.tsx)

위치: `InputMethodCard` 컴포넌트 바로 아래, `GenerateButton` 위

스타일:
- 노란 계열 배경 (`#fefce8`), 테두리 (`#fde68a`)
- 왼쪽: "구글 시트 연동이 처음이신가요?" 텍스트
- 오른쪽: "설정 가이드 보기 →" 클릭 가능 텍스트 (파란색 언더라인)
- 클릭 시 `SheetGuideModal` 열기

State 추가:
```ts
const [isSheetGuideOpen, setIsSheetGuideOpen] = useState(false);
```

### 2. SheetGuideModal 컴포넌트

파일: `frontend/src/components/SheetGuideModal.tsx`

#### 구조

```
[모달 backdrop]
  └─ [모달 패널 — maxWidth 480px, maxHeight 85dvh]
       ├─ 헤더: "📖 구글 시트 연동 설정 가이드"  +  ✕ 닫기 버튼
       ├─ 단계 표시기: ①─②─③─④─⑤ (원형, 연결선)
       │   - 완료: 파란 채움
       │   - 현재: 파란 테두리
       │   - 미완: 회색
       ├─ 단계 콘텐츠 영역 (overflowY: auto)
       │   - 단계 제목 (굵게)
       │   - 순서 있는 항목 목록 (ol > li)
       └─ 하단 네비게이션
            - 이전 버튼 (1단계에서 비활성)
            - 현재 위치 텍스트 "1 / 5"
            - 다음 버튼 (5단계에서 "완료"로 변경 → 클릭 시 닫기)
```

#### 5단계 콘텐츠 (하드코딩)

docs/google-sheets-integration-guide.md 내용을 그대로 사용:

| 단계 | 제목 | 항목 수 |
|------|------|---------|
| 1 | Google Cloud 프로젝트 만들기 | 4개 |
| 2 | Google Sheets API 활성화 | 3개 |
| 3 | OAuth 동의 화면 설정 | 6개 |
| 4 | OAuth 클라이언트 ID 발급 | 6개 |
| 5 | 발급받은 클라이언트 ID 등록 | 2개 (로컬/배포 각각) |

#### 패턴

- `ChangelogModal`과 동일한 backdrop/패널 스타일 재사용
- 내부 state: `currentStep: number` (0-indexed)
- backdrop 클릭 시 닫기, propagation stop 패턴 동일

---

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/components/SheetGuideModal.tsx` | 신규 생성 |
| `frontend/src/App.tsx` | 배너 + state + 모달 렌더링 추가 |

---

## 범위 외

- `.md` 파일 런타임 파싱 없음 (브라우저 전용)
- 다국어 지원 없음
- 가이드 내용 편집 기능 없음

# AI 모듈 (Azure Speech + Translator) 개발 규칙

## 프로젝트 개요
- **앱 이름**: 도와줘코리안 (HelpBoys)
- **기술 스택**: Python 3.10+, FastAPI, Azure Speech SDK, Azure Translator
- **역할**: 실시간 음성인식 자막 + 채팅 자동번역 기능 제공
- **GitHub**: https://github.com/orgs/helpboys/repositories (private)

---

## 필수 규칙

### 1. Python 버전
- **Python 3.10 이상** 사용

### 2. 폴더 구조
```
ai/
├── speech/           # Azure Speech 음성인식 관련
├── translator/       # Azure Translator 번역 관련
├── api/              # FastAPI 엔드포인트
├── config/           # 설정 파일 (Azure 키 등)
├── tests/            # 테스트 코드
├── requirements.txt  # 의존성 목록
├── main.py           # FastAPI 앱 진입점
└── .env              # 환경변수 (Azure 키)
```

### 3. FastAPI로 API 제공
- 백엔드(Spring Boot)에서 호출할 REST API를 FastAPI로 만들 것
- 예시 엔드포인트:
  - `POST /api/translate` - 텍스트 번역
  - `WebSocket /ws/speech` - 실시간 음성인식 스트리밍

### 4. Azure 서비스 사용
- **Azure Speech**: 영상통화 중 음성 → 텍스트 변환 (실시간 자막)
- **Azure Translator**: 채팅 메시지 자동 번역 (한국어 ↔ 다국어)

### 5. 환경변수
- `.env` 파일에 Azure 키 저장
- Private 레포이므로 `.env` 커밋 가능
```
AZURE_SPEECH_KEY=your-key
AZURE_SPEECH_REGION=koreacentral
AZURE_TRANSLATOR_KEY=your-key
AZURE_TRANSLATOR_REGION=koreacentral
```

### 6. 의존성 관리
- 새 패키지 설치 시 반드시 `requirements.txt` 업데이트
```bash
pip freeze > requirements.txt
```

### 7. 코드 스타일
- 함수명, 변수명: **snake_case** (예: `translate_text`, `speech_key`)
- 클래스명: **PascalCase** (예: `SpeechService`)
- 모든 함수에 간단한 주석 또는 docstring 달 것

---

## ⚠️ 절대 하지 말 것
- **다른 사람이 작성한 코드를 함부로 삭제하지 말 것**
- **이해 안 되는 코드를 임의로 수정하지 말 것** → 먼저 팀원에게 물어볼 것
- **파일을 통째로 삭제하지 말 것**
- **Azure 키를 코드에 직접 하드코딩하지 말 것** → `.env`에서 불러올 것
- **`requirements.txt`를 임의로 수정하지 말 것** → `pip freeze`로 자동 생성

---

## Git 커밋 & 푸시 규칙

### 커밋 메시지 형식
```
[타입] 간단한 설명

예시:
[feat] 채팅 번역 API 구현
[fix] 음성인식 타임아웃 에러 수정
[refactor] 번역 함수 구조 개선
[docs] API 사용법 문서 추가
```

| 타입 | 의미 |
|------|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 코드 구조 개선 (기능 변화 없음) |
| `docs` | 문서 수정 |
| `chore` | 설정, 의존성 등 기타 변경 |
| `test` | 테스트 코드 추가/수정 |

### Git 작업 순서 (반드시 이 순서를 따를 것!)

```bash
# 1. 작업 전: 항상 최신 코드를 먼저 받기
git pull origin main

# 2. 새 브랜치 만들어서 작업하기
git checkout -b feature/내가-하는-작업

# 3. 작업 완료 후 변경사항 확인
git status
git diff

# 4. 변경한 파일만 골라서 추가
git add 파일이름
# 또는 전체 추가 (확인 후)
git add .

# 5. 커밋
git commit -m "[feat] 채팅 번역 API 구현"

# 6. 푸시
git push origin feature/내가-하는-작업

# 7. GitHub에서 Pull Request 생성 → 팀원 리뷰 후 병합
```

### ⛔ Git에서 절대 하지 말 것
- **`git push --force` 사용 금지** → 다른 사람의 작업이 사라질 수 있음
- **`git reset --hard` 사용 금지** → 코드가 영구 삭제될 수 있음
- **`main` 브랜치에 직접 푸시 금지** → 반드시 브랜치 만들어서 PR로 병합
- **다른 사람의 브랜치를 함부로 삭제하지 말 것**
- **충돌(conflict) 발생 시 임의로 해결하지 말 것** → 팀원과 상의 후 해결
- **커밋 메시지를 빈 칸으로 두지 말 것** → 무엇을 했는지 반드시 적을 것

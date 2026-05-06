# Frontend (React Native + Expo) 개발 규칙

## 프로젝트 개요
- **앱 이름**: 도와줘코리안 (HelpBoys)
- **기술 스택**: React Native, Expo (Managed Workflow), TypeScript
- **영상통화**: Agora Video SDK
- **GitHub**: https://github.com/orgs/helpboys/repositories (private)

---

## 필수 규칙

### 1. TypeScript 필수
- 모든 파일은 `.ts` 또는 `.tsx` 확장자 사용
- `any` 타입 사용 금지 → 정확한 타입 정의할 것

### 2. 폴더 구조
```
fronted/
├── app/              # Expo Router 페이지 (파일 기반 라우팅)
├── components/       # 재사용 가능한 UI 컴포넌트
├── screens/          # 화면 단위 컴포넌트
├── services/         # API 호출 함수 (Axios)
├── hooks/            # 커스텀 훅
├── types/            # TypeScript 타입 정의
├── constants/        # 상수값 (색상, URL 등)
├── assets/           # 이미지, 폰트 등
├── stores/           # Zustand 상태관리 스토어
└── utils/            # 유틸리티 함수
```

### 3. 상태관리
- **Zustand** 사용 (Redux 사용 금지)
- 스토어 파일은 `stores/` 폴더에 생성

### 4. API 통신
- **Axios** 사용
- 모든 API 호출은 `services/` 폴더에 모아서 관리
- base URL은 환경변수로 관리

### 5. 스타일링
- `StyleSheet.create()` 사용
- 인라인 스타일 금지 (예: `style={{ color: 'red' }}` ❌)
- 색상값은 `constants/colors.ts`에 정의해서 사용

### 6. 환경변수
- `.env` 파일에 API 키, 서버 URL 등 저장
- `expo-constants`로 접근

---

## ⚠️ 절대 하지 말 것
- **다른 사람이 작성한 코드를 함부로 삭제하지 말 것**
- **이해 안 되는 코드를 임의로 수정하지 말 것** → 먼저 팀원에게 물어볼 것
- **파일을 통째로 삭제하지 말 것**
- **`node_modules/` 폴더를 직접 수정하지 말 것**

---

## Git 커밋 & 푸시 규칙

### 커밋 메시지 형식
```
[타입] 간단한 설명

예시:
[feat] 로그인 화면 UI 구현
[fix] 채팅 메시지 전송 안 되는 버그 수정
[style] 홈 화면 버튼 색상 변경
[refactor] API 호출 함수 정리
[docs] README 업데이트
```

| 타입 | 의미 |
|------|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `style` | UI/디자인 변경 (기능 변화 없음) |
| `refactor` | 코드 구조 개선 (기능 변화 없음) |
| `docs` | 문서 수정 |
| `chore` | 설정, 의존성 등 기타 변경 |

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
git commit -m "[feat] 로그인 화면 구현"

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

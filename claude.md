# Backend (Spring Boot) 개발 규칙

## 프로젝트 개요
- **앱 이름**: 도와줘코리안 (HelpBoys)
- **기술 스택**: Spring Boot 3.x, Java 17+, MySQL, WebSocket(STOMP)
- **GitHub**: https://github.com/orgs/helpboys/repositories (private)

---

## 필수 규칙

### 1. Java 버전
- **Java 17 이상** 사용 필수
- Spring Boot **3.x** 사용

### 2. 패키지 구조
```
com.helpboys.backend/
├── controller/       # REST API 엔드포인트
├── service/          # 비즈니스 로직
├── repository/       # DB 접근 (JPA)
├── entity/           # DB 테이블 매핑 클래스
├── dto/              # 요청/응답 데이터 클래스
├── config/           # 설정 (WebSocket, Security 등)
├── exception/        # 예외 처리 클래스
└── util/             # 유틸리티 클래스
```

### 3. 계층 구조 (반드시 지킬 것)
```
Controller → Service → Repository
```
- **Controller**: 요청 받고 응답만 함 (비즈니스 로직 넣지 말 것)
- **Service**: 비즈니스 로직 처리
- **Repository**: DB 조회/저장만 담당

### 4. API 응답 형식 통일
모든 API 응답은 아래 형식을 따를 것:
```json
{
  "success": true,
  "message": "성공",
  "data": { ... }
}
```

에러 응답:
```json
{
  "success": false,
  "message": "에러 메시지",
  "data": null
}
```

### 5. Entity 규칙
- `@Entity` 클래스에는 반드시 `@Id`, `@GeneratedValue` 지정
- 테이블명, 컬럼명은 **snake_case** (예: `user_type`, `created_at`)
- `createdAt`, `updatedAt` 필드 반드시 포함할 것

### 6. DTO 규칙
- Entity를 직접 API 응답으로 보내지 말 것 → 반드시 DTO 변환 후 전달
- 요청 DTO (`XxxRequest`), 응답 DTO (`XxxResponse`)로 구분

### 7. WebSocket (채팅)
- **STOMP** 프로토콜 사용
- 엔드포인트: `/ws` (SockJS 사용)
- 구독: `/topic/chat/{roomId}`
- 전송: `/app/chat/send`

### 8. 환경변수
- `application.yml`에 DB 접속정보, Azure 키 등 설정
- Private 레포이므로 `.env` 커밋 가능

---

## ⚠️ 절대 하지 말 것
- **다른 사람이 작성한 코드를 함부로 삭제하지 말 것**
- **이해 안 되는 코드를 임의로 수정하지 말 것** → 먼저 팀원에게 물어볼 것
- **파일을 통째로 삭제하지 말 것**
- **Entity 클래스의 필드를 임의로 삭제하지 말 것** → DB 데이터 날아갈 수 있음
- **`application.yml`의 DB 설정을 임의로 변경하지 말 것**

---

## Git 커밋 & 푸시 규칙

### 커밋 메시지 형식
```
[타입] 간단한 설명

예시:
[feat] 회원가입 API 구현
[fix] 채팅 메시지 저장 안 되는 버그 수정
[refactor] UserService 로직 정리
[docs] API 명세서 업데이트
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
git commit -m "[feat] 회원가입 API 구현"

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

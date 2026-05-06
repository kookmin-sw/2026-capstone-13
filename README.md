# Kutoring

> 국민대학교 외국인 유학생과 한국인 학생을 연결하는 언어 교류 플랫폼

---

## 소개

Kutoring은 국민대학교 외국인 유학생과 한국인 학생이 서로 언어와 문화를 교류할 수 있도록 돕는 서비스입니다.  
실시간 채팅, 음성/영상 통화, 다국어 번역, 도움 요청 매칭 등의 기능을 제공합니다.

---

## 팀원


---

## 기술 스택

### Backend
- Java 17, Spring Boot 3.x
- MySQL, Spring Data JPA
- WebSocket (STOMP)
- JWT 인증
- Railway (배포)

### Frontend
- React Native (Expo)
- TypeScript

### AI
- Python (FastAPI)
- DeepL / Google Translate / Gemini API
- Cloudinary (이미지 저장)

---

## 실행 방법

### Backend
```bash
cd backend
./gradlew bootRun
```

### Frontend
```bash
cd frontend
npm install
npx expo start
```

### AI
```bash
cd ai
pip install -r requirements.txt
python main.py
```

---

## 프로젝트 구조

```
kutoring/
├── backend/    # Spring Boot 백엔드 서버
├── frontend/   # React Native 앱
└── ai/         # AI 번역 및 크롤링 서버
```

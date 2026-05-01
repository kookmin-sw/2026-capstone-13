# HelpBoys AI 서버 - Azure Translator 연동

## 📌 개요
이 AI 서버는 Azure Translator API를 사용하여 채팅 메시지를 자동 번역하는 기능을 제공합니다.

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
cd ai
pip install aiohttp python-dotenv
```

### 2. 환경변수 설정
`.env` 파일을 생성하고 Azure API 키를 입력하세요:

```bash
# .env 파일
AZURE_TRANSLATOR_KEY=your-azure-translator-key-here
AZURE_TRANSLATOR_REGION=koreacentral
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
```

**Azure API 키가 없는 경우**: 더미 모드로 자동 실행됩니다 (테스트용)

### 3. 서버 실행
```bash
python3 simple_server.py
```

서버가 `http://localhost:8000`에서 실행됩니다.

## 📡 API 엔드포인트

### 1. 헬스체크
```bash
GET http://localhost:8000/health
```

**응답 예시:**
```json
{
  "status": "healthy",
  "azure_connected": false
}
```

### 2. 번역 API
```bash
POST http://localhost:8000/api/translate
Content-Type: application/json

{
  "text": "안녕하세요",
  "target_lang": "en",
  "source_lang": null
}
```

**응답 예시 (더미 모드):**
```json
{
  "success": true,
  "message": "더미 모드 번역 (Azure 키 필요)",
  "data": {
    "original": "안녕하세요",
    "translated": "안녕하세요 [Translated to en]",
    "source_language": "ko",
    "target_language": "en",
    "mode": "dummy"
  }
}
```

**응답 예시 (Azure 연동 시):**
```json
{
  "success": true,
  "message": "Azure 번역 완료",
  "data": {
    "original": "안녕하세요",
    "translated": "Hello",
    "source_language": "ko",
    "target_language": "en",
    "mode": "azure"
  }
}
```

## 🔧 지원 언어 코드
- `ko` - 한국어
- `en` - 영어
- `zh-Hans` - 중국어 간체
- `ja` - 일본어
- `vi` - 베트남어
- 기타 Azure Translator 지원 언어

## 🧪 테스트 방법

### curl로 테스트
```bash
# 헬스체크
curl http://localhost:8000/health

# 번역 테스트
curl -X POST http://localhost:8000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕하세요", "target_lang": "en"}'
```

### Python으로 테스트
```python
import requests

response = requests.post(
    "http://localhost:8000/api/translate",
    json={
        "text": "안녕하세요",
        "target_lang": "en"
    }
)

print(response.json())
```

## 🔗 Backend 연동 방법

Backend(Spring Boot)에서 이 AI 서버를 호출하려면:

1. `AiTranslationService.java` 생성
2. RestTemplate 또는 WebClient로 `http://localhost:8000/api/translate` 호출
3. `ChatService.saveMessage()`에서 번역 결과를 `translatedContent`에 저장

자세한 내용은 Backend 팀원과 협의하세요.

## 📝 다음 단계
- [ ] Azure Portal에서 Translator 리소스 생성
- [ ] API 키를 `.env`에 추가
- [ ] Backend와 연동 테스트
- [ ] 음성인식 기능 추가 (speech 폴더)

## ⚠️ 주의사항
- Azure API 키는 절대 GitHub에 커밋하지 마세요 (Private 레포지만 주의)
- 더미 모드는 테스트용이며, 실제 서비스에서는 Azure 키가 필요합니다
- API 호출 시 요금이 발생할 수 있으니 Azure 사용량을 모니터링하세요

## 🛠️ 프로젝트 구조
```
ai/
├── translator/
│   └── service.py          # Azure Translator 연동
├── simple_server.py         # HTTP API 서버
├── .env                     # 환경변수 (Git 제외)
├── .env.example             # 환경변수 템플릿
├── README.md                # 이 파일
└── requirements.txt         # Python 의존성
```

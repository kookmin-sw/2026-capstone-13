# ai/main.py
from fastapi import FastAPI
import os
from dotenv import load_dotenv
from translator.service import translation_service

# 규칙 5: 환경변수 로드
load_dotenv()

app = FastAPI(title="HelpBoys AI API")

@app.get("/")
def home():
    return {"status": "AI 서버 정상 작동 중"}

# 규칙 3: 백엔드가 호출할 API 엔드포인트 설정
@app.post("/api/translate")
async def translate(text: str, lang: str = "en"):
    # 가짜 번역 서비스 실행
    result = await translation_service.translate_text(text, lang)
    
    # 규칙 4: 팀 공통 응답 형식 준수
    return {
        "success": True,
        "message": "번역 성공 (Azure 연결 대기 중)",
        "data": result
    }
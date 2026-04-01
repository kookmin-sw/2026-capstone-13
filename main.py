import os
import json
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from translator.service import translation_service
from speech.service import speech_service
from crawler.kookmin import crawl_all
from crawler.meal import crawl_weekly_menu

app = FastAPI(title="HelpBoys AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_LANGUAGES = ["en", "zh-Hans", "zh-Hant", "ja", "vi", "mn", "fr", "de", "es"]


# ── 헬스체크 ──────────────────────────────────────────────
@app.get("/")
def home():
    return {"status": "AI 서버 정상 작동 중"}


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "azure_speech": not speech_service.dummy_mode,
        "azure_translator": not translation_service.dummy_mode,
    }


# ── 번역 ──────────────────────────────────────────────────
@app.post("/api/translate")
async def translate(request: Request):
    data = await request.json()
    text = data.get("text", "")
    target_lang = data.get("target_lang", "en")
    source_lang = data.get("source_lang")

    result = await translation_service.translate_text(text, target_lang, source_lang)
    mode_message = "Azure 번역 완료" if result.get("mode") == "azure" else "더미 모드 번역 (Azure 키 필요)"

    return {"success": True, "message": mode_message, "data": result}


# ── 음성→텍스트 (음성 메시지용 REST) ─────────────────────
@app.post("/api/speech-to-text")
async def speech_to_text(request: Request):
    audio_data = await request.body()
    language = request.headers.get("X-Language")

    result = speech_service.transcribe_audio(audio_data, language)
    mode_message = "Azure 음성 인식 완료" if result.get("mode") == "azure" else "더미 모드 (Azure Speech 키 필요)"

    return {"success": True, "message": mode_message, "data": result}


# ── 공지 크롤링 ───────────────────────────────────────────
@app.get("/api/notices/crawl")
async def crawl_notices():
    try:
        raw_notices = crawl_all()
        result = []
        for notice in raw_notices:
            title_ko = notice["title"]
            translations = {}
            for lang in SUPPORTED_LANGUAGES:
                try:
                    translated = await translation_service.translate_text(title_ko, lang, "ko")
                    translations[lang] = translated.get("translated", title_ko)
                except Exception:
                    translations[lang] = title_ko
            result.append({
                "title_ko": title_ko,
                "translations": translations,
                "link": notice["link"],
                "date": notice["date"],
                "category_id": notice["category_id"],
                "category_name": notice["category_name"],
            })
        return {"success": True, "message": f"{len(result)}건 수집 및 번역 완료", "data": result}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": f"크롤링 실패: {str(e)}", "data": None})


# ── 식단 크롤링 ───────────────────────────────────────────
@app.get("/api/meals/crawl")
async def crawl_meals():
    try:
        raw_meals = crawl_weekly_menu()
        result = []
        for meal in raw_meals:
            translations = {}
            for lang in SUPPORTED_LANGUAGES:
                try:
                    translated_cafeteria = await translation_service.translate_text(meal["cafeteria"], lang, "ko")
                    translated_corner    = await translation_service.translate_text(meal["corner"], lang, "ko")
                    translations[lang] = {
                        "cafeteria": translated_cafeteria.get("translated", meal["cafeteria"]),
                        "corner":    translated_corner.get("translated", meal["corner"]),
                    }
                except Exception:
                    translations[lang] = {
                        "cafeteria": meal["cafeteria"],
                        "corner":    meal["corner"],
                    }
            result.append({
                "cafeteria_ko": meal["cafeteria"],
                "corner_ko":    meal["corner"],
                "menu":         meal["menu"],
                "date":         meal["date"],
                "translations": translations,
            })
        return {"success": True, "message": f"{len(result)}개 식단 수집 및 번역 완료", "data": result}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": f"식단 수집 실패: {str(e)}", "data": None})


# ── 실시간 자막 WebSocket ─────────────────────────────────
@app.websocket("/ws/speech")
async def websocket_speech(websocket: WebSocket):
    await websocket.accept()
    client = websocket.client
    print(f"[WebSocket] 연결됨: {client}")

    language = None

    try:
        while True:
            message = await websocket.receive()

            # JSON 설정 메시지 (언어 설정)
            if "text" in message:
                try:
                    config = json.loads(message["text"])
                    if "language" in config:
                        language = config["language"]
                        print(f"[WebSocket] 언어 설정: {language}")
                        await websocket.send_text(json.dumps({
                            "type": "config_ack",
                            "language": language
                        }))
                except json.JSONDecodeError:
                    pass

            # 오디오 청크 (bytes)
            elif "bytes" in message and message["bytes"]:
                audio_data = message["bytes"]
                result = speech_service.transcribe_audio(audio_data, language)
                await websocket.send_text(json.dumps({
                    "type": "transcript",
                    "text": result.get("text", ""),
                    "language": result.get("language", "unknown"),
                    "mode": result.get("mode", "dummy"),
                }, ensure_ascii=False))

    except WebSocketDisconnect:
        print(f"[WebSocket] 연결 종료: {client}")
    except Exception as e:
        print(f"[WebSocket] 오류: {e}")
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass

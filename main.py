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

SUPPORTED_LANGUAGES = ["en", "zh-Hans", "zh-Hant", "ja", "vi", "mn", "fr", "de", "es", "ru"]


# ── 헬스체크 ──────────────────────────────────────────────
@app.get("/")
def home():
    return {"status": "AI 서버 정상 작동 중"}


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "azure_speech": not speech_service.dummy_mode,
        "azure_translator": translation_service.azure_key is not None,
        "gemini_translator": translation_service.gemini_client is not None,
        "translation_mode": "azure" if translation_service.azure_key else ("gemini" if translation_service.gemini_client else "dummy"),
    }


# ── Gemini 디버그 ──────────────────────────────────────────
@app.get("/api/gemini/test")
async def gemini_test():
    """Gemini 연결 상태 및 번역 테스트"""
    import os
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return {"ok": False, "reason": "GEMINI_API_KEY 환경변수 없음"}
    try:
        from google import genai
        client = genai.Client(api_key=key)
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=translation_service.model_name,
            contents="Say 'hello' in English only.",
        )
        return {
            "ok": True,
            "model": translation_service.model_name,
            "response": response.text.strip(),
            "gemini_client_ready": not translation_service.dummy_mode,
        }
    except Exception as e:
        return {
            "ok": False,
            "model": translation_service.model_name,
            "error": str(e),
            "error_type": type(e).__name__,
        }


# ── Azure 전용 번역 (식단/공지 대량 번역용) ───────────────
@app.post("/api/azure/translate")
async def azure_translate(request: Request):
    data = await request.json()
    text = data.get("text", "")
    target_lang = data.get("target_lang", "en")
    source_lang = data.get("source_lang")

    translated = await translation_service.azure_translate_text(text, target_lang, source_lang)
    return {"success": True, "data": {"translated": translated}}


# ── 번역 ──────────────────────────────────────────────────
@app.post("/api/translate")
async def translate(request: Request):
    data = await request.json()
    text = data.get("text", "")
    target_lang = data.get("target_lang", "en")
    source_lang = data.get("source_lang")

    result = await translation_service.translate_text(text, target_lang, source_lang)
    mode = result.get("mode")
    if mode == "azure":
        mode_message = "Azure 번역 완료"
    elif mode == "gemini":
        mode_message = "Gemini 번역 완료"
    else:
        mode_message = "더미 모드 번역"

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
            # 10개 언어를 한 번에 요청
            try:
                headers = {
                    "Ocp-Apim-Subscription-Key": translation_service.azure_key,
                    "Ocp-Apim-Subscription-Region": translation_service.azure_region,
                    "Content-Type": "application/json",
                }
                import requests as req_lib, uuid
                params = {"api-version": "3.0", "from": "ko", "to": SUPPORTED_LANGUAGES}
                resp = await asyncio.to_thread(
                    lambda: req_lib.post(
                        "https://api.cognitive.microsofttranslator.com/translate",
                        headers={**headers, "X-ClientTraceId": str(uuid.uuid4())},
                        params=params,
                        json=[{"text": title_ko}],
                        timeout=10,
                    )
                )
                resp.raise_for_status()
                data = resp.json()
                translations = {t["to"]: t["text"] for t in data[0]["translations"]}
            except Exception:
                translations = {lang: title_ko for lang in SUPPORTED_LANGUAGES}
            await asyncio.sleep(0.3)
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
            try:
                import requests as req_lib, uuid
                headers = {
                    "Ocp-Apim-Subscription-Key": translation_service.azure_key,
                    "Ocp-Apim-Subscription-Region": translation_service.azure_region,
                    "Content-Type": "application/json",
                }
                params = {"api-version": "3.0", "from": "ko", "to": SUPPORTED_LANGUAGES}
                resp = await asyncio.to_thread(
                    lambda: req_lib.post(
                        "https://api.cognitive.microsofttranslator.com/translate",
                        headers={**headers, "X-ClientTraceId": str(uuid.uuid4())},
                        params=params,
                        json=[{"text": meal["cafeteria"]}, {"text": meal["corner"]}, {"text": meal["menu"]}],
                        timeout=10,
                    )
                )
                resp.raise_for_status()
                data = resp.json()
                caf_map  = {t["to"]: t["text"] for t in data[0]["translations"]}
                cor_map  = {t["to"]: t["text"] for t in data[1]["translations"]}
                menu_map = {t["to"]: t["text"] for t in data[2]["translations"]}
                translations = {
                    lang: {"cafeteria": caf_map.get(lang, meal["cafeteria"]),
                           "corner":    cor_map.get(lang, meal["corner"]),
                           "menu":      menu_map.get(lang, meal["menu"])}
                    for lang in SUPPORTED_LANGUAGES
                }
            except Exception:
                translations = {
                    lang: {"cafeteria": meal["cafeteria"], "corner": meal["corner"], "menu": meal["menu"]}
                    for lang in SUPPORTED_LANGUAGES
                }
            await asyncio.sleep(0.3)
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

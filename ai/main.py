import os
import json
import asyncio
import base64
import hashlib
import hmac
import time
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
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
    allow_origin_regex=".*",
)

SUPPORTED_LANGUAGES = ["en", "ja", "zh-Hans", "ru", "mn", "vi"]
AI_SHARED_SECRET = os.getenv("AI_SHARED_SECRET")
AI_AUTH_HEADER = "X-Helpboys-AI-Key"


def verify_internal_request(request: Request):
    if not AI_SHARED_SECRET:
        raise HTTPException(status_code=503, detail="AI_SHARED_SECRET is not configured")
    if request.headers.get(AI_AUTH_HEADER) != AI_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


def verify_speech_token(token: str | None) -> bool:
    if not AI_SHARED_SECRET or not token:
        return False
    try:
        user_id, expires_at, signature = token.split(".", 2)
        if int(expires_at) < int(time.time()):
            return False
        payload = f"{user_id}.{expires_at}"
        expected = base64.urlsafe_b64encode(
            hmac.new(
                AI_SHARED_SECRET.encode("utf-8"),
                payload.encode("utf-8"),
                hashlib.sha256,
            ).digest()
        ).decode("utf-8").rstrip("=")
        return hmac.compare_digest(signature, expected)
    except Exception:
        return False


async def _batch_translate(texts: list[str], target_lang: str, retries: int = 3) -> list[str] | None:
    """
    DeepL/Azure로만 배치 번역한다.
    Google/Gemini는 사용하지 않는다.
    반환: 번역된 텍스트 리스트 (texts와 동일 순서), 실패 시 None
    """
    import requests as req_lib, uuid
    from translator.service import DEEPL_LANG_MAP, DEEPL_SUPPORTED, DEEPL_API_URL

    deepl_skip = False

    for attempt in range(retries):
        try:
            if target_lang in DEEPL_SUPPORTED and translation_service.deepl_key and not translation_service.deepl_quota_exceeded and not deepl_skip:
                deepl_target = DEEPL_LANG_MAP[target_lang]
                resp = await asyncio.to_thread(
                    lambda: req_lib.post(
                        DEEPL_API_URL,
                        headers={"Authorization": f"DeepL-Auth-Key {translation_service.deepl_key}"},
                        json={"text": texts, "target_lang": deepl_target, "source_lang": "KO"},
                        timeout=10,
                    )
                )
                if resp.status_code == 456:
                    print("[DeepL] ⚠️ 월 사용량 초과 (456) → Azure로 전환")
                    translation_service.deepl_quota_exceeded = True
                    return await _batch_translate(texts, target_lang, retries=1)
                if resp.status_code == 429:
                    print(f"[배치번역:{target_lang}] DeepL 429 속도제한 → Azure로 전환")
                    deepl_skip = True
                    continue
                resp.raise_for_status()
                return [t["text"] for t in resp.json()["translations"]]

            if translation_service.azure_key:
                headers = {
                    "Ocp-Apim-Subscription-Key": translation_service.azure_key,
                    "Ocp-Apim-Subscription-Region": translation_service.azure_region,
                    "Content-Type": "application/json",
                }
                resp = await asyncio.to_thread(
                    lambda: req_lib.post(
                        "https://api.cognitive.microsofttranslator.com/translate",
                        headers={**headers, "X-ClientTraceId": str(uuid.uuid4())},
                        params={"api-version": "3.0", "from": "ko", "to": [target_lang]},
                        json=[{"text": t} for t in texts],
                        timeout=10,
                    )
                )
                resp.raise_for_status()
                return [item["translations"][0]["text"] for item in resp.json()]

            return None

        except Exception as e:
            print(f"[배치번역:{target_lang}] 시도 {attempt + 1}/{retries} 실패: {e}")
            if attempt < retries - 1:
                await asyncio.sleep(1 * (attempt + 1))

    return None


async def _batch_translate_all_langs(texts: list[str], languages: list[str]) -> dict:
    """
    여러 언어로 동시 배치 번역
    반환: {lang: [번역텍스트, ...]}
    """
    tasks = {lang: _batch_translate(texts, lang) for lang in languages}
    results = await asyncio.gather(*tasks.values(), return_exceptions=True)
    return {lang: (res if not isinstance(res, Exception) else None)
            for lang, res in zip(tasks.keys(), results)}

# 식당 고유명사 교정 매핑 (Azure 번역 오류 수정)
CAFETERIA_NAME_CORRECTIONS = {
    "en": {
        "Hanul Restaurant": "Hanul Cafeteria",
        "One Restaurant": "Hanul Cafeteria",
        "Hanul Dining": "Hanul Cafeteria",
        "Faculty Restaurant": "Faculty Cafeteria",
        "Teacher Restaurant": "Faculty Cafeteria",
        "Student Restaurant": "Student Cafeteria",
        "Dormitory Restaurant": "Dormitory Cafeteria",
        "Living Hall Restaurant": "Dormitory Cafeteria",
    }
}

def _correct_cafeteria_name(name: str, lang: str) -> str:
    corrections = CAFETERIA_NAME_CORRECTIONS.get(lang, {})
    for wrong, right in corrections.items():
        if wrong.lower() in name.lower():
            return name.lower().replace(wrong.lower(), right)
    return name


# ── 헬스체크 ──────────────────────────────────────────────
@app.get("/")
def home():
    return {"status": "AI 서버 정상 작동 중"}


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "deepgram_speech": not speech_service.dummy_mode,
        "azure_translator": translation_service.azure_key is not None,
        "deepl_translator": translation_service.deepl_key is not None and not translation_service.deepl_quota_exceeded,
        "google_translator": False,
        "gemini_translator": False,
        "translation_mode": "deepl" if translation_service.deepl_key and not translation_service.deepl_quota_exceeded else ("azure" if translation_service.azure_key else "no_key"),
    }


# ── Gemini 비활성화 확인 ───────────────────────────────────
@app.get("/api/gemini/test")
async def gemini_test():
    """Gemini는 비용 방지를 위해 비활성화되어 있다."""
    return {"ok": False, "reason": "Gemini disabled"}


# ── Azure 전용 번역 (식단/공지 대량 번역용) ───────────────
@app.post("/api/azure/translate")
async def azure_translate(request: Request):
    verify_internal_request(request)
    data = await request.json()
    text = data.get("text", "")
    target_lang = data.get("target_lang", "en")
    source_lang = data.get("source_lang")

    translated = await translation_service.azure_translate_text(text, target_lang, source_lang)
    return {"success": True, "data": {"translated": translated}}


# ── Gemini 번역 엔드포인트 비활성화 ───────────────────────
@app.post("/api/gemini/translate")
async def gemini_translate(request: Request):
    verify_internal_request(request)
    return {"success": False, "message": "Gemini translation endpoint disabled", "data": None}


# ── 번역 ──────────────────────────────────────────────────
@app.post("/api/translate")
async def translate(request: Request):
    verify_internal_request(request)
    data = await request.json()
    text = data.get("text", "")
    target_lang = data.get("target_lang", "en")
    source_lang = data.get("source_lang")
    prefer_llm = bool(data.get("prefer_llm", False))
    allow_llm = bool(data.get("allow_llm", True))
    context = data.get("context")

    result = await translation_service.translate_text(
        text,
        target_lang,
        source_lang,
        prefer_llm=prefer_llm,
        allow_llm=allow_llm,
        context=context,
    )
    mode = result.get("mode")
    if mode == "deepl":
        mode_message = "DeepL 번역 완료"
    else:
        mode_message = "번역 완료"

    return {"success": True, "message": mode_message, "data": result}


# ── 음성→텍스트 (음성 메시지용 REST) ─────────────────────
@app.post("/api/speech-to-text")
async def speech_to_text(request: Request):
    verify_internal_request(request)
    audio_data = await request.body()
    language = request.headers.get("X-Language")

    result = speech_service.transcribe_audio(audio_data, language)
    mode_message = "Azure 음성 인식 완료" if result.get("mode") == "azure" else "더미 모드 (Azure Speech 키 필요)"

    return {"success": True, "message": mode_message, "data": result}


# ── 공지 크롤링 ───────────────────────────────────────────
@app.get("/api/notices/crawl")
async def crawl_notices(request: Request):
    verify_internal_request(request)
    try:
        raw_notices = crawl_all()
        result = []
        for notice in raw_notices:
            title_ko = notice["title"]
            lang_results = await _batch_translate_all_langs([title_ko], SUPPORTED_LANGUAGES)
            translations = {
                lang: res[0] if res else title_ko
                for lang, res in lang_results.items()
            }
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


# ── 식단 단건 배치 번역 (retranslate용) ──────────────────
@app.post("/api/meals/translate-batch")
async def translate_meal_batch(request: Request):
    verify_internal_request(request)
    """식당명·코너명·메뉴를 전체 언어로 한 번에 번역 (DeepL/Azure only)"""
    try:
        data = await request.json()
        cafeteria = data.get("cafeteria", "")
        corner    = data.get("corner", "")
        menu      = data.get("menu", "")

        lang_results = await _batch_translate_all_langs([cafeteria, corner, menu], SUPPORTED_LANGUAGES)

        translations = {}
        for lang, res in lang_results.items():
            if res:
                translations[lang] = {
                    "cafeteria": _correct_cafeteria_name(res[0], lang),
                    "corner":    res[1],
                    "menu":      res[2],
                }
            else:
                translations[lang] = {"cafeteria": cafeteria, "corner": corner, "menu": menu}

        return {"success": True, "data": translations}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": str(e), "data": None})


# ── 식단 크롤링 ───────────────────────────────────────────
@app.get("/api/meals/crawl")
async def crawl_meals(request: Request):
    verify_internal_request(request)
    try:
        raw_meals = crawl_weekly_menu()
        result = []
        failed = []
        for meal in raw_meals:
            lang_results = await _batch_translate_all_langs(
                [meal["cafeteria"], meal["corner"], meal["menu"]], SUPPORTED_LANGUAGES
            )
            translations = {}
            any_failed = False
            for lang, res in lang_results.items():
                if res:
                    translations[lang] = {
                        "cafeteria": _correct_cafeteria_name(res[0], lang),
                        "corner":    res[1],
                        "menu":      res[2],
                    }
                else:
                    any_failed = True
            # 실패 시 빈 translations 저장 → 8:30 스케줄러가 자동 재번역
            if any_failed:
                failed.append(f"{meal['cafeteria']} / {meal['corner']} / {meal['date']}")
            await asyncio.sleep(0.1)
            result.append({
                "cafeteria_ko": meal["cafeteria"],
                "corner_ko":    meal["corner"],
                "menu":         meal["menu"],
                "date":         meal["date"],
                "translations": translations,
            })
        msg = f"{len(result)}개 식단 수집 및 번역 완료"
        if failed:
            msg += f" (번역 실패 {len(failed)}건: {', '.join(failed[:3])}{'...' if len(failed) > 3 else ''})"
        return {"success": True, "message": msg, "data": result}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": f"식단 수집 실패: {str(e)}", "data": None})


SUPPORTED_SUBTITLE_LANGS = {"ko", "en", "ja", "zh-Hans", "ru", "mn", "vi"}
LANG_CODE_ALIASES = {
    "ko-KR": "ko",
    "en-US": "en",
    "en-GB": "en",
    "ja-JP": "ja",
    "zh-CN": "zh-Hans",
    "zh-Hans": "zh-Hans",
    "ru-RU": "ru",
    "mn-MN": "mn",
    "vi-VN": "vi",
}


def normalize_subtitle_lang(lang: str | None, fallback: str = "en") -> str:
    if not lang:
        return fallback
    normalized = LANG_CODE_ALIASES.get(lang, lang)
    return normalized if normalized in SUPPORTED_SUBTITLE_LANGS else fallback



# ── 실시간 자막 WebSocket ─────────────────────────────────
@app.websocket("/ws/speech")
async def websocket_speech(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not verify_speech_token(token):
        await websocket.close(code=1008)
        return

    await websocket.accept()
    client_addr = websocket.client
    print(f"[WebSocket] 연결됨: {client_addr}")

    language = None
    source_language = None
    target_language = None

    # 1. 언어 설정 메시지 수신
    try:
        while True:
            message = await websocket.receive()
            if "text" in message:
                try:
                    config = json.loads(message["text"])
                    if "language" in config:
                        language = config["language"]
                        source_language = normalize_subtitle_lang(language, "")
                        print(f"[WebSocket] 내 언어: {language}")
                    if "target_language" in config:
                        target_language = normalize_subtitle_lang(config["target_language"], "en")
                        print(f"[WebSocket] 번역 목적어: {target_language}")
                    await websocket.send_text(json.dumps({
                        "type": "config_ack",
                        "language": language,
                        "target_language": target_language,
                    }))
                    break
                except json.JSONDecodeError:
                    pass
    except WebSocketDisconnect:
        return
    except Exception as e:
        print(f"[WebSocket] 설정 수신 실패: {e}")
        return

    # 2. 오디오 청크 수신 루프
    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message and message["bytes"]:
                audio_data = message["bytes"]
                result = await asyncio.to_thread(
                    speech_service.transcribe_audio, audio_data, language
                )
                original_text = result.get("text", "")

                translated_text = ""
                if original_text and target_language and target_language != source_language:
                    try:
                        tr = await translation_service.translate_text(
                            original_text, target_language, source_language,
                        )
                        translated_text = tr.get("translated", "")
                    except Exception as e:
                        print(f"[WebSocket] 번역 실패: {e}")

                await websocket.send_text(json.dumps({
                    "type": "transcript",
                    "text": original_text,
                    "translated": translated_text,
                    "language": result.get("language", language or "unknown"),
                    "target_language": target_language,
                    "mode": result.get("mode", "deepgram"),
                }, ensure_ascii=False))

    except WebSocketDisconnect:
        print(f"[WebSocket] 연결 종료: {client_addr}")
    except Exception as e:
        print(f"[WebSocket] 오류: {e}")
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass

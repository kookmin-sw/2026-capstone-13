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

SUPPORTED_LANGUAGES = ["en", "ja", "zh-Hans", "ru", "mn", "vi"]


async def _batch_translate(texts: list[str], target_lang: str, retries: int = 3) -> list[str] | None:
    """
    언어별 최적 엔진으로 배치 번역 (재시도 포함)
    - mn(몽골어) → Google Cloud Translation
    - 나머지 → DeepL → Azure 순 폴백
    반환: 번역된 텍스트 리스트 (texts와 동일 순서), 실패 시 None
    """
    import requests as req_lib, uuid
    from translator.service import DEEPL_LANG_MAP, DEEPL_SUPPORTED, DEEPL_API_URL

    for attempt in range(retries):
        try:
            # 몽골어: Google Cloud Translation
            if target_lang == "mn" and translation_service.google_key:
                results = []
                for text in texts:
                    resp = await asyncio.to_thread(
                        lambda t=text: req_lib.post(
                            "https://translation.googleapis.com/language/translate/v2",
                            params={"key": translation_service.google_key},
                            json={"q": t, "target": "mn", "source": "ko", "format": "text"},
                            timeout=10,
                        )
                    )
                    resp.raise_for_status()
                    results.append(resp.json()["data"]["translations"][0]["translatedText"])
                return results

            # DeepL 지원 언어 (한도 초과 시 Google로 자동 전환)
            elif target_lang in DEEPL_SUPPORTED and translation_service.deepl_key and not translation_service.deepl_quota_exceeded:
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
                    print("[DeepL] ⚠️ 월 사용량 초과 (456) → Google Cloud로 전환")
                    translation_service.deepl_quota_exceeded = True
                    # Google로 재시도 (아래 elif로 넘어가도록 continue 대신 재귀)
                    return await _batch_translate(texts, target_lang, retries=1)
                resp.raise_for_status()
                return [t["text"] for t in resp.json()["translations"]]

            # Google Cloud Translation
            elif translation_service.google_key:
                results = []
                for text in texts:
                    r = await asyncio.to_thread(
                        lambda t=text: req_lib.post(
                            "https://translation.googleapis.com/language/translate/v2",
                            params={"key": translation_service.google_key},
                            json={"q": t, "target": target_lang, "source": "ko", "format": "text"},
                            timeout=10,
                        )
                    )
                    r.raise_for_status()
                    results.append(r.json()["data"]["translations"][0]["translatedText"])
                return results

            # Azure 폴백
            elif translation_service.azure_key:
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

            else:
                return None  # 키 없음

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


# ── Gemini 전용 번역 (커뮤니티/채팅용) ───────────────────
@app.post("/api/gemini/translate")
async def gemini_translate(request: Request):
    data = await request.json()
    text = data.get("text", "")
    target_lang = data.get("target_lang", "en")
    source_lang = data.get("source_lang")
    context = data.get("context")  # 게시글 맥락 (선택)

    if not translation_service.gemini_client:
        return {"success": False, "message": "GEMINI_API_KEY가 설정되지 않았습니다", "data": None}

    result = await translation_service._gemini_translate(text, target_lang, source_lang, context)
    success = result.get("mode") == "gemini"
    return {"success": success, "message": "Gemini 번역 완료" if success else "Gemini 번역 실패", "data": result}


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


# ── 식단 단건 배치 번역 (retranslate용) ──────────────────
@app.post("/api/meals/translate-batch")
async def translate_meal_batch(request: Request):
    """식당명·코너명·메뉴를 전체 언어로 한 번에 번역 (DeepL+Google+Azure 라우팅)"""
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
async def crawl_meals():
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

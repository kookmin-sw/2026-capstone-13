# ai/translator/service.py
import os
import asyncio
import requests
import uuid
from typing import Optional

LANG_NAMES = {
    "en": "English", "ko": "Korean", "ja": "Japanese",
    "zh-Hans": "Simplified Chinese", "ru": "Russian",
    "mn": "Mongolian", "vi": "Vietnamese",
}

# DeepL 언어코드 매핑 (DeepL은 코드가 다름)
DEEPL_LANG_MAP = {
    "en": "EN", "ja": "JA", "zh-Hans": "ZH-HANS", "ru": "RU", "vi": "VI",
}
# DeepL이 지원하는 언어 (mn 제외)
DEEPL_SUPPORTED = set(DEEPL_LANG_MAP.keys())

AZURE_TRANSLATE_URL = "https://api.cognitive.microsofttranslator.com/translate"
DEEPL_API_URL = "https://api-free.deepl.com/v2/translate"  # Pro는 api.deepl.com


class TranslationService:
    """
    번역 우선순위:
    - DeepL 지원 언어 (en, zh, ja, vi, ru 등) → DeepL (최고 품질)
    - 몽골어 (mn) → Google Cloud Translation
    - 키 없으면 → Azure → Gemini → dummy 순 폴백
    """

    def __init__(self):
        # DeepL
        self.deepl_key = os.getenv("DEEPL_API_KEY")
        self._deepl_quota_exceeded_at: Optional[float] = None  # 초과 시각 (timestamp)
        if self.deepl_key:
            print("✅ DeepL API 연동 완료")
        else:
            print("⚠️  DEEPL_API_KEY 없음")

        # Google Cloud Translation
        self.google_key = os.getenv("GOOGLE_CLOUD_TRANSLATION_KEY")
        if self.google_key:
            print("✅ Google Cloud Translation 연동 완료")
        else:
            print("⚠️  GOOGLE_CLOUD_TRANSLATION_KEY 없음")

        # Azure Translator (폴백)
        self.azure_key = os.getenv("AZURE_TRANSLATOR_KEY")
        self.azure_region = os.getenv("AZURE_TRANSLATOR_REGION", "koreacentral")
        if self.azure_key and self.azure_key != "your-key":
            print("✅ Azure Translator 연동 완료 (폴백)")
        else:
            self.azure_key = None
            print("⚠️  AZURE_TRANSLATOR_KEY 없음")

        # Groq (LLM 번역)
        self.groq_client = None
        self.groq_model = 'llama-3.3-70b-versatile'
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                from groq import Groq
                self.groq_client = Groq(api_key=groq_key)
                print("✅ Groq API 연동 완료")
            except Exception as e:
                print(f"⚠️  Groq API 초기화 실패: {e}")
        else:
            print("⚠️  GROQ_API_KEY 없음")

        # Gemini (폴백)
        self.gemini_client = None
        self.model_name = 'gemini-2.0-flash'
        self.system_instruction = """
You are an expert translator for a matching app between Korean students and international students.
Your goal is to provide natural, casual, and context-aware translations.

- DO NOT translate literally. If a Korean expression is slang or an idiom, translate it into a natural equivalent.
- CRITICAL: Korean slang words that contain English letters/words embedded in them must NOT be translated literally. Examples:
  - '킹받다 / 킹받아 / 킹받네 / 킹받지' → "so annoying / drives me crazy / I'm so done" (NOT "king" anything)
  - '존맛 / 존맛탱' → "insanely delicious / so freaking good"
  - '핵노잼' → "absolutely not funny / so boring"
  - '자살각' → "I'm so done / this is killing me"
  - '알잘딱깔센' → "you know what to do"
  - '내로남불' → "double standard"
  - '먼지 같다' → "It's no big deal"
- Maintain the tone: If the source is casual/slang, the translation should be casual/slang.
- Handle profanity naturally: Translate Korean swear words (ㅅㅂ, 존나) into appropriate equivalents (damn, freaking, etc.).
- Context: These are university students chatting. Make it sound like a real Gen Z conversation.
- CRITICAL: Korean university cafeteria and building names must NEVER be translated into common nouns. Always romanize or keep as proper nouns. Examples:
  - '한울식당' → "Hanul Cafeteria" (NOT "one cafeteria" or just "cafeteria")
  - '복지관' → "Bokjigwan" (NOT "welfare hall" or "welfare center")
  - '북악관' → "Bugak Hall" (NOT "north mountain hall")
  - '교직원식당' → "Faculty Cafeteria" (NOT "teacher cafeteria")
  - '생활관' → "Dormitory Cafeteria" (NOT "living hall")
"""
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=gemini_key)
                print("✅ Gemini API 연동 완료 (폴백)")
            except Exception as e:
                print(f"⚠️  Gemini API 초기화 실패: {e}")
        else:
            print("⚠️  GEMINI_API_KEY 없음")


    def _detect_language(self, text: str) -> str:
        if any('\uac00' <= c <= '\ud7a3' for c in text):
            return "ko"
        elif any('\u4e00' <= c <= '\u9fff' for c in text):
            return "zh-Hans"
        else:
            return "en"

    async def detect_nuance(self, text: str) -> Optional[str]:
        """한국어 문화적 뉘앙스 감지 (Gemini → Groq 폴백)"""
        prompt = f"""Korean text: "{text}"

Respond "null" UNLESS the text contains very specific Korean slang/internet slang that a foreigner would completely misunderstand even after translation (e.g. 킹받다, 존맛탱, 알잘딱깔센, 내로남불).

Normal sentences, questions, greetings, opinions, complaints = null.
Only truly untranslatable Korean-specific expressions = one short English explanation.

Reply "null" or one sentence only."""

        # Gemini 시도
        if self.gemini_client:
            try:
                from google import genai
                response = await asyncio.to_thread(
                    self.gemini_client.models.generate_content,
                    model=self.model_name,
                    contents=prompt,
                )
                result = response.text.strip()
                return None if result.lower() == 'null' else result
            except Exception as e:
                print(f"[Gemini] 뉘앙스 감지 실패 → Groq 시도: {e}")

        # Groq 폴백
        if self.groq_client:
            try:
                def _call():
                    return self.groq_client.chat.completions.create(
                        model=self.groq_model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.2,
                        max_tokens=100,
                    )
                response = await asyncio.to_thread(_call)
                result = response.choices[0].message.content.strip()
                return None if result.lower() == 'null' else result
            except Exception as e:
                print(f"[Groq] 뉘앙스 감지 실패: {e}")

        return None

    @property
    def deepl_quota_exceeded(self) -> bool:
        if self._deepl_quota_exceeded_at is None:
            return False
        import time
        # 30일(2592000초) 지나면 자동 해제
        if time.time() - self._deepl_quota_exceeded_at > 2592000:
            print("[DeepL] 한도 초과 후 30일 경과 → DeepL 자동 복구")
            self._deepl_quota_exceeded_at = None
            return False
        return True

    @deepl_quota_exceeded.setter
    def deepl_quota_exceeded(self, value: bool):
        import time
        self._deepl_quota_exceeded_at = time.time() if value else None

    async def translate_text(self, text: str, target_lang: str = "en", source_lang: Optional[str] = None):
        """단건 번역: 언어별 최적 엔진 선택"""
        if target_lang == "mn":
            result = await self._google_translate(text, target_lang, source_lang)
        elif target_lang in DEEPL_SUPPORTED and self.deepl_key and not self.deepl_quota_exceeded:
            result = await self._deepl_translate(text, target_lang, source_lang)
        elif self.google_key:
            result = await self._google_translate(text, target_lang, source_lang)
        elif self.azure_key:
            result = await self._azure_translate(text, target_lang, source_lang)
        elif self.gemini_client:
            result = await self._gemini_translate(text, target_lang, source_lang)
        else:
            raise RuntimeError("사용 가능한 번역 API 키가 없습니다 (DeepL / Google / Azure / Gemini)")

        result["cultural_note"] = None
        return result

    async def _deepl_translate(self, text: str, target_lang: str, source_lang: Optional[str]):
        """DeepL API 번역"""
        deepl_target = DEEPL_LANG_MAP.get(target_lang, target_lang.upper())
        def _call():
            resp = requests.post(
                DEEPL_API_URL,
                headers={"Authorization": f"DeepL-Auth-Key {self.deepl_key}"},
                json={
                    "text": [text],
                    "target_lang": deepl_target,
                    **({"source_lang": "KO"} if source_lang == "ko" else {}),
                },
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
        try:
            data = await asyncio.to_thread(_call)
            translated = data["translations"][0]["text"]
            detected = data["translations"][0].get("detected_source_language", "KO").lower()
            detected = "ko" if detected == "ko" else detected
            return {
                "original": text, "translated": translated,
                "source_language": detected, "target_language": target_lang, "mode": "deepl",
            }
        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code == 456:
                # 456 = DeepL 월 한도 초과 → Google로 자동 전환
                print("[DeepL] ⚠️ 월 사용량 초과 (456) → Google Cloud로 전환")
                self.deepl_quota_exceeded = True
                return await self._google_translate(text, target_lang, source_lang)
            print(f"[DeepL] 번역 실패: {e} — Google 폴백")
            return await self._google_translate(text, target_lang, source_lang)
        except Exception as e:
            print(f"[DeepL] 번역 실패: {e} — Google 폴백")
            return await self._google_translate(text, target_lang, source_lang)

    async def _google_translate(self, text: str, target_lang: str, source_lang: Optional[str]):
        """Google Cloud Translation API 번역"""
        if not self.google_key:
            if self.azure_key:
                return await self._azure_translate(text, target_lang, source_lang)
            raise RuntimeError("GOOGLE_CLOUD_TRANSLATION_KEY 없음")
        def _call():
            resp = requests.post(
                "https://translation.googleapis.com/language/translate/v2",
                params={"key": self.google_key},
                json={
                    "q": text,
                    "target": target_lang,
                    **({"source": source_lang} if source_lang else {}),
                    "format": "text",
                },
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
        try:
            data = await asyncio.to_thread(_call)
            translated = data["data"]["translations"][0]["translatedText"]
            detected = data["data"]["translations"][0].get("detectedSourceLanguage", source_lang or self._detect_language(text))
            return {
                "original": text, "translated": translated,
                "source_language": detected, "target_language": target_lang, "mode": "google",
            }
        except Exception as e:
            print(f"[Google] 번역 실패: {e} — Azure 폴백 시도")
            if self.azure_key:
                return await self._azure_translate(text, target_lang, source_lang)
            raise RuntimeError(f"Google 번역 실패: {e}")

    async def _azure_translate(self, text: str, target_lang: str, source_lang: Optional[str]):
        """Azure Translator REST API 호출"""
        headers = {
            "Ocp-Apim-Subscription-Key": self.azure_key,
            "Ocp-Apim-Subscription-Region": self.azure_region,
            "Content-Type": "application/json",
            "X-ClientTraceId": str(uuid.uuid4()),
        }
        params = {"api-version": "3.0", "to": target_lang}
        if source_lang:
            params["from"] = source_lang

        def _call():
            resp = requests.post(
                AZURE_TRANSLATE_URL, headers=headers, params=params,
                json=[{"text": text}], timeout=10,
            )
            resp.raise_for_status()
            return resp.json()

        try:
            data = await asyncio.to_thread(_call)
            translated = data[0]["translations"][0]["text"]
            detected = data[0].get("detectedLanguage", {}).get("language", source_lang or self._detect_language(text))
            return {
                "original": text, "translated": translated,
                "source_language": detected, "target_language": target_lang, "mode": "azure",
            }
        except Exception as e:
            print(f"[Azure] 번역 실패: {e} — Gemini 폴백 시도")
            if self.gemini_client:
                return await self._gemini_translate(text, target_lang, source_lang)
            raise RuntimeError(f"Azure 번역 실패: {e}")

    async def _gemini_translate(self, text: str, target_lang: str, source_lang: Optional[str], context: Optional[str] = None):
        """Gemini API로 자연스러운 번역 (재시도 3회)"""
        if not self.gemini_client:
            raise RuntimeError("GEMINI_API_KEY가 설정되지 않았습니다")

        lang_name = LANG_NAMES.get(target_lang, target_lang)
        if context:
            prompt = f"""Translate this comment into natural, colloquial {lang_name}.
The comment is from a community post. Use the post context below to understand the nuance and translate accordingly.
Return ONLY the translation.

Post context:
{context}

Comment to translate: {text}"""
        else:
            prompt = f"""Translate this text into natural, colloquial {lang_name}.
If it's a chat message, make it sound like a native speaker's chat.
Return ONLY the translation.

Text: {text}"""

        from google import genai
        from google.genai import types

        last_error = None
        for attempt in range(3):
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self.gemini_client.models.generate_content,
                        model=self.model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=self.system_instruction,
                            safety_settings=[
                                types.SafetySetting(category='HARM_CATEGORY_HARASSMENT', threshold='BLOCK_NONE'),
                                types.SafetySetting(category='HARM_CATEGORY_HATE_SPEECH', threshold='BLOCK_NONE'),
                                types.SafetySetting(category='HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold='BLOCK_NONE'),
                                types.SafetySetting(category='HARM_CATEGORY_DANGEROUS_CONTENT', threshold='BLOCK_NONE'),
                            ]
                        )
                    ),
                    timeout=20.0
                )
                translated = response.text.strip() if response.text else None
                if not translated:
                    raise ValueError("빈 응답")
                return {
                    "original": text, "translated": translated,
                    "source_language": source_lang or self._detect_language(text),
                    "target_language": target_lang, "mode": "gemini",
                }
            except asyncio.TimeoutError:
                last_error = "timeout"
                print(f"[Gemini] 번역 타임아웃 (시도 {attempt+1}/3)")
            except Exception as e:
                last_error = str(e)
                print(f"[Gemini] 번역 실패 (시도 {attempt+1}/3): {e}")
                if attempt < 2:
                    await asyncio.sleep(1.5 * (attempt + 1))

        raise RuntimeError(f"[Gemini] 3회 재시도 모두 실패: {last_error}")

    async def _groq_translate(self, text: str, target_lang: str, source_lang: Optional[str], context: Optional[str] = None):
        """Groq API로 자연스러운 번역 (LLM 기반)"""
        if not self.groq_client:
            raise RuntimeError("GROQ_API_KEY가 설정되지 않았습니다")

        lang_name = LANG_NAMES.get(target_lang, target_lang)
        if context:
            prompt = f"""Translate this Korean comment into natural, colloquial {lang_name}.
IMPORTANT: This is Korean internet/chat slang. Do NOT translate literally.
- "개가 뭐래" = "what's their problem" / "what are they on about" (NOT "what does the dog say")
- "개" as prefix = intensifier meaning "very/super" (NOT "dog")
- Translate the MEANING and TONE, not the words literally.
Use the post context to understand nuance.
Return ONLY the translation.

Post context:
{context}

Comment to translate: {text}"""
        else:
            prompt = f"""Translate this Korean text into natural, colloquial {lang_name}.
IMPORTANT: This is Korean internet/chat slang. Do NOT translate literally.
- "개가 뭐래" = "what's their problem" / "what are they on about" (NOT "what does the dog say")
- "개" as prefix = intensifier meaning "very/super" (NOT "dog")
- "킹받다" = "so annoying / drives me crazy" (NOT anything about "king")
- Translate the MEANING and TONE, not the words literally.
Return ONLY the translation.

Text: {text}"""

        def _call():
            return self.groq_client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {"role": "system", "content": self.system_instruction},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=1024,
            )

        try:
            response = await asyncio.to_thread(_call)
            translated = response.choices[0].message.content.strip()
            if not translated:
                raise ValueError("빈 응답")
            detected_source = source_lang or self._detect_language(text)
            cultural_note = None
            if detected_source == "ko":
                cultural_note = await self.detect_nuance(text)
            return {
                "original": text, "translated": translated,
                "source_language": detected_source,
                "target_language": target_lang, "mode": "groq",
                "cultural_note": cultural_note,
            }
        except Exception as e:
            raise RuntimeError(f"[Groq] 번역 실패: {e}")

    async def azure_translate_text(self, text: str, target_lang: str, source_lang: Optional[str] = None) -> str:
        """Azure Translator로 번역 (식단/공지 크롤링 대량 번역용 — 레거시)"""
        result = await self._azure_translate(text, target_lang, source_lang)
        return result.get("translated", text)

# 싱글톤 인스턴스 생성
translation_service = TranslationService()

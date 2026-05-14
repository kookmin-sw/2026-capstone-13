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
    - DeepL 미지원/실패 시 → Groq → Azure
    - Gemini/Google Cloud Translation은 비용 방지를 위해 사용하지 않음
    """

    def __init__(self):
        # DeepL
        self.deepl_key = os.getenv("DEEPL_API_KEY")
        self._deepl_quota_exceeded_at: Optional[float] = None  # 초과 시각 (timestamp)
        if self.deepl_key:
            print("✅ DeepL API 연동 완료")
        else:
            print("⚠️  DEEPL_API_KEY 없음")

        self.google_key = None
        print("ℹ️  Google Cloud Translation 비활성화")

        # Azure Translator (fallback)
        self.azure_key = os.getenv("AZURE_TRANSLATOR_KEY")
        self.azure_region = os.getenv("AZURE_TRANSLATOR_REGION", "koreacentral")
        if self.azure_key and self.azure_key != "your-key":
            print("✅ Azure Translator 연동 완료")
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

        self.gemini_client = None
        self.model_name = None
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
        print("ℹ️  Gemini 비활성화")


    def _detect_language(self, text: str) -> str:
        if any('\uac00' <= c <= '\ud7a3' for c in text):
            return "ko"
        elif any('\u4e00' <= c <= '\u9fff' for c in text):
            return "zh-Hans"
        else:
            return "en"

    async def detect_nuance(self, text: str) -> Optional[str]:
        """한국어 문화적 뉘앙스 감지 (Groq만 사용, 없으면 생략)"""
        prompt = f"""Korean text: "{text}"

Respond "null" UNLESS the text contains very specific Korean slang/internet slang that a foreigner would completely misunderstand even after translation (e.g. 킹받다, 존맛탱, 알잘딱깔센, 내로남불).

Normal sentences, questions, greetings, opinions, complaints = null.
Only truly untranslatable Korean-specific expressions = one short English explanation.

Reply "null" or one sentence only."""

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

    async def translate_text(
        self,
        text: str,
        target_lang: str = "en",
        source_lang: Optional[str] = None,
        prefer_llm: bool = False,
        allow_llm: bool = True,
        context: Optional[str] = None,
    ):
        """단건 번역.

        - prefer_llm=True: 채팅/커뮤니티/통화 자막처럼 말투가 중요한 텍스트. Groq → DeepL → Azure.
        - allow_llm=False: 공지/식단처럼 정형 텍스트. DeepL → Azure.
        - 기본값: DeepL → Groq → Azure.
        Gemini/Google은 사용하지 않음.
        """
        errors = []

        if prefer_llm and allow_llm and self.groq_client:
            try:
                return await self._groq_translate(text, target_lang, source_lang, context)
            except Exception as e:
                errors.append(str(e))

        if target_lang in DEEPL_SUPPORTED and self.deepl_key and not self.deepl_quota_exceeded:
            try:
                result = await self._deepl_translate(text, target_lang, source_lang)
                result["cultural_note"] = None
                return result
            except Exception as e:
                errors.append(str(e))

        if allow_llm and self.groq_client:
            try:
                return await self._groq_translate(text, target_lang, source_lang, context)
            except Exception as e:
                errors.append(str(e))

        if self.azure_key:
            try:
                result = await self._azure_translate(text, target_lang, source_lang)
                result["cultural_note"] = None
                return result
            except Exception as e:
                errors.append(str(e))

        raise RuntimeError("사용 가능한 번역 엔진이 없습니다 (DeepL / Groq / Azure): " + " | ".join(errors))

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
                # 456 = DeepL 월 한도 초과. 비용 방지를 위해 fallback하지 않는다.
                print("[DeepL] ⚠️ 월 사용량 초과 (456) → 번역 중단")
                self.deepl_quota_exceeded = True
            raise RuntimeError(f"DeepL 번역 실패: {e}")
        except Exception as e:
            raise RuntimeError(f"DeepL 번역 실패: {e}")

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
            raise RuntimeError(f"Azure 번역 실패: {e}")

    async def _groq_translate(self, text: str, target_lang: str, source_lang: Optional[str], context: Optional[str] = None):
        """Groq API로 자연스러운 번역 (LLM 기반)"""
        if not self.groq_client:
            raise RuntimeError("GROQ_API_KEY가 설정되지 않았습니다")

        lang_name = LANG_NAMES.get(target_lang, target_lang)
        source_name = LANG_NAMES.get(source_lang or "", source_lang or "the source language")
        if context:
            prompt = f"""Translate this comment from {source_name} into natural, colloquial {lang_name}.
IMPORTANT: This may contain Korean or international student chat slang. Do NOT translate literally.
- If Korean slang appears, translate the meaning and tone. Examples:
  - "개가 뭐래" = "what's their problem" / "what are they on about" (NOT "what does the dog say")
  - "개" as prefix = intensifier meaning "very/super" (NOT "dog")
  - "킹받다" = "so annoying / drives me crazy" (NOT anything about "king")
- Translate the MEANING and TONE, not the words literally.
Use the post context to understand nuance.
Return ONLY the translation.

Post context:
{context}

Comment to translate: {text}"""
        else:
            prompt = f"""Translate this text from {source_name} into natural, colloquial {lang_name}.
IMPORTANT: This may contain Korean or international student chat slang. Do NOT translate literally.
- If Korean slang appears, translate the meaning and tone. Examples:
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

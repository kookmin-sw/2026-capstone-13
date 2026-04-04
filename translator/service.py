# ai/translator/service.py
import os
import asyncio
import requests
import uuid
from typing import Optional

LANG_NAMES = {
    "en": "English", "ko": "Korean", "zh-Hans": "Simplified Chinese",
    "zh-Hant": "Traditional Chinese", "ja": "Japanese", "vi": "Vietnamese",
    "mn": "Mongolian", "fr": "French", "de": "German", "es": "Spanish",
    "ru": "Russian"
}

AZURE_TRANSLATE_URL = "https://api.cognitive.microsofttranslator.com/translate"


class TranslationService:
    """
    Azure Translator (기본) + Gemini (폴백) 번역 서비스
    Azure 키가 없으면 Gemini로, Gemini 키도 없으면 더미 모드
    """

    def __init__(self):
        # Azure Translator
        self.azure_key = os.getenv("AZURE_TRANSLATOR_KEY")
        self.azure_region = os.getenv("AZURE_TRANSLATOR_REGION", "koreacentral")
        if self.azure_key and self.azure_key != "your-key":
            print("✅ Azure Translator 연동 완료")
        else:
            self.azure_key = None
            print("⚠️  AZURE_TRANSLATOR_KEY 없음. Gemini 폴백 시도.")

        # Gemini (폴백 / 문화 뉘앙스용)
        self.gemini_client = None
        self.model_name = 'gemini-2.5-flash'
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
"""
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=gemini_key)
                print("✅ Gemini API 연동 완료 (폴백용)")
            except Exception as e:
                print(f"⚠️  Gemini API 초기화 실패: {e}")
        else:
            print("⚠️  GEMINI_API_KEY 없음.")

    @property
    def dummy_mode(self):
        return self.azure_key is None and self.gemini_client is None

    def _detect_language(self, text: str) -> str:
        if any('\uac00' <= c <= '\ud7a3' for c in text):
            return "ko"
        elif any('\u4e00' <= c <= '\u9fff' for c in text):
            return "zh-Hans"
        else:
            return "en"

    async def detect_nuance(self, text: str) -> Optional[str]:
        """한국어 문화적 뉘앙스 감지 (Gemini 전용)"""
        if not self.gemini_client:
            return None
        try:
            from google import genai
            prompt = f"""You are a Korean cultural expert helping foreigners understand Korean social expressions.

Analyze this Korean text: "{text}"

If this text contains a Korean cultural nuance, indirect expression, or social phrase that a foreigner might misunderstand, explain it in ONE short sentence in English.
If the text is straightforward, respond with exactly: null

Respond ONLY with the explanation or "null". No extra text."""
            response = await asyncio.to_thread(
                self.gemini_client.models.generate_content,
                model=self.model_name,
                contents=prompt,
            )
            result = response.text.strip()
            return None if result.lower() == 'null' else result
        except Exception as e:
            print(f"[Gemini] 뉘앙스 감지 실패: {e}")
            return None

    async def translate_text(self, text: str, target_lang: str = "en", source_lang: Optional[str] = None):
        """번역: Azure → Gemini → dummy 순서로 시도"""
        if self.azure_key:
            result = await self._azure_translate(text, target_lang, source_lang)
        elif self.gemini_client:
            result = await self._gemini_translate(text, target_lang, source_lang)
        else:
            result = self._dummy_translate(text, target_lang, source_lang)

        # 한국어 메시지일 때만 뉘앙스 감지
        detected_source = result.get("source_language", source_lang or "")
        if detected_source == "ko":
            result["cultural_note"] = await self.detect_nuance(text)
        else:
            result["cultural_note"] = None

        return result

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
                AZURE_TRANSLATE_URL,
                headers=headers,
                params=params,
                json=[{"text": text}],
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()

        try:
            data = await asyncio.to_thread(_call)
            translated = data[0]["translations"][0]["text"]
            detected = data[0].get("detectedLanguage", {}).get("language", source_lang or self._detect_language(text))
            return {
                "original": text,
                "translated": translated,
                "source_language": detected,
                "target_language": target_lang,
                "mode": "azure",
            }
        except Exception as e:
            print(f"[Azure] 번역 실패: {e} — Gemini 폴백 시도")
            if self.gemini_client:
                return await self._gemini_translate(text, target_lang, source_lang)
            return self._dummy_translate(text, target_lang, source_lang)

    async def _gemini_translate(self, text: str, target_lang: str, source_lang: Optional[str]):
        """Gemini API로 자연스러운 번역"""
        lang_name = LANG_NAMES.get(target_lang, target_lang)
        prompt = f"""Translate this text into natural, colloquial {lang_name}.
If it's a chat message, make it sound like a native speaker's chat.
Return ONLY the translation.

Text: {text}"""
        try:
            from google import genai
            from google.genai import types
            response = await asyncio.to_thread(
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
            )
            return {
                "original": text,
                "translated": response.text.strip(),
                "source_language": source_lang or self._detect_language(text),
                "target_language": target_lang,
                "mode": "gemini",
            }
        except Exception as e:
            print(f"[Gemini] 번역 실패: {e}")
            return self._dummy_translate(text, target_lang, source_lang)

    def _dummy_translate(self, text: str, target_lang: str, source_lang: Optional[str]):
        """더미 번역 (Azure·Gemini 키 없을 때)"""
        return {
            "original": text,
            "translated": f"{text} [Translated to {target_lang}]",
            "source_language": source_lang or self._detect_language(text),
            "target_language": target_lang,
            "mode": "dummy",
        }

    async def azure_translate_text(self, text: str, target_lang: str, source_lang: Optional[str] = None) -> str:
        """Azure Translator로 번역 (식단/공지 크롤링 대량 번역용)"""
        result = await self._azure_translate(text, target_lang, source_lang)
        return result.get("translated", text)

# 싱글톤 인스턴스 생성
translation_service = TranslationService()

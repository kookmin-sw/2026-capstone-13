# ai/translator/service.py
import os
import asyncio
from typing import Optional

LANG_NAMES = {
    "en": "English", "ko": "Korean", "zh-Hans": "Simplified Chinese",
    "zh-Hant": "Traditional Chinese", "ja": "Japanese", "vi": "Vietnamese",
    "mn": "Mongolian", "fr": "French", "de": "German", "es": "Spanish",
    "ru": "Russian"
}

class TranslationService:
    """
    Gemini API(google-genai)를 사용한 번역 + 한국어 문화적 뉘앙스 감지 서비스
    Gemini 키가 없으면 더미 모드로 동작
    """

    def __init__(self):
        self.client = None
        self.model_name = 'gemini-2.5-flash-lite'
        self.system_instruction = """
You are an expert translator for a matching app between Korean students and international students.
Your goal is to provide natural, casual, and context-aware translations.

- DO NOT translate literally. If a Korean expression is slang or an idiom (e.g., '자살각', '먼지 같다'), translate it into a natural equivalent (e.g., 'I'm so done', 'It's no big deal').
- Maintain the tone: If the source is casual/slang, the translation should be casual/slang.
- Handle profanity naturally: Translate Korean swear words (ㅅㅂ, 존나) into appropriate equivalents (damn, freaking, etc.).
- Context: These are university students chatting. Make it sound like a real Gen Z conversation.
"""

        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=gemini_key)
                print("✅ Gemini API 연동 완료 (google-genai)")
            except Exception as e:
                print(f"⚠️  Gemini API 초기화 실패: {e}")
        else:
            print("⚠️  GEMINI_API_KEY 없음. 더미 모드로 실행됩니다.")

    def _detect_language(self, text: str) -> str:
        if any('\uac00' <= c <= '\ud7a3' for c in text):
            return "ko"
        elif any('\u4e00' <= c <= '\u9fff' for c in text):
            return "zh-Hans"
        else:
            return "en"

    async def detect_nuance(self, text: str) -> Optional[str]:
        """한국어 문화적 뉘앙스 감지"""
        if not self.client:
            return None
        try:
            from google import genai
            from google.genai import types
            prompt = f"""You are a Korean cultural expert helping foreigners understand Korean social expressions.

Analyze this Korean text: "{text}"

If this text contains a Korean cultural nuance, indirect expression, or social phrase that a foreigner might misunderstand, explain it in ONE short sentence in English.
If the text is straightforward, respond with exactly: null

Respond ONLY with the explanation or "null". No extra text."""
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model_name,
                contents=prompt,
            )
            result = response.text.strip()
            return None if result.lower() == 'null' else result
        except Exception as e:
            print(f"[Gemini] 뉘앙스 감지 실패: {e}")
            return None

    async def translate_text(self, text: str, target_lang: str = "en", source_lang: Optional[str] = None):
        """Gemini로 번역 + 한국어 뉘앙스 감지"""
        if not self.client:
            result = self._dummy_translate(text, target_lang, source_lang)
        else:
            result = await self._gemini_translate(text, target_lang, source_lang)

        # 한국어 메시지일 때만 뉘앙스 감지
        detected_source = result.get("source_language", source_lang or "")
        if detected_source == "ko":
            result["cultural_note"] = await self.detect_nuance(text)
        else:
            result["cultural_note"] = None

        return result

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
                self.client.models.generate_content,
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
        """더미 번역 (Gemini 키 없을 때)"""
        return {
            "original": text,
            "translated": f"{text} [Translated to {target_lang}]",
            "source_language": source_lang or self._detect_language(text),
            "target_language": target_lang,
            "mode": "dummy",
        }

# 싱글톤 인스턴스 생성
translation_service = TranslationService()

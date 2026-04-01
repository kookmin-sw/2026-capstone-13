# ai/translator/service.py
import os
import asyncio
from typing import Optional

class TranslationService:
    """
    Azure Translator API를 사용한 번역 서비스
    Azure 키가 없으면 더미 모드로 동작
    Gemini API로 한국어 문화적 뉘앙스 감지
    """

    def __init__(self):
        # 환경변수에서 Azure 키 가져오기
        self.azure_key = os.getenv("AZURE_TRANSLATOR_KEY")
        self.azure_region = os.getenv("AZURE_TRANSLATOR_REGION", "koreacentral")
        self.azure_endpoint = os.getenv("AZURE_TRANSLATOR_ENDPOINT", "https://api.cognitive.microsofttranslator.com")

        # Azure 키가 있으면 실제 모드, 없으면 더미 모드
        self.dummy_mode = not self.azure_key

        if self.dummy_mode:
            print("⚠️  Azure Translator 키가 없습니다. 더미 모드로 실행됩니다.")
        else:
            print("✅ Azure Translator 연동 완료")

        # Gemini API 초기화 (뉘앙스 감지용)
        self.gemini_model = None
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
                print("✅ Gemini API 연동 완료 (뉘앙스 감지 활성화)")
            except Exception as e:
                print(f"⚠️  Gemini API 초기화 실패: {e}")
        else:
            print("⚠️  GEMINI_API_KEY 없음. 뉘앙스 감지 비활성화.")

    async def detect_nuance(self, text: str) -> Optional[str]:
        """한국어 문화적 뉘앙스 감지 (Gemini API) — 뉘앙스 있으면 영어 설명, 없으면 None"""
        if not self.gemini_model:
            return None
        try:
            prompt = f"""You are a Korean cultural expert helping foreigners understand Korean social expressions.

Analyze this Korean text: "{text}"

If this text contains a Korean cultural nuance, indirect expression, or social phrase that a foreigner might misunderstand, explain it in ONE short sentence in English.
If the text is straightforward, respond with exactly: null

Respond ONLY with the explanation or "null". No extra text."""
            response = await asyncio.to_thread(self.gemini_model.generate_content, prompt)
            result = response.text.strip()
            return None if result.lower() == 'null' else result
        except Exception as e:
            print(f"[Gemini] 뉘앙스 감지 실패: {e}")
            return None

    async def _gemini_translate(self, text: str, target_lang: str, source_lang: Optional[str]):
        """Gemini API를 사용한 번역 (Azure 없을 때 폴백)"""
        lang_names = {
            "en": "English", "ko": "Korean", "zh-Hans": "Simplified Chinese",
            "zh-Hant": "Traditional Chinese", "ja": "Japanese", "vi": "Vietnamese",
            "mn": "Mongolian", "fr": "French", "de": "German", "es": "Spanish",
            "ru": "Russian"
        }
        lang_name = lang_names.get(target_lang, target_lang)
        prompt = f"Translate the following text to {lang_name}. Return ONLY the translated text, nothing else.\n\nText: {text}"
        try:
            response = await asyncio.to_thread(self.gemini_model.generate_content, prompt)
            return {
                "original": text,
                "translated": response.text.strip(),
                "source_language": source_lang or self._detect_language_dummy(text),
                "target_language": target_lang,
                "mode": "gemini"
            }
        except Exception as e:
            print(f"[Gemini] 번역 실패: {e}")
            return self._dummy_translate(text, target_lang, source_lang)

    async def translate_text(self, text: str, target_lang: str = "en", source_lang: Optional[str] = None):
        """
        텍스트를 번역하는 함수
        우선순위: Azure → Gemini → Dummy
        """
        if self.dummy_mode:
            if self.gemini_model:
                result = await self._gemini_translate(text, target_lang, source_lang)
            else:
                result = self._dummy_translate(text, target_lang, source_lang)
        else:
            result = await self._azure_translate(text, target_lang, source_lang)

        # 한국어 메시지일 때만 뉘앙스 감지
        detected_source = result.get("source_language", source_lang or "")
        if detected_source == "ko":
            result["cultural_note"] = await self.detect_nuance(text)
        else:
            result["cultural_note"] = None

        return result
    
    def _dummy_translate(self, text: str, target_lang: str, source_lang: Optional[str]):
        """
        더미 번역 (Azure 키 없을 때)
        """
        # 간단한 언어 감지 시뮬레이션
        detected_lang = source_lang or self._detect_language_dummy(text)
        
        # 더미 번역 결과
        translated_text = f"{text} [Translated to {target_lang}]"
        
        return {
            "original": text,
            "translated": translated_text,
            "source_language": detected_lang,
            "target_language": target_lang,
            "mode": "dummy"
        }
    
    def _detect_language_dummy(self, text: str) -> str:
        """
        간단한 언어 감지 (더미)
        한글이 있으면 ko, 한자가 있으면 zh, 아니면 en
        """
        if any('\uac00' <= char <= '\ud7a3' for char in text):
            return "ko"
        elif any('\u4e00' <= char <= '\u9fff' for char in text):
            return "zh-Hans"
        else:
            return "en"
    
    async def _azure_translate(self, text: str, target_lang: str, source_lang: Optional[str]):
        """
        실제 Azure Translator API 호출 (requests 사용)
        """
        import requests as req

        url = self.azure_endpoint + '/translate'
        params = {'api-version': '3.0', 'to': target_lang}
        if source_lang:
            params['from'] = source_lang

        headers = {
            'Ocp-Apim-Subscription-Key': self.azure_key,
            'Ocp-Apim-Subscription-Region': self.azure_region,
            'Content-Type': 'application/json',
        }
        body = [{'text': text}]

        try:
            response = await asyncio.to_thread(
                lambda: req.post(url, params=params, headers=headers, json=body, timeout=10)
            )
            if response.status_code == 200:
                result = response.json()
                translation = result[0]['translations'][0]
                detected_lang = result[0].get('detectedLanguage', {}).get('language', source_lang or 'unknown')
                return {
                    "original": text,
                    "translated": translation['text'],
                    "source_language": detected_lang,
                    "target_language": target_lang,
                    "mode": "azure"
                }
            else:
                print(f"❌ Azure API 에러: {response.status_code} - {response.text}")
                return self._dummy_translate(text, target_lang, source_lang)

        except Exception as e:
            print(f"❌ Azure API 호출 실패: {str(e)}")
            return self._dummy_translate(text, target_lang, source_lang)

# 싱글톤 인스턴스 생성
translation_service = TranslationService()

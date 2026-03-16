# ai/translator/service.py
import os
from typing import Optional

class TranslationService:
    """
    Azure Translator API를 사용한 번역 서비스
    Azure 키가 없으면 더미 모드로 동작
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

    async def translate_text(self, text: str, target_lang: str = "en", source_lang: Optional[str] = None):
        """
        텍스트를 번역하는 함수
        
        Args:
            text: 번역할 텍스트
            target_lang: 목표 언어 (en, ko, zh-Hans, ja 등)
            source_lang: 원본 언어 (None이면 자동 감지)
        
        Returns:
            dict: {
                "original": 원본 텍스트,
                "translated": 번역된 텍스트,
                "source_language": 원본 언어,
                "target_language": 목표 언어
            }
        """
        
        if self.dummy_mode:
            # 더미 모드: 간단한 번역 시뮬레이션
            return self._dummy_translate(text, target_lang, source_lang)
        else:
            # 실제 Azure API 호출
            return await self._azure_translate(text, target_lang, source_lang)
    
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
        실제 Azure Translator API 호출
        """
        import aiohttp
        
        # API 엔드포인트
        path = '/translate'
        constructed_url = self.azure_endpoint + path
        
        # 요청 파라미터
        params = {
            'api-version': '3.0',
            'to': target_lang
        }
        
        if source_lang:
            params['from'] = source_lang
        
        # 요청 헤더
        headers = {
            'Ocp-Apim-Subscription-Key': self.azure_key,
            'Ocp-Apim-Subscription-Region': self.azure_region,
            'Content-type': 'application/json'
        }
        
        # 요청 본문
        body = [{'text': text}]
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(constructed_url, params=params, headers=headers, json=body) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Azure 응답 파싱
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
                        error_text = await response.text()
                        print(f"❌ Azure API 에러: {response.status} - {error_text}")
                        # 에러 시 더미 모드로 폴백
                        return self._dummy_translate(text, target_lang, source_lang)
        
        except Exception as e:
            print(f"❌ Azure API 호출 실패: {str(e)}")
            # 에러 시 더미 모드로 폴백
            return self._dummy_translate(text, target_lang, source_lang)

# 싱글톤 인스턴스 생성
translation_service = TranslationService()

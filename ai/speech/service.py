# ai/speech/service.py
import os
from typing import Optional


LANG_MAP = {
    "ko-KR": "ko", "ko": "ko",
    "en-US": "en", "en": "en",
    "zh-CN": "zh", "zh-Hans": "zh", "zh": "zh",
    "ja-JP": "ja", "ja": "ja",
    "vi-VN": "vi", "vi": "vi",
    "ru-RU": "ru", "ru": "ru",
    "mn": "mn",
}


class SpeechService:
    def __init__(self):
        self.api_key = os.getenv("DEEPGRAM_API_KEY")
        self.dummy_mode = not self.api_key

        if self.dummy_mode:
            print("⚠️  Deepgram 키가 없습니다. 더미 모드로 실행됩니다.")
        else:
            from deepgram import DeepgramClient, AsyncDeepgramClient
            self.client = DeepgramClient(api_key=self.api_key)
            self.async_client = AsyncDeepgramClient(api_key=self.api_key)
            print("✅ Deepgram 연동 완료")

    def transcribe_audio(self, audio_data: bytes, language: Optional[str] = None) -> dict:
        if self.dummy_mode:
            return self._dummy_transcribe(language)
        return self._deepgram_transcribe(audio_data, language)

    def _dummy_transcribe(self, language: Optional[str]) -> dict:
        return {
            "text": "음성 인식 더미 결과입니다. Deepgram API 키를 설정하면 실제 변환됩니다.",
            "language": language or "ko-KR",
            "mode": "dummy"
        }

    def _deepgram_transcribe(self, audio_data: bytes, language: Optional[str]) -> dict:
        lang_code = LANG_MAP.get(language or "", None)

        try:
            if lang_code:
                response = self.client.listen.v1.media.transcribe_file(
                    request=audio_data,
                    model="nova-2",
                    language=lang_code,
                    smart_format=True,
                )
            else:
                response = self.client.listen.v1.media.transcribe_file(
                    request=audio_data,
                    model="nova-2",
                    detect_language=True,
                    smart_format=True,
                )

            channel = response.results.channels[0]
            transcript = channel.alternatives[0].transcript or ""
            detected_lang = channel.detected_language or language or "unknown"

            return {"text": transcript, "language": detected_lang, "mode": "deepgram"}

        except Exception as e:
            print(f"❌ Deepgram 호출 실패: {str(e)}")
            return {"text": "", "language": language, "mode": "deepgram"}


speech_service = SpeechService()

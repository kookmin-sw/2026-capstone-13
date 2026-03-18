# ai/speech/service.py
import os
from typing import Optional


class SpeechService:
    """
    Azure Speech SDK를 사용한 음성 → 텍스트 변환 서비스
    Azure 키가 없으면 더미 모드로 동작
    """

    def __init__(self):
        self.speech_key = os.getenv("AZURE_SPEECH_KEY")
        self.speech_region = os.getenv("AZURE_SPEECH_REGION", "koreacentral")

        # Azure 키가 있으면 실제 모드, 없으면 더미 모드
        self.dummy_mode = not self.speech_key

        if self.dummy_mode:
            print("⚠️  Azure Speech 키가 없습니다. 더미 모드로 실행됩니다.")
        else:
            print("✅ Azure Speech 연동 완료")

    def transcribe_audio(self, audio_data: bytes, language: Optional[str] = None) -> dict:
        """
        오디오 데이터를 텍스트로 변환 (REST용 - 음성 메시지)

        Args:
            audio_data: 오디오 파일 바이트 데이터 (wav 형식 권장)
            language: 인식할 언어 (None이면 자동 감지, 예: ko-KR, en-US, zh-CN)

        Returns:
            dict: {
                "text": 변환된 텍스트,
                "language": 감지된 언어,
                "mode": "azure" | "dummy"
            }
        """
        if self.dummy_mode:
            return self._dummy_transcribe(language)
        else:
            return self._azure_transcribe(audio_data, language)

    def _dummy_transcribe(self, language: Optional[str]) -> dict:
        """
        더미 음성 인식 (Azure 키 없을 때)
        """
        return {
            "text": "음성 인식 더미 결과입니다. Azure Speech 키를 설정하면 실제 변환됩니다.",
            "language": language or "ko-KR",
            "mode": "dummy"
        }

    def _azure_transcribe(self, audio_data: bytes, language: Optional[str]) -> dict:
        """
        실제 Azure Speech SDK 호출
        """
        import azure.cognitiveservices.speech as speechsdk
        import tempfile

        # 오디오 데이터를 임시 파일로 저장
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        try:
            speech_config = speechsdk.SpeechConfig(
                subscription=self.speech_key,
                region=self.speech_region
            )

            # 언어 설정 (없으면 자동 감지)
            if language:
                speech_config.speech_recognition_language = language
            else:
                # 자동 언어 감지 (한국어, 영어, 중국어, 일본어)
                auto_detect_config = speechsdk.languageconfig.AutoDetectSourceLanguageConfig(
                    languages=["ko-KR", "en-US", "zh-CN", "ja-JP", "vi-VN"]
                )
                audio_config = speechsdk.audio.AudioConfig(filename=tmp_path)
                recognizer = speechsdk.SpeechRecognizer(
                    speech_config=speech_config,
                    auto_detect_source_language_config=auto_detect_config,
                    audio_config=audio_config
                )
                result = recognizer.recognize_once()
                detected_lang = speechsdk.AutoDetectSourceLanguageResult(result).language
                return {
                    "text": result.text if result.reason == speechsdk.ResultReason.RecognizedSpeech else "",
                    "language": detected_lang or "unknown",
                    "mode": "azure"
                }

            audio_config = speechsdk.audio.AudioConfig(filename=tmp_path)
            recognizer = speechsdk.SpeechRecognizer(
                speech_config=speech_config,
                audio_config=audio_config
            )
            result = recognizer.recognize_once()

            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                return {
                    "text": result.text,
                    "language": language,
                    "mode": "azure"
                }
            else:
                print(f"❌ Azure Speech 인식 실패: {result.reason}")
                return self._dummy_transcribe(language)

        except Exception as e:
            print(f"❌ Azure Speech 호출 실패: {str(e)}")
            return self._dummy_transcribe(language)

        finally:
            os.remove(tmp_path)


# 싱글톤 인스턴스 생성
speech_service = SpeechService()

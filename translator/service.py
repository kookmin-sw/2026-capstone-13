# ai/translator/service.py

class TranslationService:
    def __init__(self):
        # 나중에 여기에 진짜 Azure 키가 들어갈 자리입니다.
        self.dummy_mode = True 

    async def translate_text(self, text: str, target_lang: str = "en"):
        """
        텍스트를 번역하는 함수 (지금은 뼈대만!)
        """
        # 지금은 키가 없으니 입력받은 글 뒤에 [번역됨]만 붙여서 돌려줍니다.
        translated_text = f"{text} [Translated to {target_lang}]"
        
        return {
            "original": text,
            "translated": translated_text,
            "target_language": target_lang
        }

# 다른 파일에서 불러다 쓸 수 있게 미리 준비해둡니다.
translation_service = TranslationService()
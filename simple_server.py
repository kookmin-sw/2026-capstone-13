# simple_server.py - Python 3.15 호환 간단한 번역 서버
import asyncio
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import sys
import os

# 모듈 import
sys.path.insert(0, os.path.dirname(__file__))
from translator.service import translation_service
from crawler.kookmin import crawl_all

# 지원 언어 목록 (유학생 주요 언어)
SUPPORTED_LANGUAGES = ["en", "zh-Hans", "zh-Hant", "ja", "vi", "mn", "fr", "de", "es"]

class TranslationHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """GET 요청 처리"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {"status": "AI 서버 정상 작동 중"}
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        
        elif parsed_path.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                "status": "healthy",
                "azure_connected": not translation_service.dummy_mode
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        
        elif parsed_path.path == '/api/notices/crawl':
            self._handle_crawl()

        else:
            self.send_response(404)
            self.end_headers()

    def _handle_crawl(self):
        """국민대 공지 크롤링 + 다국어 번역"""
        try:
            print("[공지 크롤러] 크롤링 시작...")
            raw_notices = crawl_all()
            print(f"[공지 크롤러] 총 {len(raw_notices)}건 수집, 번역 시작...")

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self._translate_notices(raw_notices))
            loop.close()

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "message": f"{len(result)}건 수집 및 번역 완료",
                "data": result
            }, ensure_ascii=False).encode('utf-8'))

        except Exception as e:
            print(f"[공지 크롤러] 오류: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "message": f"크롤링 실패: {str(e)}",
                "data": None
            }, ensure_ascii=False).encode('utf-8'))

    async def _translate_notices(self, notices: list) -> list:
        """공지 목록을 모든 지원 언어로 번역"""
        result = []
        for notice in notices:
            title_ko = notice["title"]
            translations = {}

            for lang in SUPPORTED_LANGUAGES:
                try:
                    translated = await translation_service.translate_text(title_ko, lang, "ko")
                    translations[lang] = translated.get("translated", title_ko)
                except Exception:
                    translations[lang] = title_ko

            result.append({
                "title_ko": title_ko,
                "translations": translations,
                "link": notice["link"],
                "date": notice["date"],
                "category_id": notice["category_id"],
                "category_name": notice["category_name"],
            })
        return result

    def do_POST(self):
        """POST 요청 처리"""
        if self.path == '/api/translate':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # JSON 파싱
                data = json.loads(post_data.decode('utf-8'))
                text = data.get('text', '')
                target_lang = data.get('target_lang', 'en')
                source_lang = data.get('source_lang')
                
                # 번역 실행 (asyncio 사용)
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(
                    translation_service.translate_text(text, target_lang, source_lang)
                )
                loop.close()
                
                # 응답 생성
                mode_message = "Azure 번역 완료" if result.get("mode") == "azure" else "더미 모드 번역 (Azure 키 필요)"
                response = {
                    "success": True,
                    "message": mode_message,
                    "data": result
                }
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {
                    "success": False,
                    "message": f"번역 실패: {str(e)}",
                    "data": None
                }
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        """CORS preflight 요청 처리"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """로그 출력"""
        print(f"[{self.log_date_time_string()}] {format % args}")

def run_server(port=8000):
    """서버 실행"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, TranslationHandler)
    print(f"🚀 AI 번역 서버가 http://localhost:{port} 에서 실행 중입니다.")
    print(f"⚠️  Azure 모드: {'연결됨' if not translation_service.dummy_mode else '더미 모드'}")
    print(f"\n사용 가능한 엔드포인트:")
    print(f"  GET  http://localhost:{port}/")
    print(f"  GET  http://localhost:{port}/health")
    print(f"  POST http://localhost:{port}/api/translate")
    print(f"\n종료하려면 Ctrl+C를 누르세요.\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n서버를 종료합니다...")
        httpd.shutdown()

if __name__ == '__main__':
    run_server()

# ai/speech/realtime.py - 실시간 음성 인식 WebSocket 서버 (통화 자막용)
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

try:
    import websockets
except ImportError:
    print("❌ websockets 패키지가 없습니다. pip install websockets")
    sys.exit(1)

from speech.service import speech_service


async def handle_speech_stream(websocket):
    """
    WebSocket 연결 처리 - 실시간 음성 스트리밍 자막

    클라이언트 → 서버: 오디오 청크 (bytes) 또는 JSON 설정
    서버 → 클라이언트: 인식된 텍스트 JSON
    """
    client_addr = websocket.remote_address
    print(f"[WebSocket] 연결됨: {client_addr}")

    language = None  # 기본값: 자동 감지

    try:
        async for message in websocket:
            # JSON 설정 메시지 처리 (언어 설정 등)
            if isinstance(message, str):
                try:
                    config = json.loads(message)
                    if "language" in config:
                        language = config["language"]
                        print(f"[WebSocket] 언어 설정: {language}")
                        await websocket.send(json.dumps({
                            "type": "config_ack",
                            "language": language
                        }))
                except json.JSONDecodeError:
                    pass
                continue

            # 오디오 청크 처리 (bytes)
            if isinstance(message, bytes) and len(message) > 0:
                result = speech_service.transcribe_audio(message, language)

                response = {
                    "type": "transcript",
                    "text": result.get("text", ""),
                    "language": result.get("language", "unknown"),
                    "mode": result.get("mode", "dummy")
                }

                await websocket.send(json.dumps(response, ensure_ascii=False))

    except websockets.exceptions.ConnectionClosedOK:
        print(f"[WebSocket] 연결 종료: {client_addr}")
    except websockets.exceptions.ConnectionClosedError as e:
        print(f"[WebSocket] 연결 오류: {client_addr} - {e}")
    except Exception as e:
        print(f"[WebSocket] 예외: {e}")
        try:
            await websocket.send(json.dumps({
                "type": "error",
                "message": str(e)
            }))
        except Exception:
            pass


async def run_ws_server(port=8001):
    """WebSocket 서버 실행"""
    print(f"🎙️  음성 WebSocket 서버가 ws://localhost:{port}/ws/speech 에서 실행 중입니다.")
    print(f"⚠️  Azure 모드: {'연결됨' if not speech_service.dummy_mode else '더미 모드'}")

    async with websockets.serve(handle_speech_stream, "", port):
        await asyncio.Future()  # 서버 계속 실행


if __name__ == "__main__":
    port = int(os.environ.get("WS_PORT", 8001))
    asyncio.run(run_ws_server(port))

// 음성/영상 통화 화면 - Agora RTC + 실시간 자막
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '@stomp/stompjs';
import * as SecureStore from 'expo-secure-store';
import { getAgoraToken } from '../services/agoraService';
import { getAiSpeechToken } from '../services/aiService';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  IRtcEngineEventHandler,
  IAudioFrameObserver,
  RawAudioFrameOpModeType,
  RtcSurfaceView,
  ChannelProfileType,
  ClientRoleType,
  VideoSourceType,
} from 'react-native-agora';

// WAV 헤더 + PCM 데이터를 합쳐 ArrayBuffer로 반환
const buildWavBuffer = (pcm: Uint8Array, sampleRate: number, channels: number): ArrayBuffer => {
  const bps = 16;
  const wav = new Uint8Array(44 + pcm.length);
  const v = new DataView(wav.buffer);
  [0x52,0x49,0x46,0x46].forEach((b,i) => v.setUint8(i,b));        // "RIFF"
  v.setUint32(4, 36 + pcm.length, true);
  [0x57,0x41,0x56,0x45].forEach((b,i) => v.setUint8(8+i,b));      // "WAVE"
  [0x66,0x6D,0x74,0x20].forEach((b,i) => v.setUint8(12+i,b));     // "fmt "
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels * bps / 8, true);
  v.setUint16(32, channels * bps / 8, true);
  v.setUint16(34, bps, true);
  [0x64,0x61,0x74,0x61].forEach((b,i) => v.setUint8(36+i,b));     // "data"
  v.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);
  return wav.buffer;
};

const PCM_TARGET_SIZE = 16000 * 2 * 1.5; // 1.5초: 16kHz 16-bit mono
const PCM_SPEECH_THRESHOLD = 260;

const hasSpeech = (pcm: Uint8Array): boolean => {
  let total = 0;
  let count = 0;
  for (let i = 0; i + 1 < pcm.length; i += 32) {
    let sample = pcm[i] | (pcm[i + 1] << 8);
    if (sample >= 0x8000) sample -= 0x10000;
    total += Math.abs(sample);
    count += 1;
  }
  return count > 0 && total / count > PCM_SPEECH_THRESHOLD;
};

const PRIMARY = '#4F46E5';
const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';
const WS_SPEECH_URL = process.env.EXPO_PUBLIC_AI_WS_URL ?? 'ws://localhost:8001';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';
const WS_URL = BASE_URL.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws-native';

interface Transcript {
  id: string;
  text: string;
  language: string;
}

export default function VideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    roomId: string;
    partnerNickname: string;
    language?: string;
    voiceOnly?: string;
    myUserId?: string;
    partnerUserId?: string;
    targetLanguage?: string;
  }>();

  const partnerNickname = params.partnerNickname ?? '상대방';
  const myLanguage = params.language ?? 'ko-KR';
  const isVoiceOnly = params.voiceOnly === 'true';
  const myUserId = params.myUserId ? Number(params.myUserId) : null;
  const partnerUserId = params.partnerUserId ? Number(params.partnerUserId) : null;
  const targetLanguage = params.targetLanguage ?? 'en';
  const channelName = `room_${params.roomId}`;

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const engineRef = useRef<IRtcEngine | null>(null);
  const eventHandlerRef = useRef<IRtcEngineEventHandler | null>(null);
  const audioObserverRef = useRef<IAudioFrameObserver | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsConnectingRef = useRef<boolean>(false);
  const stompRef = useRef<Client | null>(null);
  const pcmBufferRef = useRef<Uint8Array[]>([]);
  const pcmBufferSizeRef = useRef<number>(0);
  const pcmSampleRateRef = useRef<number>(16000);
  const pcmChannelsRef = useRef<number>(1);
  const isStreamingRef = useRef<boolean>(false);
  const showSubtitlesRef = useRef<boolean>(true);
  const pendingSubtitleRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bcp47ToLang: Record<string, string> = { 'ko-KR': 'ko', 'en-US': 'en', 'ja-JP': 'ja', 'zh-CN': 'zh-Hans', 'ru-RU': 'ru', 'mn-MN': 'mn', 'vi-VN': 'vi' };
  const myLangCode = bcp47ToLang[myLanguage] ?? 'en';
  const myCaptionLang = myLangCode;
  const effectiveTargetLangRef = useRef(targetLanguage);
  const connectWebSocketRef = useRef<() => void | Promise<void>>(() => {});
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 통화 시간 타이머
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Android 권한 요청
  const requestAndroidPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const audio = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (audio !== PermissionsAndroid.RESULTS.GRANTED) return false;
    if (isVoiceOnly) return true;
    const camera = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    return camera === PermissionsAndroid.RESULTS.GRANTED;
  };

  // Agora 초기화 및 채널 입장
  useEffect(() => {
    let released = false;

    const cleanupAgora = () => {
      const engine = engineRef.current;
      try {
        if (engine && audioObserverRef.current) {
          engine.getMediaEngine().unregisterAudioFrameObserver(audioObserverRef.current);
        }
      } catch (error) {
        console.log('[Agora] 오디오 프레임 옵저버 해제 실패:', error);
      }
      audioObserverRef.current = null;

      try {
        if (engine && eventHandlerRef.current) {
          engine.unregisterEventHandler(eventHandlerRef.current);
        }
      } catch (error) {
        console.log('[Agora] 이벤트 핸들러 해제 실패:', error);
      }
      eventHandlerRef.current = null;

      try {
        engine?.stopPreview();
        engine?.leaveChannel();
        engine?.release();
      } catch (error) {
        console.log('[Agora] 엔진 정리 실패:', error);
      }
      engineRef.current = null;
    };

    const initAgora = async () => {
      try {
        if (!params.roomId) {
          Alert.alert('통화 오류', '통화방 정보가 없습니다.');
          router.back();
          return;
        }

        const hasPermission = await requestAndroidPermissions();
        if (!hasPermission) {
          Alert.alert('권한 필요', '마이크/카메라 권한을 허용해주세요.');
          router.back();
          return;
        }

        if (!AGORA_APP_ID) {
          Alert.alert('설정 오류', 'Agora App ID가 설정되지 않았습니다.\n.env 파일을 확인해주세요.');
          return;
        }

        const engine = createAgoraRtcEngine();
        if (released) {
          engine.release();
          return;
        }
        engineRef.current = engine;

        const initResult = engine.initialize({
          appId: AGORA_APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });
        if (initResult !== 0) {
          throw new Error(`Agora initialize failed: ${initResult}`);
        }

        const handler: IRtcEngineEventHandler = {
          onJoinChannelSuccess: () => {
            if (released || !isMountedRef.current) return;
            setIsJoined(true);
            console.log('[Agora] 채널 입장 성공:', channelName);
          },
          onError: (err, msg) => {
            if (released || !isMountedRef.current) return;
            console.error('[Agora] 오류:', err, msg);
            Alert.alert('Agora 오류', `코드: ${err}\n${msg}`);
          },
          onUserJoined: (_connection, uid) => {
            if (released || !isMountedRef.current) return;
            setRemoteUid(uid);
          },
          onUserOffline: () => {
            if (released || !isMountedRef.current) return;
            setRemoteUid(null);
            Alert.alert('통화 종료', '상대방이 통화를 종료했습니다.', [
              { text: '확인', onPress: () => router.back() },
            ]);
          },
        };

        engine.registerEventHandler(handler);
        eventHandlerRef.current = handler;

        engine.enableAudio();
        engine.setEnableSpeakerphone(true);

        // 16kHz 모노 16-bit PCM 프레임 요청 (300ms 단위)
        engine.setRecordingAudioFrameParameters(
          16000, 1,
          RawAudioFrameOpModeType.RawAudioFrameOpModeReadOnly,
          4800
        );

        const audioObserver: IAudioFrameObserver = {
          onRecordAudioFrame: (_channelId, audioFrame) => {
            if (released || !isMountedRef.current || !isStreamingRef.current) return;
            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            const pcm = audioFrame.buffer;
            if (!pcm) { console.log('[자막] 오디오 프레임 buffer 없음'); return; }
            if (audioFrame.samplesPerSec) pcmSampleRateRef.current = audioFrame.samplesPerSec;
            if (audioFrame.channels) pcmChannelsRef.current = audioFrame.channels;
            pcmBufferRef.current.push(new Uint8Array(pcm));
            pcmBufferSizeRef.current += pcm.length;
            if (pcmBufferSizeRef.current >= PCM_TARGET_SIZE) {
              const combined = new Uint8Array(pcmBufferSizeRef.current);
              let offset = 0;
              for (const chunk of pcmBufferRef.current) { combined.set(chunk, offset); offset += chunk.length; }
              pcmBufferRef.current = [];
              pcmBufferSizeRef.current = 0;
              if (!hasSpeech(combined)) {
                return;
              }
              console.log('[자막] PCM 전송:', combined.length, 'bytes, sr:', pcmSampleRateRef.current);
              try {
                ws.send(buildWavBuffer(combined, pcmSampleRateRef.current, pcmChannelsRef.current));
              } catch (error) {
                console.log('[자막] PCM 전송 실패:', error);
              }
            }
          },
        };
        engine.getMediaEngine().registerAudioFrameObserver(audioObserver);
        audioObserverRef.current = audioObserver;

        if (!isVoiceOnly) {
          engine.enableVideo();
          engine.startPreview();
        }

        // 백엔드에서 Agora 토큰 발급
        const agoraToken = await getAgoraToken(channelName);
        if (released || !isMountedRef.current) return;
        if (typeof agoraToken !== 'string') {
          Alert.alert('통화 오류', '통화 토큰을 가져오지 못했습니다.');
          router.back();
          return;
        }

        engine.joinChannel(agoraToken, channelName, 0, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          publishCameraTrack: !isVoiceOnly,
          autoSubscribeAudio: true,
          autoSubscribeVideo: !isVoiceOnly,
        });
      } catch (error) {
        console.error('[Agora] 초기화 실패:', error);
        cleanupAgora();
        if (isMountedRef.current) {
          Alert.alert('통화 오류', '통화 연결을 시작하지 못했습니다.');
          router.back();
        }
      }
    };

    initAgora();

    return () => {
      released = true;
      isStreamingRef.current = false;
      cleanupAgora();
    };
  }, []);

  // 스피커 ON/OFF
  const handleSpeaker = () => {
    const next = !isSpeaker;
    engineRef.current?.setEnableSpeakerphone(next);
    setIsSpeaker(next);
  };

  // 음소거 (실제 Agora 스트림 제어)
  const handleMute = () => {
    const next = !isMuted;
    engineRef.current?.muteLocalAudioStream(next);
    setIsMuted(next);
  };

  // 카메라 ON/OFF
  const handleCameraToggle = () => {
    const next = !isCameraOff;
    engineRef.current?.muteLocalVideoStream(next);
    setIsCameraOff(next);
  };

  // 전면/후면 카메라 전환
  const handleSwitchCamera = () => {
    engineRef.current?.switchCamera();
  };

  const closeSpeechWebSocket = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    wsConnectingRef.current = false;
    if (!ws) return;
    try {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
    } catch {
      // 이미 닫힌 소켓은 무시
    }
  }, []);

  // STOMP 연결 (번역 자막 relay용)
  const connectStomp = useCallback(async () => {
    console.log('[자막] connectStomp 시작, myUserId:', myUserId);
    if (!myUserId) {
      console.log('[자막] myUserId 없음 - STOMP 연결 중단');
      return;
    }
    if (stompRef.current?.active || stompRef.current?.connected) {
      return;
    }
    const token = await SecureStore.getItemAsync('accessToken');
    if (!isMountedRef.current) return;
    const client = new Client({
      webSocketFactory: () => new WebSocket(WS_URL),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      reconnectDelay: 5000,
      onConnect: () => {
        if (!isMountedRef.current || stompRef.current !== client) return;
        console.log('[자막] STOMP 연결 성공, 구독:', `/topic/call/${myUserId}`);
        if (partnerUserId && pendingSubtitleRef.current.length > 0) {
          pendingSubtitleRef.current.forEach((subtitleText) => {
            client.publish({
              destination: '/app/call/signal',
              body: JSON.stringify({
                type: 'subtitle',
                fromUserId: myUserId,
                toUserId: partnerUserId,
                subtitleText,
              }),
            });
          });
          pendingSubtitleRef.current = [];
        }
        client.subscribe(`/topic/call/${myUserId}`, (frame) => {
          console.log('[자막] STOMP 메시지 수신:', frame.body);
          try {
            const msg = JSON.parse(frame.body);
            const messageType = typeof msg.type === 'string' ? msg.type.toLowerCase() : '';
            if (messageType === 'lang_handshake') {
              const partnerCaptionLang = msg.lang as string;
              if (partnerCaptionLang && partnerCaptionLang !== effectiveTargetLangRef.current) {
                console.log('[자막] 언어 핸드셰이크 수신, targetLanguage 변경:', partnerCaptionLang);
                effectiveTargetLangRef.current = partnerCaptionLang;
                closeSpeechWebSocket();
                connectWebSocketRef.current();
              }
              return;
            }
            const incomingSubtitle = msg.subtitleText ?? msg.translatedText;
            if (messageType === 'subtitle' && incomingSubtitle && showSubtitlesRef.current && isMountedRef.current) {
              setTranscripts((prev) => [...prev, {
                id: Date.now().toString(),
                text: incomingSubtitle as string,
                language: effectiveTargetLangRef.current,
              }].slice(-3));
            }
          } catch {
            // 파싱 오류 무시
          }
        });
        if (partnerUserId) {
          client.publish({
            destination: '/app/call/signal',
            body: JSON.stringify({ type: 'lang_handshake', fromUserId: myUserId, toUserId: partnerUserId, lang: myCaptionLang }),
          });
        }
      },
      onDisconnect: () => console.log('[자막] STOMP 연결 끊김'),
      onStompError: (frame) => console.log('[자막] STOMP 오류:', frame.headers['message']),
    });
    client.activate();
    stompRef.current = client;
  }, [myUserId, myCaptionLang, partnerUserId, closeSpeechWebSocket]);

  // 통화 시작 시 자동으로 STOMP 구독 (자막 수신 대기)
  useEffect(() => {
    if (!myUserId) return;
    connectStomp();
    return () => {
      const client = stompRef.current;
      stompRef.current = null;
      client?.deactivate().catch((error) => {
        console.log('[자막] STOMP 해제 실패:', error);
      });
    };
  }, [myUserId, connectStomp]);


  // WebSocket 연결 (AI 자막용)
  const connectWebSocket = useCallback(async () => {
    const existing = wsRef.current;
    if (
      wsConnectingRef.current ||
      existing?.readyState === WebSocket.OPEN ||
      existing?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }
    wsConnectingRef.current = true;
    console.log('[자막] AI WebSocket 연결 시도:', WS_SPEECH_URL);
    let speechToken: string;
    try {
      speechToken = await getAiSpeechToken();
    } catch (e) {
      console.log('[자막] AI WebSocket 토큰 발급 실패:', e);
      wsConnectingRef.current = false;
      if (isMountedRef.current) setIsConnected(false);
      return;
    }
    if (!isMountedRef.current) {
      wsConnectingRef.current = false;
      return;
    }
    const separator = WS_SPEECH_URL.includes('?') ? '&' : '?';
    const wsUrl = `${WS_SPEECH_URL}${separator}token=${encodeURIComponent(speechToken)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => {
      if (!isMountedRef.current || wsRef.current !== ws) {
        ws.close();
        return;
      }
      wsConnectingRef.current = false;
      console.log('[자막] AI WebSocket 연결 성공, language:', myLanguage, 'target:', effectiveTargetLangRef.current);
      setIsConnected(true);
      ws.send(JSON.stringify({ language: myLanguage, target_language: effectiveTargetLangRef.current }));
    };
    ws.onerror = (e) => {
      console.log('[자막] AI WebSocket 오류:', e);
      wsConnectingRef.current = false;
      if (isMountedRef.current && wsRef.current === ws) setIsConnected(false);
    };
    ws.onmessage = (event) => {
      if (!isMountedRef.current || wsRef.current !== ws) return;
      try {
        const data = JSON.parse(event.data as string);
        console.log('[자막] AI 응답:', JSON.stringify(data));

        if (data.type === 'transcript') {
          const subtitleText = (data.translated || data.text || '').trim();
          if (!subtitleText || !partnerUserId) return;

          if (stompRef.current?.connected) {
            console.log('[자막] STOMP 전송 → partnerUserId:', partnerUserId, '내용:', subtitleText);
            stompRef.current.publish({
              destination: '/app/call/signal',
              body: JSON.stringify({
                type: 'subtitle',
                fromUserId: myUserId,
                toUserId: partnerUserId,
                subtitleText,
              }),
            });
          } else {
            console.log('[자막] STOMP 미연결 - 자막 대기열 저장:', subtitleText);
            pendingSubtitleRef.current = [...pendingSubtitleRef.current.slice(-2), subtitleText];
          }
        }
      } catch {
        // 파싱 오류 무시
      }
    };
    ws.onclose = () => {
      wsConnectingRef.current = false;
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      if (isMountedRef.current) setIsConnected(false);
    };
  }, [myLanguage, myUserId, partnerUserId]);

  useEffect(() => {
    connectWebSocketRef.current = connectWebSocket;
  }, [connectWebSocket]);

  // 채널 입장 시 자동으로 오디오 스트리밍 시작 (자막 버튼과 무관)
  useEffect(() => {
    if (!isJoined) return;
    connectWebSocket();
    isStreamingRef.current = true;
    return () => {
      isStreamingRef.current = false;
      pcmBufferRef.current = [];
      pcmBufferSizeRef.current = 0;
      closeSpeechWebSocket();
    };
  }, [isJoined, connectWebSocket, closeSpeechWebSocket]);

  // 상대방이 Agora 채널에 입장하면 언어 핸드셰이크 재전송
  useEffect(() => {
    if (remoteUid !== null && stompRef.current?.connected && partnerUserId && myUserId) {
      stompRef.current.publish({
        destination: '/app/call/signal',
        body: JSON.stringify({ type: 'lang_handshake', fromUserId: myUserId, toUserId: partnerUserId, lang: myCaptionLang }),
      });
    }
  }, [remoteUid]);

  // 자막 스트리밍 중지
  const stopStreaming = () => {
    isStreamingRef.current = false;
    if (isMountedRef.current) setIsStreaming(false);
    pcmBufferRef.current = [];
    pcmBufferSizeRef.current = 0;
    pendingSubtitleRef.current = [];
    closeSpeechWebSocket();
    if (isMountedRef.current) {
      setIsConnected(false);
      setTranscripts([]);
    }
  };

  // 통화 종료
  const handleEndCall = () => {
    stopStreaming();
    router.back();
  };

  return (
    <View style={styles.container}>

      {/* 영상통화: 원격 영상 (전체화면) */}
      {!isVoiceOnly && (
        <View style={styles.remoteVideoContainer}>
          {remoteUid !== null ? (
            <RtcSurfaceView
              style={styles.remoteVideo}
              canvas={{ uid: remoteUid }}
            />
          ) : (
            <View style={styles.waitingContainer}>
              <Ionicons name="videocam-off" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.waitingText}>
                {isJoined ? '상대방 연결 대기 중...' : '채널 연결 중...'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 음성통화: 아바타 */}
      {isVoiceOnly && (
        <View style={styles.voiceHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{partnerNickname.charAt(0)}</Text>
          </View>
          <Text style={styles.partnerName}>{partnerNickname}</Text>
          <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, isJoined && styles.statusDotActive]} />
            <Text style={styles.statusText}>
              {isJoined ? (remoteUid !== null ? '통화 중' : '상대방 대기 중') : '연결 중...'}
            </Text>
          </View>
        </View>
      )}

      {/* 영상통화: 내 화면 (PiP) */}
      {!isVoiceOnly && !isCameraOff && (
        <View style={styles.localVideoContainer}>
          <RtcSurfaceView
            style={styles.localVideo}
            canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
          />
        </View>
      )}

      {/* 영상통화: 상단 오버레이 정보 */}
      {!isVoiceOnly && (
        <View style={styles.videoHeader}>
          <Text style={styles.partnerNameOverlay}>{partnerNickname}</Text>
          <Text style={styles.callDurationOverlay}>{formatDuration(callDuration)}</Text>
        </View>
      )}

      {/* 실시간 자막 */}
      {isStreaming && transcripts.length > 0 && (
        <View style={[styles.subtitleArea, isVoiceOnly && styles.subtitleAreaVoice]}>
          {transcripts.map((t) => (
            <View key={t.id} style={styles.subtitleBubble}>
              <Text style={styles.subtitleText}>{t.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 하단 컨트롤 버튼 */}
      <View style={styles.controls}>
        {/* 음소거 */}
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={handleMute}
        >
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={22} color="#FFFFFF" />
          <Text style={styles.controlLabel}>{isMuted ? '해제' : '음소거'}</Text>
        </TouchableOpacity>

        {/* 스피커 */}
        <TouchableOpacity
          style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
          onPress={handleSpeaker}
        >
          <Ionicons name={isSpeaker ? 'volume-high' : 'volume-mute'} size={22} color="#FFFFFF" />
          <Text style={styles.controlLabel}>{isSpeaker ? '스피커' : '이어폰'}</Text>
        </TouchableOpacity>

        {/* 자막 */}
        <TouchableOpacity
          style={[styles.controlBtn, isStreaming && styles.controlBtnActive]}
          onPress={() => {
            const next = !isStreaming;
            showSubtitlesRef.current = next;
            setIsStreaming(next);
            if (!next) setTranscripts([]);
          }}
        >
          <Ionicons name={isConnected ? 'text' : 'text-outline'} size={22} color="#FFFFFF" />
          <Text style={styles.controlLabel}>{isStreaming ? '자막중지' : '자막'}</Text>
        </TouchableOpacity>

        {/* 통화 종료 */}
        <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
          <Ionicons name="call" size={24} color="#FFFFFF" />
          <Text style={styles.controlLabel}>종료</Text>
        </TouchableOpacity>

        {/* 카메라 ON/OFF (영상통화만) */}
        {!isVoiceOnly && (
          <TouchableOpacity
            style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
            onPress={handleCameraToggle}
          >
            <Ionicons name={isCameraOff ? 'videocam-off' : 'videocam'} size={22} color="#FFFFFF" />
            <Text style={styles.controlLabel}>{isCameraOff ? '켜기' : '카메라'}</Text>
          </TouchableOpacity>
        )}

        {/* 전면/후면 전환 (영상통화 + 카메라 켜진 경우만) */}
        {!isVoiceOnly && !isCameraOff && (
          <TouchableOpacity style={styles.controlBtn} onPress={handleSwitchCamera}>
            <Ionicons name="camera-reverse" size={22} color="#FFFFFF" />
            <Text style={styles.controlLabel}>전환</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // 영상통화 레이아웃
  remoteVideoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111111',
  },
  remoteVideo: {
    flex: 1,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  waitingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  localVideoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 24,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  localVideo: {
    flex: 1,
  },
  videoHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 24,
    left: 16,
    gap: 4,
  },
  partnerNameOverlay: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  callDurationOverlay: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // 음성통화 레이아웃
  voiceHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#1E1B4B',
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 38, fontWeight: '700', color: '#FFFFFF' },
  partnerName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  callDuration: { fontSize: 16, color: '#A5B4FC' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B7280',
  },
  statusDotActive: { backgroundColor: '#10B981' },
  statusText: { fontSize: 13, color: '#E5E7EB' },

  // 자막
  subtitleArea: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    gap: 6,
  },
  subtitleAreaVoice: {
    bottom: 140,
  },
  subtitleBubble: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  subtitleText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },

  // 하단 컨트롤
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlBtn: {
    alignItems: 'center',
    gap: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: PRIMARY },
  controlLabel: { fontSize: 10, color: '#E5E7EB' },
  endCallBtn: {
    alignItems: 'center',
    gap: 4,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
  },
});

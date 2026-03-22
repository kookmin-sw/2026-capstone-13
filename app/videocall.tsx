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
import {
  createAgoraRtcEngine,
  IRtcEngine,
  IRtcEngineEventHandler,
  RtcSurfaceView,
  ChannelProfileType,
  ClientRoleType,
  VideoSourceType,
} from 'react-native-agora';
import { Audio } from 'expo-av';

const PRIMARY = '#4F46E5';
const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';
const AGORA_TEMP_TOKEN = process.env.EXPO_PUBLIC_AGORA_TEMP_TOKEN ?? '';
const WS_SPEECH_URL = process.env.EXPO_PUBLIC_AI_WS_URL ?? 'ws://localhost:8001';

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
  }>();

  const partnerNickname = params.partnerNickname ?? '상대방';
  const myLanguage = params.language ?? 'ko-KR';
  const isVoiceOnly = params.voiceOnly === 'true';
  const channelName = 'room_1'; // TODO: 백엔드 토큰 API 연동 후 `room_${params.roomId}` 로 변경

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const engineRef = useRef<IRtcEngine | null>(null);
  const eventHandlerRef = useRef<IRtcEngineEventHandler | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isStreamingRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 통화 시간 타이머
  useEffect(() => {
    timerRef.current = setInterval(() => {
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
    const permissions: string[] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
    if (!isVoiceOnly) permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
    const grants = await PermissionsAndroid.requestMultiple(permissions);
    return permissions.every(
      (p) => grants[p] === PermissionsAndroid.RESULTS.GRANTED
    );
  };

  // Agora 초기화 및 채널 입장
  useEffect(() => {
    const initAgora = async () => {
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
      engineRef.current = engine;

      engine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      const handler: IRtcEngineEventHandler = {
        onJoinChannelSuccess: () => {
          setIsJoined(true);
          console.log('[Agora] 채널 입장 성공:', channelName);
        },
        onError: (err, msg) => {
          console.error('[Agora] 오류:', err, msg);
          Alert.alert('Agora 오류', `코드: ${err}\n${msg}`);
        },
        onUserJoined: (_connection, uid) => {
          setRemoteUid(uid);
        },
        onUserOffline: () => {
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

      if (!isVoiceOnly) {
        engine.enableVideo();
        engine.startPreview();
      }

      // 채널 입장 (임시 토큰 사용 - 추후 백엔드 토큰 API로 교체 필요)
      engine.joinChannel(AGORA_TEMP_TOKEN, channelName, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: !isVoiceOnly,
        autoSubscribeAudio: true,
        autoSubscribeVideo: !isVoiceOnly,
      });
    };

    initAgora();

    return () => {
      if (eventHandlerRef.current) {
        engineRef.current?.unregisterEventHandler(eventHandlerRef.current);
      }
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
      engineRef.current = null;
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

  // WebSocket 연결 (자막용)
  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket(WS_SPEECH_URL);
    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({ language: myLanguage }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'transcript' && data.text) {
          setTranscripts((prev) => {
            const updated = [...prev, {
              id: Date.now().toString(),
              text: data.text as string,
              language: data.language as string,
            }];
            return updated.slice(-3);
          });
        }
      } catch {
        // 파싱 오류 무시
      }
    };
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);
    wsRef.current = ws;
  }, [myLanguage]);

  // 자막 스트리밍 시작
  const startStreaming = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert('권한 필요', '마이크 권한을 허용해주세요.');
      return;
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    connectWebSocket();
    isStreamingRef.current = true;
    setIsStreaming(true);

    const loopRecording = async () => {
      while (isStreamingRef.current) {
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync().catch(() => {});
          recordingRef.current = null;
        }
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await recording.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
        const uri = recording.getURI();
        if (!uri || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) continue;
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();
        wsRef.current.send(arrayBuffer);
      }
    };

    loopRecording();
  };

  // 자막 스트리밍 중지
  const stopStreaming = async () => {
    isStreamingRef.current = false;
    setIsStreaming(false);
    await recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    recordingRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  };

  // 통화 종료
  const handleEndCall = async () => {
    await stopStreaming();
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
      {transcripts.length > 0 && (
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
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#FFFFFF" />
          <Text style={styles.controlLabel}>{isMuted ? '해제' : '음소거'}</Text>
        </TouchableOpacity>

        {/* 스피커 */}
        <TouchableOpacity
          style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
          onPress={handleSpeaker}
        >
          <Ionicons name={isSpeaker ? 'volume-high' : 'volume-mute'} size={24} color="#FFFFFF" />
          <Text style={styles.controlLabel}>{isSpeaker ? '스피커' : '이어폰'}</Text>
        </TouchableOpacity>

        {/* 자막 */}
        <TouchableOpacity
          style={[styles.controlBtn, isStreaming && styles.controlBtnActive]}
          onPress={isStreaming ? stopStreaming : startStreaming}
        >
          <Ionicons name={isConnected ? 'text' : 'text-outline'} size={24} color="#FFFFFF" />
          <Text style={styles.controlLabel}>{isStreaming ? '자막중지' : '자막'}</Text>
        </TouchableOpacity>

        {/* 통화 종료 */}
        <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
          <Ionicons name="call" size={28} color="#FFFFFF" />
          <Text style={styles.controlLabel}>종료</Text>
        </TouchableOpacity>

        {/* 카메라 ON/OFF (영상통화만) */}
        {!isVoiceOnly && (
          <TouchableOpacity
            style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
            onPress={handleCameraToggle}
          >
            <Ionicons name={isCameraOff ? 'videocam-off' : 'videocam'} size={24} color="#FFFFFF" />
            <Text style={styles.controlLabel}>{isCameraOff ? '켜기' : '카메라'}</Text>
          </TouchableOpacity>
        )}

        {/* 전면/후면 전환 (영상통화 + 카메라 켜진 경우만) */}
        {!isVoiceOnly && !isCameraOff && (
          <TouchableOpacity style={styles.controlBtn} onPress={handleSwitchCamera}>
            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlBtn: {
    alignItems: 'center',
    gap: 4,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: PRIMARY },
  controlLabel: { fontSize: 10, color: '#E5E7EB' },
  endCallBtn: {
    alignItems: 'center',
    gap: 4,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
  },
});

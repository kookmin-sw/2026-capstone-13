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
import { Audio } from 'expo-av';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  VideoSourceType,
} from 'react-native-agora';

const PRIMARY = '#4F46E5';
const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';
const WS_SPEECH_URL = process.env.EXPO_PUBLIC_AI_WS_URL ?? 'ws://localhost:8001';

interface Transcript {
  id: string;
  text: string;
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
  const channelName = `room_${params.roomId}`;
  const myLanguage = params.language ?? 'ko-KR';
  const isVoiceOnly = params.voiceOnly === 'true';

  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // 자막
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isStreamingRef = useRef(false);

  const engineRef = useRef<IRtcEngine | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 통화 시간 타이머
  useEffect(() => {
    timerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Android 권한 요청
  const requestAndroidPermissions = async () => {
    if (Platform.OS !== 'android') return true;
    const permissions: string[] = [
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ];
    if (!isVoiceOnly) {
      permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
    }
    const results = await PermissionsAndroid.requestMultiple(permissions);
    return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  };

  // Agora 초기화 및 채널 참가
  useEffect(() => {
    if (!AGORA_APP_ID) {
      Alert.alert('설정 오류', 'Agora App ID가 설정되지 않았습니다.');
      return;
    }

    const init = async () => {
      const hasPermission = await requestAndroidPermissions();
      if (!hasPermission) {
        Alert.alert('권한 필요', '통화에 필요한 권한을 허용해주세요.');
        router.back();
        return;
      }

      const engine = createAgoraRtcEngine();
      engineRef.current = engine;

      engine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      engine.addListener('onJoinChannelSuccess', () => {
        setIsJoined(true);
      });

      engine.addListener('onUserJoined', (_connection, uid) => {
        setRemoteUid(uid);
      });

      engine.addListener('onUserOffline', (_connection, _uid) => {
        setRemoteUid(null);
      });

      engine.addListener('onError', (err) => {
        console.warn('Agora error:', err);
      });

      if (!isVoiceOnly) {
        engine.enableVideo();
        engine.startPreview();
      } else {
        engine.disableVideo();
      }

      // 개발 테스트용: token null (Agora 콘솔에서 토큰 인증 비활성화 필요)
      engine.joinChannel('', channelName, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    };

    init();

    return () => {
      isStreamingRef.current = false;
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      wsRef.current?.close();
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
      engineRef.current = null;
    };
  }, []);

  // 자막 WebSocket 연결
  const startSubtitles = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return;

    const ws = new WebSocket(WS_SPEECH_URL);
    ws.onopen = () => ws.send(JSON.stringify({ language: myLanguage }));
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'transcript' && data.text) {
          setTranscripts((prev) => [...prev, { id: Date.now().toString(), text: data.text }].slice(-3));
        }
      } catch {}
    };
    ws.onclose = () => {};
    wsRef.current = ws;

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    isStreamingRef.current = true;
    setIsStreaming(true);

    const loop = async () => {
      while (isStreamingRef.current) {
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync().catch(() => {});
          recordingRef.current = null;
        }
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recordingRef.current = recording;
        await new Promise((r) => setTimeout(r, 3000));
        await recording.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
        const uri = recording.getURI();
        if (!uri || wsRef.current?.readyState !== WebSocket.OPEN) continue;
        const res = await fetch(uri);
        wsRef.current.send(await res.arrayBuffer());
      }
    };
    loop();
  }, [myLanguage]);

  const stopSubtitles = async () => {
    isStreamingRef.current = false;
    setIsStreaming(false);
    await recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    recordingRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
  };

  const handleMute = () => {
    engineRef.current?.muteLocalAudioStream(!isMuted);
    setIsMuted((p) => !p);
  };

  const handleCameraToggle = () => {
    engineRef.current?.muteLocalVideoStream(!isCameraOff);
    setIsCameraOff((p) => !p);
  };

  const handleEndCall = async () => {
    await stopSubtitles();
    engineRef.current?.leaveChannel();
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* 영상 영역 */}
      {!isVoiceOnly && (
        <View style={styles.videoArea}>
          {/* 상대방 화면 */}
          {remoteUid !== null ? (
            <RtcSurfaceView
              style={styles.remoteVideo}
              canvas={{ uid: remoteUid, sourceType: VideoSourceType.VideoSourceRemote }}
            />
          ) : (
            <View style={styles.remoteVideoPlaceholder}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{partnerNickname.charAt(0)}</Text>
              </View>
              <Text style={styles.waitingText}>
                {isJoined ? '상대방 연결 대기 중...' : '채널 연결 중...'}
              </Text>
            </View>
          )}

          {/* 내 화면 (PiP) */}
          {isJoined && !isCameraOff && (
            <RtcSurfaceView
              style={styles.localVideo}
              canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
            />
          )}
        </View>
      )}

      {/* 음성통화 헤더 */}
      {isVoiceOnly && (
        <View style={styles.voiceHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{partnerNickname.charAt(0)}</Text>
          </View>
          <Text style={styles.partnerName}>{partnerNickname}</Text>
          <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, isJoined && remoteUid !== null && styles.statusDotActive]} />
            <Text style={styles.statusText}>
              {!isJoined ? '연결 중...' : remoteUid !== null ? '통화 중' : '상대방 대기 중...'}
            </Text>
          </View>
        </View>
      )}

      {/* 실시간 자막 */}
      <View style={styles.subtitleArea}>
        {transcripts.map((t) => (
          <View key={t.id} style={styles.subtitleBubble}>
            <Text style={styles.subtitleText}>{t.text}</Text>
          </View>
        ))}
      </View>

      {/* 하단 컨트롤 */}
      <View style={styles.controls}>
        {/* 음소거 */}
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={handleMute}
        >
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#FFFFFF" />
          <Text style={styles.controlLabel}>{isMuted ? '음소거 해제' : '음소거'}</Text>
        </TouchableOpacity>

        {/* 카메라 (영상통화만) */}
        {!isVoiceOnly && (
          <TouchableOpacity
            style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
            onPress={handleCameraToggle}
          >
            <Ionicons name={isCameraOff ? 'videocam-off' : 'videocam'} size={24} color="#FFFFFF" />
            <Text style={styles.controlLabel}>{isCameraOff ? '카메라 켜기' : '카메라 끄기'}</Text>
          </TouchableOpacity>
        )}

        {/* 자막 */}
        <TouchableOpacity
          style={[styles.controlBtn, isStreaming && styles.controlBtnActive]}
          onPress={isStreaming ? stopSubtitles : startSubtitles}
        >
          <Ionicons name="text" size={24} color="#FFFFFF" />
          <Text style={styles.controlLabel}>{isStreaming ? '자막 중지' : '자막 시작'}</Text>
        </TouchableOpacity>

        {/* 통화 종료 */}
        <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
          <Ionicons name="call" size={28} color="#FFFFFF" />
          <Text style={styles.controlLabel}>종료</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1B4B',
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
  },

  // 영상 영역
  videoArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  waitingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  localVideo: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // 음성통화 헤더
  voiceHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
    flex: 1,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#4F46E5',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  partnerName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  callDuration: { fontSize: 16, color: '#A5B4FC' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6B7280' },
  statusDotActive: { backgroundColor: '#10B981' },
  statusText: { fontSize: 12, color: '#E5E7EB' },

  // 자막
  subtitleArea: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  subtitleBubble: {
    backgroundColor: 'rgba(0,0,0,0.6)',
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

  // 컨트롤
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 20,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  controlBtn: {
    alignItems: 'center',
    gap: 6,
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: PRIMARY },
  controlLabel: { fontSize: 10, color: '#E5E7EB' },
  endCallBtn: {
    alignItems: 'center',
    gap: 6,
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
  },
});

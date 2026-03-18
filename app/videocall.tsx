// 음성/영상 통화 화면 - 실시간 자막 (WebSocket)
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const PRIMARY = '#4F46E5';
const WS_SPEECH_URL = process.env.EXPO_PUBLIC_AI_WS_URL ?? 'ws://localhost:8001';

// 자막 한 줄 타입
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
    language?: string; // 내 언어 (음성 인식용)
  }>();

  const partnerNickname = params.partnerNickname ?? '상대방';
  const myLanguage = params.language ?? 'ko-KR';

  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isStreamingRef = useRef<boolean>(false);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // WebSocket 연결
  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket(WS_SPEECH_URL);

    ws.onopen = () => {
      setIsConnected(true);
      // 언어 설정 전송
      ws.send(JSON.stringify({ language: myLanguage }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'transcript' && data.text) {
          setTranscripts((prev) => {
            const updated = [...prev, {
              id: Date.now().toString(),
              text: data.text,
              language: data.language,
            }];
            // 최근 3개만 표시
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

  // 음성 스트리밍 시작
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

    // 3초 청크씩 순차적으로 녹음해서 WebSocket으로 전송
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

  // 음성 스트리밍 중지
  const stopStreaming = async () => {
    isStreamingRef.current = false;
    setIsStreaming(false);
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    await recordingRef.current?.stopAndUnloadAsync();
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

  // 음소거 토글
  const handleMute = () => setIsMuted((prev) => !prev);

  return (
    <View style={styles.container}>
      {/* 상단 통화 정보 */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{partnerNickname.charAt(0)}</Text>
        </View>
        <Text style={styles.partnerName}>{partnerNickname}</Text>
        <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, isConnected && styles.statusDotActive]} />
          <Text style={styles.statusText}>{isConnected ? '자막 연결됨' : '자막 연결 중...'}</Text>
        </View>
      </View>

      {/* 실시간 자막 영역 */}
      <View style={styles.subtitleArea}>
        {transcripts.length === 0 ? (
          <Text style={styles.subtitlePlaceholder}>
            {isStreaming ? '말씀해 주세요...' : '자막 시작 버튼을 눌러주세요'}
          </Text>
        ) : (
          transcripts.map((t) => (
            <View key={t.id} style={styles.subtitleBubble}>
              <Text style={styles.subtitleText}>{t.text}</Text>
            </View>
          ))
        )}
      </View>

      {/* 하단 버튼 */}
      <View style={styles.controls}>
        {/* 음소거 */}
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={handleMute}
        >
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#FFFFFF" />
          <Text style={styles.controlLabel}>{isMuted ? '음소거 해제' : '음소거'}</Text>
        </TouchableOpacity>

        {/* 자막 시작/중지 */}
        <TouchableOpacity
          style={[styles.controlBtn, isStreaming && styles.controlBtnActive]}
          onPress={isStreaming ? stopStreaming : startStreaming}
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
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
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
  statusDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#6B7280',
  },
  statusDotActive: { backgroundColor: '#10B981' },
  statusText: { fontSize: 12, color: '#E5E7EB' },

  subtitleArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  subtitlePlaceholder: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 15,
    marginBottom: 20,
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

  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 24,
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlBtn: {
    alignItems: 'center',
    gap: 6,
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
  },
  controlBtnActive: { backgroundColor: '#4F46E5' },
  controlLabel: { fontSize: 11, color: '#E5E7EB', marginTop: 2 },
  endCallBtn: {
    alignItems: 'center',
    gap: 6,
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
  },
});

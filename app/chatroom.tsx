// 채팅방 화면 (WebSocket STOMP 실시간 채팅)
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '@stomp/stompjs';
import * as SecureStore from 'expo-secure-store';
import { getChatMessages, type ChatMessageDto } from '../services/chatService';
import { useAuthStore } from '../stores/authStore';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-0a6f.up.railway.app/api';
const WS_URL = BASE_URL.replace(/^https?/, 'wss').replace('/api', '') + '/ws-native';

type ListItem = ChatMessageDto | { type: 'date'; label: string; id: string };

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function todayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function ChatRoomScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{
    roomId: string;
    requestTitle: string;
    partnerNickname: string;
  }>();

  const roomId = Number(params.roomId);
  const partnerNickname = params.partnerNickname ?? '상대방';
  const requestTitle = params.requestTitle ?? '도움 요청';

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const clientRef = useRef<Client | null>(null);
  const listRef = useRef<FlatList>(null);

  // 이전 메시지 조회
  const loadHistory = useCallback(async () => {
    try {
      const res = await getChatMessages(roomId);
      if (res.success) setMessages(res.data);
    } catch {
      // 이력 조회 실패는 무시 (새 채팅방일 수 있음)
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // WebSocket 연결
  useEffect(() => {
    loadHistory();

    let client: Client;

    SecureStore.getItemAsync('accessToken').then((token) => {
    client = new Client({
      brokerURL: WS_URL,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        setIsConnected(true);
        client.subscribe(`/topic/chat/${roomId}`, (frame) => {
          try {
            const msg: ChatMessageDto = JSON.parse(frame.body);
            setMessages((prev) => [...prev, msg]);
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
          } catch {
            // 파싱 실패 무시
          }
        });
      },
      onDisconnect: () => setIsConnected(false),
      onStompError: () => setIsConnected(false),
    });

      client.activate();
      clientRef.current = client;
    });

    return () => {
      clientRef.current?.deactivate();
    };
  }, [roomId, loadHistory]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !clientRef.current?.connected || !user) return;

    const payload: ChatMessageDto = {
      roomId,
      senderId: user.id,
      senderNickname: user.nickname,
      content: text,
      createdAt: new Date().toISOString(),
    };

    clientRef.current.publish({
      destination: '/app/chat/send',
      body: JSON.stringify(payload),
    });

    setInput('');
  };

  const handleVideoCall = () => {
    Alert.alert('영상통화', `${partnerNickname}님과 영상통화를 시작할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '시작', onPress: () => Alert.alert('연결 중...', '영상통화 기능은 준비 중이에요.') },
    ]);
  };

  const listData: ListItem[] = [
    { type: 'date', label: todayLabel(), id: 'date-today' },
    ...messages,
  ];

  const renderItem = ({ item }: { item: ListItem }) => {
    if ('type' in item && item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateLabel}>{item.label}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }

    const msg = item as ChatMessageDto;
    const isMine = msg.senderId === user?.id;

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
        {!isMine && (
          <View style={styles.msgAvatar}>
            <Text style={styles.msgAvatarText}>{msg.senderNickname.charAt(0)}</Text>
          </View>
        )}
        <View style={[styles.msgGroup, isMine && styles.msgGroupMine]}>
          {!isMine && <Text style={styles.senderName}>{msg.senderNickname}</Text>}
          <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
            {isMine && (
              <View style={styles.msgMeta}>
                <Text style={styles.msgTime}>{formatTime(msg.createdAt)}</Text>
              </View>
            )}
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                {msg.content}
              </Text>
            </View>
            {!isMine && (
              <Text style={[styles.msgTime, styles.msgTimeOther]}>{formatTime(msg.createdAt)}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={PRIMARY} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerCenter} activeOpacity={0.7}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{partnerNickname.charAt(0)}</Text>
            {isConnected && <View style={styles.headerOnline} />}
          </View>
          <View>
            <Text style={styles.headerName}>{partnerNickname}</Text>
            <Text style={[styles.headerSub, !isConnected && styles.headerSubOffline]}>
              {isConnected ? '🟢 연결됨' : '⚪ 연결 중...'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleVideoCall}>
            <Ionicons name="videocam" size={18} color={PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="ellipsis-vertical" size={16} color={PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 요청 컨텍스트 배너 */}
      <View style={styles.contextBanner}>
        <Ionicons name="document-text-outline" size={13} color={PRIMARY} />
        <Text style={styles.contextText} numberOfLines={1}>{requestTitle}</Text>
        <View style={styles.contextBadge}>
          <Text style={styles.contextBadgeText}>매칭됨</Text>
        </View>
      </View>

      {/* 메시지 목록 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item) => ('type' in item ? item.id : `${item.senderId}-${item.createdAt}`)}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 입력창 */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.attachBtn}>
          <Ionicons name="add" size={22} color="#6B7280" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={500}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || !isConnected) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || !isConnected}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79,70,229,0.1)',
    gap: 10,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  headerAvatarText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  headerOnline: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  headerName: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  headerSub: { fontSize: 11, color: '#10B981', fontWeight: '500' },
  headerSubOffline: { color: '#9CA3AF' },
  headerActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },

  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79,70,229,0.08)',
  },
  contextText: { flex: 1, fontSize: 12, color: PRIMARY, fontWeight: '500' },
  contextBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6,
  },
  contextBadgeText: { fontSize: 10, fontWeight: '700', color: '#065F46' },

  messageList: { padding: 16, paddingBottom: 12 },

  dateSeparator: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginVertical: 16,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: 'rgba(79,70,229,0.1)' },
  dateLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  msgRowOther: { justifyContent: 'flex-start' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
    alignSelf: 'flex-start',
    marginTop: 18,
  },
  msgAvatarText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  msgGroup: { maxWidth: '75%', gap: 4 },
  msgGroupMine: { alignItems: 'flex-end' },

  senderName: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 2 },

  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  bubbleRowMine: { flexDirection: 'row-reverse' },

  bubble: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20,
    maxWidth: 240,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleMine: {
    backgroundColor: PRIMARY,
    borderTopRightRadius: 4,
  },
  bubbleText: { fontSize: 14, color: '#1E1B4B', lineHeight: 21 },
  bubbleTextMine: { color: '#FFFFFF' },

  msgMeta: { alignItems: 'flex-end', gap: 2, paddingBottom: 2 },
  msgTime: { fontSize: 10, color: '#9CA3AF' },
  msgTimeOther: { paddingBottom: 2 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(79,70,229,0.08)',
  },
  attachBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F8',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: 10,
    fontSize: 14,
    color: '#1E1B4B',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.1)',
    lineHeight: 20,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
});

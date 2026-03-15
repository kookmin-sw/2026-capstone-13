// 채팅방 화면
import { useState, useRef } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';

interface Message {
  id: number;
  senderId: number;
  content: string;
  time: string;
  read: boolean;
}

const MY_ID = 0;

const INITIAL_MESSAGES: Message[] = [
  { id: 1, senderId: 1, content: '안녕하세요! 은행 계좌 개설 도움 요청 보고 연락드려요 😊', time: '오후 2:10', read: true },
  { id: 2, senderId: MY_ID, content: '안녕하세요! 저도 반가워요. 어느 은행 가실 건가요?', time: '오후 2:11', read: true },
  { id: 3, senderId: 1, content: '신한은행이요. 국민대 근처 지점으로 가려고 해요.', time: '오후 2:12', read: true },
  { id: 4, senderId: MY_ID, content: '아 거기 가봤어요!\n외국인 계좌 개설 서류는\n① 여권\n② 외국인등록증\n③ 재학증명서\n이렇게 3가지 필요해요.', time: '오후 2:13', read: true },
  { id: 5, senderId: 1, content: '오 감사합니다! 재학증명서는 어디서 받아요?', time: '오후 2:14', read: true },
  { id: 6, senderId: MY_ID, content: '포털 사이트에서 발급받을 수 있어요.\n학교 홈페이지 → 증명서 발급 메뉴에서요!', time: '오후 2:20', read: true },
  { id: 7, senderId: 1, content: '네, 내일 오전 10시에 신한은행 앞에서 만나요! 😄', time: '오후 2:34', read: true },
];

// 날짜 구분선 데이터
type ListItem = Message | { type: 'date'; label: string; id: string };

const LIST_DATA: ListItem[] = [
  { type: 'date', label: '2026년 3월 15일', id: 'date-1' },
  ...INITIAL_MESSAGES,
];

export default function ChatRoomScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const listData: ListItem[] = [
    { type: 'date', label: '2026년 3월 15일', id: 'date-1' },
    ...messages,
  ];

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const newMsg: Message = {
      id: messages.length + 1,
      senderId: MY_ID,
      content: text,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleVideoCall = () => {
    Alert.alert('영상통화', '김민준님과 영상통화를 시작할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '시작', onPress: () => Alert.alert('연결 중...', '영상통화 기능은 준비 중이에요.') },
    ]);
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    // 날짜 구분선
    if ('type' in item && item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateLabel}>{item.label}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }

    const msg = item as Message;
    const isMine = msg.senderId === MY_ID;

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
        {/* 상대방 아바타 */}
        {!isMine && (
          <View style={styles.msgAvatar}>
            <Text style={styles.msgAvatarText}>김</Text>
          </View>
        )}

        <View style={[styles.msgGroup, isMine && styles.msgGroupMine]}>
          {/* 상대방 이름 */}
          {!isMine && <Text style={styles.senderName}>김민준</Text>}

          <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
            {/* 읽음 + 시간 (내 메시지 왼쪽) */}
            {isMine && (
              <View style={styles.msgMeta}>
                {msg.read && <Text style={styles.readText}>읽음</Text>}
                <Text style={styles.msgTime}>{msg.time}</Text>
              </View>
            )}

            {/* 말풍선 */}
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                {msg.content}
              </Text>
            </View>

            {/* 시간 (상대방 메시지 오른쪽) */}
            {!isMine && (
              <Text style={[styles.msgTime, styles.msgTimeOther]}>{msg.time}</Text>
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

        {/* 파트너 정보 */}
        <TouchableOpacity style={styles.headerCenter} activeOpacity={0.7}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>김</Text>
            <View style={styles.headerOnline} />
          </View>
          <View>
            <Text style={styles.headerName}>김민준</Text>
            <Text style={styles.headerSub}>🟢 온라인</Text>
          </View>
        </TouchableOpacity>

        {/* 우측 버튼들 */}
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
        <Text style={styles.contextText} numberOfLines={1}>은행 계좌 개설 도와주실 분 구해요</Text>
        <View style={styles.contextBadge}>
          <Text style={styles.contextBadgeText}>매칭됨</Text>
        </View>
      </View>

      {/* 메시지 목록 */}
      <FlatList
        ref={listRef}
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => ('type' in item ? item.id : item.id.toString())}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
      />

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
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim()}
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

  // 헤더
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
  headerActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },

  // 컨텍스트 배너
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

  // 메시지 리스트
  messageList: { padding: 16, paddingBottom: 12 },

  // 날짜 구분선
  dateSeparator: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginVertical: 16,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: 'rgba(79,70,229,0.1)' },
  dateLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  // 메시지 행
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
  readText: { fontSize: 10, color: PRIMARY, fontWeight: '600' },

  // 입력창
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

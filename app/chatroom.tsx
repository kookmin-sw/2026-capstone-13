// 채팅방 화면 (WebSocket STOMP 실시간 채팅)
import { Ionicons } from '@expo/vector-icons';
import { getInitial } from '../utils/getInitial';
import { Client } from '@stomp/stompjs';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { s } from '../utils/scale';
import { getChatMessages, sendVoiceMessage, translateChatMessage, type ChatMessageDto } from '../services/chatService';
import { leaveHelpRequest, completeHelpRequest, rejectHelper, startHelpRequest } from '../services/helpService';
import { hasReviewed } from '../services/reviewService';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

const PRIMARY = '#3B6FE8';
const PRIMARY_LIGHT = '#EEF4FF';
const SYS_LEAVE = 'SYS_LEAVE:';
const SYS_CALL_VOICE = 'SYS_CALL_VOICE:';
const SYS_CALL_VIDEO = 'SYS_CALL_VIDEO:';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-0a6f.up.railway.app/api';
// https://xxx.up.railway.app/api → wss://xxx.up.railway.app/ws-native
const WS_URL = BASE_URL.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws-native';

type ListItem = ChatMessageDto | { type: 'date'; label: string; id: string } | { type: 'system'; content: string; id: string };

function formatTime(iso: string): string {
  try {
    const utc = iso.includes('Z') || iso.includes('+') ? iso : iso + 'Z';
    const d = new Date(utc);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' });
  } catch {
    return '';
  }
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
    partnerProfileImage?: string;
    requestStatus?: string;
    requesterId?: string;
    roomUnreadCount?: string;
  }>();

  const roomId = Number(params.roomId);
  const partnerNickname = params.partnerNickname ?? '상대방';
  const partnerProfileImage = params.partnerProfileImage || null;
  const requestTitle = params.requestTitle ?? '도움 요청';
  const isRequester = user?.id === Number(params.requesterId);
  const [partnerImgError, setPartnerImgError] = useState(false);

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [helpStatus, setHelpStatus] = useState(params.requestStatus ?? '');
  const [isActing, setIsActing] = useState(false);
  const [systemMessages, setSystemMessages] = useState<{ type: 'system'; content: string; id: string }[]>([]);
  const [chatEnded, setChatEnded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [translateEnabled, setTranslateEnabled] = useState(true);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const { unreadCount, setUnreadCount, setActiveChatroom, leaveRoom, rejoinRoom } = useChatStore();
  const clientRef = useRef<Client | null>(null);
  const listRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // 이전 메시지 조회
  const loadHistory = useCallback(async () => {
    try {
      const res = await getChatMessages(roomId);
      if (res.success && res.data.length > 0) {
        const sysLeaveFromPartner = res.data.find(
          (m) => m.content?.startsWith(SYS_LEAVE) && m.senderId !== user?.id
        );
        // MATCHED/IN_PROGRESS는 재매칭된 상태 → 이전 SYS_LEAVE 이력 무시
        const currentStatus = params.requestStatus ?? '';
        const isActiveMatch = currentStatus === 'MATCHED' || currentStatus === 'IN_PROGRESS';
        if (sysLeaveFromPartner && !isActiveMatch) setChatEnded(true);
        const normalMsgs = res.data.filter((m) => !m.content?.startsWith(SYS_LEAVE));
        setMessages(normalMsgs);
      }
    } catch {
      // 새 채팅방이면 이력 없음 - 무시
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // COMPLETED 상태면 포커스 될 때마다 리뷰 작성 여부 재조회 (후기 작성 후 돌아올 때 반영)
  useFocusEffect(useCallback(() => {
    if (params.requestStatus === 'COMPLETED' || helpStatus === 'COMPLETED') {
      hasReviewed(roomId).then(setAlreadyReviewed).catch(() => {});
    }
  }, [helpStatus, roomId]));

  // 채팅방 입장 시 뱃지 초기화 + 활성 채팅방 등록 + leftRooms 초기화(재입장)
  useEffect(() => {
    setActiveChatroom(roomId);
    const roomUnread = Number(params.roomUnreadCount ?? 0);
    if (roomUnread > 0) setUnreadCount(Math.max(0, unreadCount - roomUnread));
    if (user) rejoinRoom(roomId, Number(user.id));
    return () => {
      setActiveChatroom(null);
    };
  }, [roomId, setActiveChatroom, setUnreadCount, rejoinRoom, user]);

  // WebSocket STOMP 연결
  useEffect(() => {
    loadHistory();

    let mounted = true;

    const connect = async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!mounted) return;

      const wsUrl = WS_URL;

      const client = new Client({
        webSocketFactory: () => new WebSocket(wsUrl),
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        // React Native WebSocket 바이너리 프레임 호환성 옵션
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
        heartbeatIncoming: 0,
        heartbeatOutgoing: 0,
        reconnectDelay: 5000,
        onConnect: () => {
          if (!mounted) return;
          setIsConnected(true);
          client.subscribe(`/topic/chat/${roomId}`, (frame) => {
            try {
              const msg = JSON.parse(frame.body);
              if (!mounted) return;

              // READ 등 컨트롤 이벤트는 채팅 메시지 목록에 추가하지 않음
              if (msg.type === 'READ') return;

              // 통화 요청 메시지 처리 (수신자만)
              if (msg.content?.startsWith(SYS_CALL_VOICE) || msg.content?.startsWith(SYS_CALL_VIDEO)) {
                if (msg.senderId === user?.id) return; // 내가 보낸 신호는 무시
                const isVideo = msg.content.startsWith(SYS_CALL_VIDEO);
                const callerNickname = msg.content.slice(isVideo ? SYS_CALL_VIDEO.length : SYS_CALL_VOICE.length);
                Alert.alert(
                  isVideo ? '📹 영상통화' : '📞 음성통화',
                  `${callerNickname}님이 ${isVideo ? '영상' : '음성'}통화를 요청했습니다.`,
                  [
                    { text: '거절', style: 'cancel' },
                    {
                      text: '수락',
                      onPress: () => router.push({
                        pathname: '/videocall',
                        params: {
                          roomId: String(roomId),
                          partnerNickname: callerNickname,
                          voiceOnly: isVideo ? 'false' : 'true',
                        },
                      }),
                    },
                  ]
                );
                return;
              }

              // 나가기 시스템 메시지 처리
              if (msg.content?.startsWith(SYS_LEAVE)) {
                // 내가 보낸 나가기 메시지는 무시 (이미 router.back() 처리)
                if (msg.senderId === user?.id) return;
                const nickname = msg.content.slice(SYS_LEAVE.length);
                setChatEnded(true);
                setSystemMessages((prev) => [
                  ...prev,
                  { type: 'system', content: `${nickname}님이 채팅방을 나갔습니다`, id: `sys-leave-${Date.now()}` },
                ]);
                setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
                return;
              }

              // 상대방 재입장 후 메시지 수신 시 chatEnded 리셋 (매칭완료 버튼 복원)
              setChatEnded(false);
              setMessages((prev) => {
                const isDuplicate = prev.some(
                  (m) => m.senderId === msg.senderId &&
                         m.content === msg.content &&
                         m.createdAt === msg.createdAt
                );
                if (isDuplicate) return prev;
                return [...prev, msg];
              });
              setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
            } catch {
              // 파싱 오류 무시
            }
          });
        },
        onDisconnect: () => {
          if (mounted) setIsConnected(false);
        },
        onStompError: (frame) => {
          console.warn('STOMP error:', frame.headers['message'], frame.body);
          if (mounted) setIsConnected(false);
        },
        onWebSocketError: (event) => {
          console.warn('WebSocket error:', event);
          if (mounted) setIsConnected(false);
        },
      });

      client.activate();
      clientRef.current = client;
    };

    connect();

    return () => {
      mounted = false;
      clientRef.current?.deactivate();
      clientRef.current = null;
    };
  }, [roomId, loadHistory]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !user) return;

    const client = clientRef.current;
    if (!client?.connected) {
      Alert.alert('연결 오류', '채팅 서버에 연결되지 않았습니다.\n잠시 후 다시 시도해주세요.');
      return;
    }

    const payload: ChatMessageDto = {
      roomId,
      senderId: user.id,
      senderNickname: user.nickname,
      content: text,
      createdAt: new Date().toISOString(),
    };

    client.publish({
      destination: '/app/chat/send',
      body: JSON.stringify(payload),
    });

    setInput('');
  };

  const handleLeave = () => {
    Alert.alert('채팅방 나가기', '채팅방을 나가시겠어요?\n상대방에게 알림이 전송됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: () => {
          // 채팅방 나가기 → 상태 WAITING 복귀 (다시 모집 가능)
          leaveHelpRequest(Number(roomId)).catch(() => {});
          const client = clientRef.current;
          if (client?.connected && user) {
            client.publish({
              destination: '/app/chat/send',
              body: JSON.stringify({
                roomId,
                senderId: user.id,
                senderNickname: user.nickname,
                content: `${SYS_LEAVE}${user.nickname}`,
                createdAt: new Date().toISOString(),
              }),
            });
          }
          if (user) leaveRoom(Number(roomId), Number(user.id));
          setMessages([]);
          router.back();
        },
      },
    ]);
  };

  const handleAccept = async () => {
    setIsActing(true);
    try {
      const res = await startHelpRequest(roomId);
      if (res.success) {
        setHelpStatus('IN_PROGRESS');
        setSystemMessages((prev) => [
          ...prev,
          { type: 'system', content: '✅ 도움이 수락되었습니다! 채팅을 시작해보세요 🎉', id: `sys-${Date.now()}` },
        ]);
        setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 150);
      } else {
        Alert.alert('실패', res.message);
      }
    } catch {
      Alert.alert('오류', '서버 오류가 발생했습니다.');
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    setIsActing(true);
    try {
      const res = await rejectHelper(roomId);
      if (res.success) {
        setHelpStatus('WAITING');
        Alert.alert('거절 완료', '도움 신청을 거절했어요.', [
          { text: '확인', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('실패', res.message);
      }
    } catch {
      Alert.alert('오류', '서버 오류가 발생했습니다.');
    } finally {
      setIsActing(false);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      // 녹음 종료 → 전송
      try {
        setIsRecording(false);
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        recordingRef.current = null;

        if (!uri) return;

        setIsSendingVoice(true);
        const res = await sendVoiceMessage(roomId, uri);
        if (!res.success) {
          Alert.alert('오류', '음성 메시지 전송에 실패했습니다.');
        }
      } catch (e) {
        Alert.alert('오류', '음성 메시지 처리 중 오류가 발생했습니다.');
      } finally {
        setIsSendingVoice(false);
      }
    } else {
      // 녹음 시작
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          Alert.alert('권한 필요', '마이크 권한을 허용해주세요.');
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
        setIsRecording(true);
      } catch (e) {
        Alert.alert('오류', '녹음을 시작할 수 없습니다.');
      }
    }
  };

  const handleVoiceCall = () => {
    Alert.alert('음성통화', `${partnerNickname}님과 음성통화를 시작할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '시작',
        onPress: () => {
          // 상대방에게 통화 요청 신호 전송
          const client = clientRef.current;
          if (client?.connected && user) {
            client.publish({
              destination: '/app/chat/send',
              body: JSON.stringify({
                roomId,
                senderId: user.id,
                senderNickname: user.nickname,
                content: `${SYS_CALL_VOICE}${user.nickname}`,
                createdAt: new Date().toISOString(),
              }),
            });
          }
          router.push({
            pathname: '/videocall',
            params: { roomId: String(roomId), partnerNickname, voiceOnly: 'true' },
          });
        },
      },
    ]);
  };

  const handleVideoCall = () => {
    Alert.alert('영상통화', `${partnerNickname}님과 영상통화를 시작할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '시작',
        onPress: () => {
          // 상대방에게 통화 요청 신호 전송
          const client = clientRef.current;
          if (client?.connected && user) {
            client.publish({
              destination: '/app/chat/send',
              body: JSON.stringify({
                roomId,
                senderId: user.id,
                senderNickname: user.nickname,
                content: `${SYS_CALL_VIDEO}${user.nickname}`,
                createdAt: new Date().toISOString(),
              }),
            });
          }
          router.push({
            pathname: '/videocall',
            params: { roomId: String(roomId), partnerNickname, voiceOnly: 'false' },
          });
        },
      },
    ]);
  };

  const handleComplete = () => {
    Alert.alert(
      '매칭 완료',
      '도움이 완료되었나요? 매칭을 완료 처리합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '완료',
          onPress: async () => {
            setIsActing(true);
            try {
              const res = await completeHelpRequest(roomId);
              if (res.success) {
                setHelpStatus('COMPLETED');
                setAlreadyReviewed(false);
                setSystemMessages((prev) => [
                  ...prev,
                  { type: 'system', content: '🎉 매칭이 완료되었습니다!', id: `sys-complete-${Date.now()}` },
                ]);
                setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 150);
              } else {
                Alert.alert('실패', res.message);
              }
            } catch {
              Alert.alert('오류', '서버 오류가 발생했습니다.');
            } finally {
              setIsActing(false);
            }
          },
        },
      ]
    );
  };

  const handleTranslateMessage = async (messageId: number) => {
    try {
      const res = await translateChatMessage(messageId);
      if (res.success && res.data) {
        setMessages((prev) =>
          prev.map((m) => m.id === messageId
            ? { ...m, translatedContent: res.data.translatedContent, culturalNote: res.data.culturalNote }
            : m
          )
        );
      } else {
        Alert.alert('번역 실패', res.message ?? '번역에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch {
      Alert.alert('번역 실패', '번역 서버에 연결할 수 없습니다.');
    }
  };

  const listData: ListItem[] = [
    { type: 'date', label: todayLabel(), id: 'date-today' },
    ...messages,
    ...systemMessages,
  ];

  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if ('type' in item && item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateLabel}>{item.label}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }

    if ('type' in item && item.type === 'system') {
      return (
        <View style={styles.systemMsgWrap}>
          <Text style={styles.systemMsgText}>{item.content}</Text>
        </View>
      );
    }

    const msg = item as ChatMessageDto;
    const isMine = msg.senderId === user?.id;

    // 이전(더 오래된) 메시지와 같은 발신자인지 확인 (아바타 표시 여부)
    // FlatList는 reversed data + inverted → index는 reversed 배열 기준
    // reversed[i+1] = listData[listData.length - 2 - index]
    const prevItem = listData[listData.length - 2 - index];
    const prevMsg = prevItem && !('type' in prevItem) ? prevItem as ChatMessageDto : null;
    const showAvatar = !isMine && (prevMsg === null || prevMsg.senderId !== msg.senderId);

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
        {!isMine && (
          showAvatar
            ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{ alignSelf: 'flex-start' }}
                  onPress={() => msg.senderId !== user?.id && msg.senderNickname !== '(알 수 없음)' && router.push({ pathname: '/user-profile', params: { id: msg.senderId } })}
                >
                  {partnerProfileImage && !partnerImgError
                    ? <Image
                        source={{ uri: partnerProfileImage }}
                        style={styles.msgAvatar}
                        onError={() => setPartnerImgError(true)}
                      />
                    : <View style={styles.msgAvatar}>
                        <Text style={styles.msgAvatarText}>{getInitial(msg.senderNickname)}</Text>
                      </View>
                  }
                </TouchableOpacity>
              )
            : <View style={styles.msgAvatarSpacer} />
        )}
        <View style={[styles.msgGroup, isMine && styles.msgGroupMine]}>
          {showAvatar && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => msg.senderId !== user?.id && msg.senderNickname !== '(알 수 없음)' && router.push({ pathname: '/user-profile', params: { id: msg.senderId } })}
            >
              <Text style={[styles.senderName, { marginTop: -2 }]}>{msg.senderNickname}</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                {msg.content}
              </Text>
            </View>
            <Text style={[styles.msgTime, !isMine && styles.msgTimeOther]}>{formatTime(msg.createdAt)}</Text>
          </View>
          {/* 번역 텍스트 */}
          {translateEnabled && !isMine && !!msg.translatedContent && (
            <Text style={styles.translatedText}>{msg.translatedContent}</Text>
          )}
          {/* 번역 없는 메시지: 번역하기 버튼 */}
          {translateEnabled && !isMine && !msg.translatedContent && !!msg.id && (
            <TouchableOpacity
              onPress={() => handleTranslateMessage(msg.id!)}
              style={styles.translateBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="language-outline" size={12} color="#6B9DF0" />
              <Text style={styles.translateBtnText}>번역하기</Text>
            </TouchableOpacity>
          )}
          {/* 뉘앙스 말풍선 */}
          {translateEnabled && !isMine && !!msg.culturalNote && (
            <View style={styles.nuanceBubble}>
              <Text style={styles.nuanceIcon}>💡</Text>
              <Text style={styles.nuanceText}>{msg.culturalNote}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#6B9DF0" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerName}>{partnerNickname}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleVoiceCall}>
            <Ionicons name="call-outline" size={15} color="#6B9DF0" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleVideoCall}>
            <Ionicons name="videocam-outline" size={15} color="#6B9DF0" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, translateEnabled && styles.actionBtnActive]}
            onPress={() => setTranslateEnabled((prev) => !prev)}
          >
            <Ionicons name="language-outline" size={15} color={translateEnabled ? '#fff' : '#6B9DF0'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-vertical" size={15} color="#6B9DF0" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 점세개 드롭다운 메뉴 */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          onPress={() => setMenuVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.menuDropdown}>
            {isRequester && !chatEnded && helpStatus !== 'COMPLETED' && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setMenuVisible(false); handleComplete(); }}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={PRIMARY} />
                  <Text style={styles.menuItemText}>매칭완료하기</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            )}
            {helpStatus === 'COMPLETED' && !alreadyReviewed && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    router.push({
                      pathname: '/write-review',
                      params: {
                        helpRequestId: String(roomId),
                        partnerNickname,
                        partnerProfileImage: partnerProfileImage ?? '',
                        requestTitle,
                      },
                    });
                  }}
                >
                  <Ionicons name="star-outline" size={18} color="#F97316" />
                  <Text style={styles.menuItemText}>후기 작성</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            )}
            {helpStatus === 'COMPLETED' && alreadyReviewed && (
              <>
                <View style={styles.menuItem}>
                  <Ionicons name="star" size={18} color="#F97316" />
                  <Text style={[styles.menuItemText, { color: '#A8C8FA' }]}>후기 작성 완료</Text>
                </View>
                <View style={styles.menuDivider} />
              </>
            )}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); handleLeave(); }}
            >
              <Ionicons name="exit-outline" size={18} color="#EF4444" />
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>나가기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 요청 컨텍스트 배너 */}
      <View style={styles.contextBanner}>
        <View style={styles.contextIconBox}>
          <Ionicons name="document-text-outline" size={14} color="#fff" />
        </View>
        <View style={styles.contextBody}>
          <Text style={styles.contextText} numberOfLines={1}>{requestTitle}</Text>
          <Text style={styles.contextSub}>진행중 · 국민대학교</Text>
        </View>
        <View style={styles.contextBadge}>
          <Text style={styles.contextBadgeText}>진행중</Text>
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
          data={[...listData].reverse()}
          inverted
          renderItem={renderItem}
          keyExtractor={(item) => {
            if ('type' in item) return item.id;
            if (item.id != null) return String(item.id);
            return `${item.senderId}-${item.createdAt}-${item.content}`;
          }}
          contentContainerStyle={[
            styles.messageList,
            listData.length <= 1 && styles.messageListEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={helpStatus === 'MATCHED' ? (
            <View style={styles.noticeBanner}>
              <View style={styles.noticeHeader}>
                <Text style={styles.noticeIcon}>🤝</Text>
                <View style={styles.noticeTextWrap}>
                  <Text style={styles.noticeTitle}>도움 신청이 도착했어요!</Text>
                  <Text style={styles.noticeSub}>
                    {isRequester
                      ? `${partnerNickname}님이 도움을 드리겠다고 했어요.`
                      : `${partnerNickname}님의 수락을 기다리고 있어요.`}
                  </Text>
                </View>
              </View>
              {isRequester && (
                <View style={styles.noticeActions}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, isActing && styles.actionBtnDisabled]}
                    onPress={handleReject}
                    disabled={isActing}
                  >
                    <Text style={styles.rejectBtnText}>거절</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, isActing && styles.actionBtnDisabled]}
                    onPress={handleAccept}
                    disabled={isActing}
                  >
                    {isActing
                      ? <ActivityIndicator size="small" color="#FFFFFF" />
                      : <Text style={styles.acceptBtnText}>수락</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>
                첫 메시지를 보내보세요! 👋
              </Text>
            </View>
          }
        />
      )}


      {/* 입력창 */}
      {(helpStatus === 'MATCHED' || chatEnded) && (
        <View style={styles.inputBarLocked}>
          <Ionicons name={chatEnded ? 'close-circle-outline' : 'lock-closed-outline'} size={14} color="#9CA3AF" />
          <Text style={styles.inputLockedText}>
            {chatEnded ? '채팅이 종료되었습니다' : '수락 후 채팅이 가능해요'}
          </Text>
        </View>
      )}
      <View style={[styles.inputBar, (helpStatus === 'MATCHED' || chatEnded) && styles.inputBarHidden]}>
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
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.micBtn, isRecording && styles.micBtnActive]}
          onPress={handleVoiceRecord}
          disabled={isSendingVoice}
          activeOpacity={0.85}
        >
          {isSendingVoice
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <Ionicons name={isRecording ? 'stop' : 'mic'} size={16} color="#FFFFFF" />
          }
        </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ──
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 70 : 14,
    paddingBottom: s(10),
    paddingHorizontal: s(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: s(1),
    borderBottomColor: '#EEF4FF',
    gap: s(10),
  },
  navBtn: {
    width: s(44), height: s(44),
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(10),
  },
  headerAvatar: {
    width: s(42), height: s(42), borderRadius: s(21),
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  headerAvatarText: { fontSize: s(18), fontWeight: '800', color: '#FFFFFF' },
  headerOnline: {
    position: 'absolute', bottom: 1, right: 1,
    width: s(11), height: s(11), borderRadius: s(6),
    backgroundColor: '#22C55E', borderWidth: s(2), borderColor: '#FFFFFF',
  },
  headerName: { fontSize: s(17), fontWeight: '800', color: '#0C1C3C' },
  headerSub: { fontSize: s(13), color: '#22C55E', fontWeight: '600' },
  headerSubOffline: { color: '#A8C8FA' },
  headerActions: { flexDirection: 'row', gap: s(4) },
  actionBtn: {
    width: s(32), height: s(32), borderRadius: s(16),
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnActive: { backgroundColor: PRIMARY },

  // ── Context banner ──
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    backgroundColor: PRIMARY_LIGHT,
    marginHorizontal: s(14),
    marginTop: s(10),
    borderRadius: s(14),
    paddingHorizontal: s(16),
    paddingVertical: s(14),
    borderWidth: s(1),
    borderColor: '#D0E0F8',
  },
  contextIconBox: {
    width: s(38), height: s(38), borderRadius: s(12),
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  contextBody: { flex: 1, minWidth: 0 },
  contextText: { fontSize: s(13), fontWeight: '800', color: '#0C1C3C', marginBottom: s(3) },
  contextSub:  { fontSize: s(12), color: '#6B9DF0', fontWeight: '500' },
  contextBadge: {
    backgroundColor: PRIMARY,
    paddingHorizontal: s(10), paddingVertical: s(5),
    borderRadius: s(8), flexShrink: 0,
  },
  contextBadgeText: { fontSize: s(12), fontWeight: '700', color: '#FFFFFF' },

  // ── Notice banner ──
  noticeBanner: {
    backgroundColor: '#FFFBEB',
    borderBottomWidth: s(1),
    borderBottomColor: '#FDE68A',
    paddingHorizontal: s(16),
    paddingVertical: s(12),
    gap: s(10),
  },
  noticeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10) },
  noticeIcon: { fontSize: 22 },
  noticeTextWrap: { flex: 1 },
  noticeTitle: { fontSize: s(13), fontWeight: '700', color: '#92400E' },
  noticeSub: { fontSize: s(12), color: '#B45309', marginTop: s(2) },
  noticeActions: { flexDirection: 'row', gap: s(8) },
  rejectBtn: {
    flex: 1, paddingVertical: s(9), borderRadius: s(10),
    borderWidth: s(1.5), borderColor: '#D0E0F8', alignItems: 'center',
  },
  rejectBtnText: { fontSize: s(13), fontWeight: '700', color: '#6B9DF0' },
  acceptBtn: {
    flex: 2, paddingVertical: s(9), borderRadius: s(10),
    backgroundColor: PRIMARY, alignItems: 'center',
  },
  acceptBtnText: { fontSize: s(13), fontWeight: '700', color: '#FFFFFF' },
  actionBtnDisabled: { opacity: 0.5 },

  // ── Message list ──
  messageList: { padding: s(14), paddingBottom: s(12), flexGrow: 1 },
  messageListEmpty: { flex: 1 },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: s(60) },
  emptyChatText: { fontSize: s(14), color: '#A8C8FA' },

  disconnectedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: s(6),
    backgroundColor: '#FEF2F2', paddingHorizontal: s(16), paddingVertical: s(6),
    borderTopWidth: s(1), borderTopColor: '#FECACA',
  },
  disconnectedText: { fontSize: s(12), color: '#DC2626' },

  // ── Date separator ──
  dateSeparator: {
    flexDirection: 'row', alignItems: 'center', gap: s(8), marginVertical: s(14),
  },
  dateLine:  { flex: 1, height: s(1), backgroundColor: '#D0E0F8' },
  dateLabel: { fontSize: s(10), color: '#A8C8FA', fontWeight: '500' },

  // ── Messages ──
  msgRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: s(8), marginBottom: s(4),
  },
  msgRowOther: { justifyContent: 'flex-start' },
  msgRowMine:  { justifyContent: 'flex-end' },
  msgAvatar: {
    width: s(40), height: s(40), borderRadius: s(20),
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0, alignSelf: 'flex-start', marginTop: 0,
  },
  msgAvatarSpacer: { width: s(40), flexShrink: 0 },
  msgAvatarText: { fontSize: s(12), fontWeight: '800', color: '#FFFFFF' },

  msgGroup:     { maxWidth: '72%', gap: s(3) },
  msgGroupMine: { alignItems: 'flex-end' },

  senderName: { fontSize: s(13), fontWeight: '600', color: '#6B9DF0', marginBottom: s(4), marginLeft: s(2) },

  bubbleRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: s(6) },
  bubbleRowMine: { flexDirection: 'row-reverse' },

  bubble: {
    paddingHorizontal: s(14), paddingVertical: s(10),
    borderRadius: s(18),
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderWidth: s(1), borderColor: '#D0E0F8',
    borderBottomLeftRadius: s(4),
  },
  bubbleMine: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: s(4),
  },
  bubbleText:     { fontSize: s(16), color: '#0C1C3C', lineHeight: s(22) },
  bubbleTextMine: { color: '#FFFFFF' },

  msgTime:      { fontSize: s(12), color: '#A8C8FA', paddingBottom: s(2) },
  msgTimeOther: {},

  translatedText: {
    fontSize: s(12), color: '#888',
    fontStyle: 'italic',
    marginTop: s(4), marginLeft: s(2),
  },
  nuanceBubble: {
    flexDirection: 'row', alignItems: 'flex-start', gap: s(5),
    backgroundColor: '#FFF9E6',
    borderWidth: s(1), borderColor: '#FFD60A',
    borderRadius: s(12),
    padding: s(8), marginTop: s(4),
    maxWidth: s(230),
  },
  nuanceIcon: { fontSize: 13 },
  nuanceText:  { fontSize: s(11.5), color: '#7A5900', lineHeight: s(17), flex: 1 },
  translateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    marginTop: s(4), paddingVertical: s(3), paddingHorizontal: s(8),
    borderWidth: s(1), borderColor: '#D0E0F8', borderRadius: s(10),
    alignSelf: 'flex-start',
  },
  translateBtnText: { fontSize: s(11), color: '#6B9DF0', fontWeight: '600' },

  systemMsgWrap: { alignItems: 'center', marginVertical: s(8) },
  systemMsgText: {
    fontSize: s(12), color: '#059669', fontWeight: '600',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: s(16), paddingVertical: s(8),
    borderRadius: s(20), overflow: 'hidden',
  },

  // ── Input ──
  inputBarLocked: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(6),
    paddingVertical: s(14),
    paddingBottom: Platform.OS === 'ios' ? s(12) : s(14),
    backgroundColor: '#FFFFFF',
    borderTopWidth: s(1), borderTopColor: '#EEF4FF',
  },
  inputLockedText: { fontSize: s(13), color: '#A8C8FA' },
  inputBarHidden: { display: 'none' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: s(10),
    paddingHorizontal: s(16),
    paddingTop: s(12),
    paddingBottom: Platform.OS === 'ios' ? 34 : s(16),
    backgroundColor: '#FFFFFF',
    borderTopWidth: s(1), borderTopColor: '#EEF4FF',
  },
  attachBtn: {
    width: s(44), height: s(44), borderRadius: s(22),
    backgroundColor: '#EEF4FF',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F8FF',
    borderRadius: s(22),
    paddingHorizontal: s(16),
    paddingTop: Platform.OS === 'ios' ? s(10) : s(8),
    paddingBottom: s(10),
    fontSize: s(14),
    color: '#0C1C3C',
    maxHeight: s(120),
    borderWidth: s(1), borderColor: '#D0E0F8',
    lineHeight: s(20),
  },
  micBtn: {
    width: s(44), height: s(44), borderRadius: s(22),
    backgroundColor: '#6B9DF0',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  micBtnActive: { backgroundColor: '#EF4444' },
  sendBtn: {
    width: s(42), height: s(42), borderRadius: s(21),
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: '#C2D4F0' },

  // ── 점세개 메뉴 ──
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  menuDropdown: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 108 : 72,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: s(14),
    paddingVertical: s(4),
    minWidth: s(160),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.12,
    shadowRadius: s(12),
    elevation: 8,
    borderWidth: s(1),
    borderColor: '#EEF4FF',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    paddingHorizontal: s(16),
    paddingVertical: s(14),
  },
  menuItemText: { fontSize: s(14), fontWeight: '700', color: '#0C1C3C' },
  menuItemDanger: { color: '#EF4444' },
  menuDivider: { height: s(1), backgroundColor: '#EEF4FF', marginHorizontal: s(12) },

  // ── 자동번역 바 ──
  translateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginHorizontal: s(14),
    marginTop: s(8),
    paddingHorizontal: s(14),
    paddingVertical: s(10),
    backgroundColor: '#F5F8FF',
    borderRadius: s(10),
    borderWidth: s(1),
    borderColor: '#D0E0F8',
  },
  translateBarText: { flex: 1, fontSize: s(13), fontWeight: '600', color: '#A8C8FA' },
  translateBarTextOn: { color: PRIMARY },
  translateToggle: {
    width: s(40), height: s(22), borderRadius: s(11),
    backgroundColor: '#D0E0F8',
    justifyContent: 'center',
    paddingHorizontal: s(2),
  },
  translateToggleOn: { backgroundColor: PRIMARY },
  translateThumb: {
    width: s(18), height: s(18), borderRadius: s(9),
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  translateThumbOn: { alignSelf: 'flex-end' },
});

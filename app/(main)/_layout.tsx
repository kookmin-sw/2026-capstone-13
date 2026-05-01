// 메인 탭 네비게이션 레이아웃
import { useEffect, useRef } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '@stomp/stompjs';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../../constants/colors';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useBannerStore } from '../../stores/bannerStore';
import { useTranslation } from 'react-i18next';
import { getMyRequests, getHelpedRequests } from '../../services/helpService';
import { getChatRooms } from '../../services/chatService';
import { getDirectChatRooms } from '../../services/directChatService';
import InAppBanner from '../../components/InAppBanner';
import CustomTabBar from '../../components/CustomTabBar';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-0a6f.up.railway.app/api';
const WS_URL = BASE_URL.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws-native';

export default function MainLayout() {
  const { unreadCount, incrementUnread, setUnreadCount } = useChatStore();
  const { user } = useAuthStore();
  const { showBanner } = useBannerStore();
  const { t } = useTranslation();
  const router = useRouter();
  const globalClientRef = useRef<Client | null>(null);
  // 채팅방별 파트너 정보 캐시 (roomId → room info)
  const roomCacheRef = useRef<Record<number, {
    requestTitle: string;
    partnerNickname: string;
    partnerProfileImage?: string;
    requestStatus: string;
    requesterId: string;
    partnerId?: string;
    partnerPreferredLanguage?: string;
    isDirect?: boolean;
  }>>({});

  // 앱 시작 시 전체 unread 합산 + 방 정보 캐시 (나간 방 제외)
  useEffect(() => {
    if (!user) return;
    const { hasLeft } = useChatStore.getState();
    const myId = Number(user.id);
    Promise.allSettled([getChatRooms(), getDirectChatRooms()]).then(([helpRes, directRes]) => {
      let total = 0;
      if (helpRes.status === 'fulfilled' && helpRes.value.success && Array.isArray(helpRes.value.data)) {
        total += helpRes.value.data
          .filter((r) => !hasLeft(r.id, myId) && r.status !== 'WAITING')
          .reduce((sum, r) => sum + (r.unreadCount ?? 0), 0);
        helpRes.value.data.forEach((r) => {
          roomCacheRef.current[r.id] = {
            requestTitle: r.title,
            partnerNickname: r.partnerNickname,
            partnerProfileImage: r.partnerProfileImage,
            requestStatus: r.status,
            requesterId: '',
            partnerId: String(r.partnerId ?? ''),
            partnerPreferredLanguage: r.partnerPreferredLanguage ?? 'en',
          };
        });
      }
      if (directRes.status === 'fulfilled' && directRes.value.success && Array.isArray(directRes.value.data)) {
        total += directRes.value.data
          .filter((r) => !hasLeft(r.id, myId))
          .reduce((sum, r) => sum + (r.unreadCount ?? 0), 0);
        directRes.value.data.forEach((r) => {
          roomCacheRef.current[-(r.id)] = {
            requestTitle: r.partnerNickname,
            partnerNickname: r.partnerNickname,
            partnerProfileImage: r.partnerProfileImage,
            requestStatus: 'DIRECT',
            requesterId: '',
            partnerId: String(r.partnerId ?? ''),
            isDirect: true,
          };
        });
      }
      setUnreadCount(total);
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const connect = async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!mounted) return;

      // 활성 채팅방 ID 수집
      const helpResults = await Promise.allSettled([getMyRequests(), getHelpedRequests()]);
      const directResult = await getDirectChatRooms().then(
        (value) => ({ status: 'fulfilled' as const, value }),
        (reason) => ({ status: 'rejected' as const, reason }),
      );
      if (!mounted) return;

      const activeRoomIds = new Set<number>();
      const directRoomIds = new Set<number>();
      helpResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success && Array.isArray(result.value.data)) {
          result.value.data
            .filter((r) => r.status === 'IN_PROGRESS' || r.status === 'MATCHED')
            .forEach((r) => activeRoomIds.add(r.id));
        }
      });
      if (directResult.status === 'fulfilled' && directResult.value.success && Array.isArray(directResult.value.data)) {
        directResult.value.data.forEach((r) => directRoomIds.add(r.id));
      }

      if (activeRoomIds.size === 0 && directRoomIds.size === 0) return;

      const client = new Client({
        webSocketFactory: () => new WebSocket(WS_URL),
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
        heartbeatIncoming: 0,
        heartbeatOutgoing: 0,
        reconnectDelay: 10000,
        onConnect: () => {
          if (!mounted) return;
          activeRoomIds.forEach((roomId) => {
            client.subscribe(`/topic/chat/${roomId}`, (frame) => {
              if (!mounted) return;
              try {
                const msg = JSON.parse(frame.body);
                if (msg.type === 'READ') return;
                if (msg.type === 'UNREAD_UPDATE') {
                  useChatStore.getState().setRoomUnreadCount(roomId, msg.unreadCount ?? 0);
                  return;
                }
                if (msg.content?.startsWith('SYS_LEAVE:')) return;
                if (msg.content?.startsWith('SYS_CALL_VIDEO:') || msg.content?.startsWith('SYS_CALL_VOICE:')) {
                  const { activeChatroomId } = useChatStore.getState();
                  if (msg.senderId === user?.id || activeChatroomId === roomId) return;
                  const isVideo = msg.content.startsWith('SYS_CALL_VIDEO:');
                  const callerNickname = msg.content.slice(isVideo ? 'SYS_CALL_VIDEO:'.length : 'SYS_CALL_VOICE:'.length);
                  Alert.alert(
                    isVideo ? t('chat.videoCall') : t('chat.voiceCall'),
                    t('chat.callRequest', { caller: callerNickname, type: isVideo ? 'video' : 'voice' }),
                    [
                      { text: t('chat.decline'), style: 'cancel' },
                      {
                        text: t('chat.accept'),
                        onPress: () => router.push({
                          pathname: '/videocall',
                          params: {
                            roomId: String(roomId),
                            partnerNickname: callerNickname,
                            voiceOnly: isVideo ? 'false' : 'true',
                            myUserId: String(user.id),
                            partnerUserId: roomCacheRef.current[roomId]?.partnerId ?? '',
                            targetLanguage: roomCacheRef.current[roomId]?.partnerPreferredLanguage ?? 'en',
                          },
                        }),
                      },
                    ]
                  );
                  return;
                }
                const { activeChatroomId } = useChatStore.getState();
                if (msg.senderId !== user.id && activeChatroomId !== roomId) {
                  incrementUnread();
                  const roomInfo = roomCacheRef.current[roomId];
                  showBanner({
                    type: 'chat',
                    title: msg.senderNickname ?? roomInfo?.partnerNickname ?? '새 메시지',
                    body: msg.content,
                    roomId,
                    roomParams: roomInfo ? {
                      requestTitle: roomInfo.requestTitle,
                      partnerNickname: roomInfo.partnerNickname,
                      partnerProfileImage: roomInfo.partnerProfileImage,
                      requestStatus: roomInfo.requestStatus,
                      requesterId: roomInfo.requesterId,
                      partnerId: roomInfo.partnerId,
                      partnerPreferredLanguage: roomInfo.partnerPreferredLanguage,
                    } : undefined,
                  });
                }
              } catch {}
            });
          });
          directRoomIds.forEach((roomId) => {
            client.subscribe(`/topic/direct/${roomId}`, (frame) => {
              if (!mounted) return;
              try {
                const msg = JSON.parse(frame.body);
                if (msg.type === 'READ') return;
                if (msg.type === 'UNREAD_UPDATE') {
                  useChatStore.getState().setRoomUnreadCount(roomId, msg.unreadCount ?? 0);
                  return;
                }
                if (msg.content?.startsWith('SYS_LEAVE:')) return;
                if (msg.content?.startsWith('SYS_CALL_VIDEO:') || msg.content?.startsWith('SYS_CALL_VOICE:')) {
                  const { activeChatroomId } = useChatStore.getState();
                  if (msg.senderId === user?.id || activeChatroomId === roomId) return;
                  const isVideo = msg.content.startsWith('SYS_CALL_VIDEO:');
                  const callerNickname = msg.content.slice(isVideo ? 'SYS_CALL_VIDEO:'.length : 'SYS_CALL_VOICE:'.length);
                  Alert.alert(
                    isVideo ? t('chat.videoCall') : t('chat.voiceCall'),
                    t('chat.callRequest', { caller: callerNickname, type: isVideo ? 'video' : 'voice' }),
                    [
                      { text: t('chat.decline'), style: 'cancel' },
                      {
                        text: t('chat.accept'),
                        onPress: () => router.push({
                          pathname: '/videocall',
                          params: {
                            roomId: String(roomId),
                            partnerNickname: callerNickname,
                            voiceOnly: isVideo ? 'false' : 'true',
                            myUserId: String(user.id),
                            partnerUserId: roomCacheRef.current[-(roomId)]?.partnerId ?? '',
                          },
                        }),
                      },
                    ]
                  );
                  return;
                }
                const { activeChatroomId } = useChatStore.getState();
                if (msg.senderId !== user.id && activeChatroomId !== roomId) {
                  incrementUnread();
                  const roomInfo = roomCacheRef.current[-(roomId)];
                  showBanner({
                    type: 'chat',
                    title: msg.senderNickname ?? roomInfo?.partnerNickname ?? '새 메시지',
                    body: msg.content,
                    roomId,
                    roomParams: roomInfo ? {
                      requestTitle: roomInfo.partnerNickname,
                      partnerNickname: roomInfo.partnerNickname,
                      partnerProfileImage: roomInfo.partnerProfileImage,
                      requestStatus: 'DIRECT',
                      requesterId: '',
                      isDirect: true,
                      partnerId: roomInfo.partnerId,
                    } : undefined,
                  });
                }
              } catch {}
            });
          });
        },
      });

      client.activate();
      globalClientRef.current = client;
    };

    connect();

    return () => {
      mounted = false;
      globalClientRef.current?.deactivate();
      globalClientRef.current = null;
    };
  }, [user?.id]);

  return (
    <View style={styles.root}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTitleStyle: {
            fontWeight: '700',
            color: Colors.textPrimary,
          },
          tabBarStyle: { display: 'none' },
        }}
      >
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          tabBarLabel: '홈',
        }}
      />
      <Tabs.Screen
        name="school"
        options={{
          headerShown: false,
          title: '학교생활',
          href: user?.userType === 'KOREAN' ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          headerShown: false,
          title: '커뮤니티',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      {/* requests는 내부적으로 유지 (탭바 미노출) */}
      <Tabs.Screen
        name="requests"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          headerShown: false,
          title: '채팅',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10, minWidth: 18, height: 18, borderRadius: 9 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          title: '마이페이지',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      {/* 탭바에 표시하지 않는 글쓰기 화면 */}
      <Tabs.Screen
        name="write"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
    <InAppBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

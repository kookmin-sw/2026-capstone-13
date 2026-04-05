// 메인 탭 네비게이션 레이아웃
import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '@stomp/stompjs';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../../constants/colors';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { getMyRequests, getHelpedRequests } from '../../services/helpService';
import { getChatRooms } from '../../services/chatService';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-0a6f.up.railway.app/api';
const WS_URL = BASE_URL.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws-native';

export default function MainLayout() {
  const { unreadCount, incrementUnread, setUnreadCount } = useChatStore();
  const { user } = useAuthStore();
  const globalClientRef = useRef<Client | null>(null);

  // 앱 시작 시 전체 unread 합산 (나간 방 제외)
  useEffect(() => {
    if (!user) return;
    const { hasLeft } = useChatStore.getState();
    const myId = Number(user.id);
    getChatRooms().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        const total = res.data
          .filter((r) => !hasLeft(r.id, myId))
          .reduce((sum, r) => sum + (r.unreadCount ?? 0), 0);
        setUnreadCount(total);
      }
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const connect = async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!mounted) return;

      // 활성 채팅방 ID 수집
      const results = await Promise.allSettled([getMyRequests(), getHelpedRequests()]);
      if (!mounted) return;

      const activeRoomIds = new Set<number>();
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success && Array.isArray(result.value.data)) {
          result.value.data
            .filter((r) => r.status === 'IN_PROGRESS' || r.status === 'MATCHED')
            .forEach((r) => activeRoomIds.add(r.id));
        }
      });

      if (activeRoomIds.size === 0) return;

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
                // 상대방 메시지이고 현재 그 채팅방 안에 없을 때만 뱃지 증가
                const { activeChatroomId } = useChatStore.getState();
                if (msg.senderId !== user.id && activeChatroomId !== roomId) {
                  incrementUnread();
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
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          paddingBottom: 8,
          height: 68,
        },
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: Colors.textPrimary,
        },
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
  );
}

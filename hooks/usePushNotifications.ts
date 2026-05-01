import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { updateFcmToken } from '../services/authService';

// 네이티브 모듈이 없는 빌드(구 dev 빌드 등)에서 크래시 방지
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // expo-notifications 네이티브 모듈 없는 환경에서는 무시
}

// Android 알림 채널 등록
export async function setupNotificationChannels() {
  if (Platform.OS !== 'android' || !Notifications) return;
  await Promise.all([
    Notifications.setNotificationChannelAsync('chat', {
      name: '채팅 메시지',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#4A90D9',
      sound: 'default',
    }),
    Notifications.setNotificationChannelAsync('calls', {
      name: '전화/영상통화',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#EF4444',
      sound: 'default',
      bypassDnd: true,
    }),
    Notifications.setNotificationChannelAsync('notifications', {
      name: '알림 (좋아요·댓글 등)',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150],
      lightColor: '#4A90D9',
      sound: 'default',
    }),
  ]);
}

export type PushNotificationData = {
  type: 'chat' | 'direct_chat' | 'call' | 'notification';
  roomId?: number;
  requestTitle?: string;
  partnerNickname?: string;
  partnerProfileImage?: string;
  requestStatus?: string;
  requesterId?: string;
  isDirect?: boolean;
  postId?: number;
  commentId?: number;
};

function navigateFromNotification(router: ReturnType<typeof useRouter>, data: PushNotificationData) {
  if (!data?.type) return;
  if (data.type === 'chat' || data.type === 'direct_chat') {
    if (data.roomId == null) return;
    router.push({
      pathname: '/chatroom',
      params: {
        roomId: String(data.roomId),
        requestTitle: data.requestTitle ?? '채팅',
        partnerNickname: data.partnerNickname ?? '상대방',
        partnerProfileImage: data.partnerProfileImage ?? '',
        requestStatus: data.requestStatus ?? (data.isDirect ? 'DIRECT' : ''),
        requesterId: data.requesterId ?? '',
        isDirect: data.isDirect ? 'true' : 'false',
      },
    });
  } else if (data.type === 'notification') {
    router.push('/notifications');
  }
}

export function usePushNotifications(userId: number | string | null | undefined) {
  const router = useRouter();
  const handledRef = useRef<string | null>(null);

  // 토큰 등록
  useEffect(() => {
    if (!userId || !Notifications) return;

    (async () => {
      try {
        const { status } = await Notifications!.getPermissionsAsync();
        if (status !== 'granted') return;

        await setupNotificationChannels();

        const tokenData = await Notifications!.getExpoPushTokenAsync({
          projectId: 'a30c69f3-b2d0-48b8-8067-64da49168c78',
        });
        await updateFcmToken(tokenData.data);
      } catch {
        // 권한 거부 또는 실패 시 무시
      }
    })();
  }, [userId]);

  // 알림 탭 리스너
  useEffect(() => {
    if (!Notifications) return;

    const sub1 = Notifications.addNotificationReceivedListener(() => {});

    const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PushNotificationData;
      navigateFromNotification(router, data);
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [router]);

  // 앱 종료 상태에서 알림 탭으로 열렸을 때
  const lastResponse = Notifications?.useLastNotificationResponse?.();
  useEffect(() => {
    if (!lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledRef.current === id) return;
    handledRef.current = id;
    const data = lastResponse.notification.request.content.data as PushNotificationData;
    navigateFromNotification(router, data);
  }, [lastResponse]);
}

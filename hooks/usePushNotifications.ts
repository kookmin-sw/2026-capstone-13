import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { updateFcmToken } from '../services/authService';

// 앱 포그라운드에서 수신 시 동작 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android 알림 채널 등록 (앱 시작 시 1회)
export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;
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

// 알림 데이터 타입
export type PushNotificationData = {
  type: 'chat' | 'direct_chat' | 'call' | 'notification';
  roomId?: number;
  requestTitle?: string;
  partnerNickname?: string;
  partnerProfileImage?: string;
  requestStatus?: string;
  requesterId?: string;
  isDirect?: boolean;
  // 커뮤니티 알림
  postId?: number;
  commentId?: number;
};

// 알림 탭 → 화면 이동
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
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // 토큰 등록
  useEffect(() => {
    if (!userId) return;

    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        await setupNotificationChannels();

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'a30c69f3-b2d0-48b8-8067-64da49168c78',
        });
        await updateFcmToken(tokenData.data);
      } catch {
        // 권한 거부 또는 실패 시 무시
      }
    })();
  }, [userId]);

  // 알림 수신 리스너 (포그라운드 — 배너는 setNotificationHandler가 처리)
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // 필요 시 여기서 상태 업데이트 가능
    });

    // 알림 탭 리스너 (백그라운드·종료 상태에서 탭했을 때)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PushNotificationData;
      navigateFromNotification(router, data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);

  // 앱이 완전히 종료된 상태에서 알림 탭으로 열렸을 때
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledRef.current === id) return;
    handledRef.current = id;
    const data = lastResponse.notification.request.content.data as PushNotificationData;
    navigateFromNotification(router, data);
  }, [lastResponse]);
}

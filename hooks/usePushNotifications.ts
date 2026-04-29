import { useEffect } from 'react';
import { Platform } from 'react-native';
import { updateFcmToken } from '../services/authService';

// expo-dev-client 빌드에서만 네이티브 모듈이 존재하므로 동적으로 로드
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
  // Expo Go 환경 등 네이티브 모듈 없을 때 무시
}

export function usePushNotifications(userId: number | string | null | undefined) {
  useEffect(() => {
    if (!userId || !Notifications) return;

    (async () => {
      try {
        const { status: existing } = await Notifications!.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications!.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        const tokenData = await Notifications!.getExpoPushTokenAsync({
          projectId: 'a30c69f3-b2d0-48b8-8067-64da49168c78',
        });

        if (Platform.OS === 'android') {
          await Notifications!.setNotificationChannelAsync('default', {
            name: '기본 알림',
            importance: Notifications!.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#4A90D9',
          });
        }

        await updateFcmToken(tokenData.data);
      } catch {
        // 권한 거부 또는 실패 시 조용히 무시
      }
    })();
  }, [userId]);
}

import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { updateFcmToken } from '../services/authService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(userId: number | string | null | undefined) {
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

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'a30c69f3-b2d0-48b8-8067-64da49168c78',
        });

        // Android 알림 채널 설정
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: '기본 알림',
            importance: Notifications.AndroidImportance.MAX,
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

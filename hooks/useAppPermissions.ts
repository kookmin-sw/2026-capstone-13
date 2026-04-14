import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

const PERMISSION_KEY = 'app_permissions_requested_v1';

async function showExplanation(title: string, message: string): Promise<void> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: '확인', onPress: resolve }]);
  });
}

async function requestAllPermissions() {
  // 1. 알림 권한
  const needsNotif =
    Platform.OS === 'ios' ||
    (Platform.OS === 'android' && Number(Platform.Version) >= 33);
  if (needsNotif) {
    await showExplanation(
      '알림 권한',
      '채팅 메시지, 도움 요청 수락/거절 등 중요한 알림을 받으려면 알림 권한이 필요합니다.',
    );
    if (Platform.OS === 'ios') {
      await Notifications.requestPermissionsAsync();
    } else {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
  }

  // 2. 카메라 권한
  await showExplanation(
    '카메라 권한',
    '화상통화 및 프로필·커뮤니티 사진 촬영을 위해 카메라 권한이 필요합니다.',
  );
  await ImagePicker.requestCameraPermissionsAsync();

  // 3. 마이크 권한
  await showExplanation(
    '마이크 권한',
    '화상통화, 음성통화 및 자막 기능 사용을 위해 마이크 권한이 필요합니다.',
  );
  await Audio.requestPermissionsAsync();

  // 4. 갤러리(미디어) 권한
  await showExplanation(
    '갤러리 접근 권한',
    '프로필 사진이나 커뮤니티 게시글에 사진을 업로드하려면 갤러리 접근 권한이 필요합니다.',
  );
  await ImagePicker.requestMediaLibraryPermissionsAsync();
}

export function useAppPermissions() {
  useEffect(() => {
    (async () => {
      try {
        const already = await AsyncStorage.getItem(PERMISSION_KEY);
        if (already) return;

        await requestAllPermissions();
        await AsyncStorage.setItem(PERMISSION_KEY, 'true');
      } catch {
        // 권한 요청 실패 시 조용히 무시
      }
    })();
  }, []);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import { InteractionManager, PermissionsAndroid, Platform } from 'react-native';

const PERMISSION_KEY = 'app_permissions_requested_v1';

async function requestAllPermissions() {
  // 1. 알림 (시뮬레이터/에뮬레이터는 푸시 미지원으로 건너뜀)
  try {
    const Notifications = await import('expo-notifications');
    if (Platform.OS === 'ios') {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    } else if (Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (!granted) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      }
    }
  } catch {
    // 시뮬레이터 등 푸시 미지원 환경에서는 무시
  }

  // 2. 카메라
  const { status: cameraStatus } = await ImagePicker.getCameraPermissionsAsync();
  if (cameraStatus !== 'granted') {
    await ImagePicker.requestCameraPermissionsAsync();
  }

  // 3. 마이크
  const { status: audioStatus } = await Audio.getPermissionsAsync();
  if (audioStatus !== 'granted') {
    await Audio.requestPermissionsAsync();
  }

  // 4. 갤러리
  if (Platform.OS === 'android') {
    const perm =
      Number(Platform.Version) >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const granted = await PermissionsAndroid.check(perm);
    if (!granted) {
      await PermissionsAndroid.request(perm);
    }
  } else {
    const { status: libraryStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (libraryStatus !== 'granted') {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
  }
}

export function useAppPermissions(enabled = false) {
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setModalVisible(false);
      return;
    }
    (async () => {
      try {
        const already = await AsyncStorage.getItem(PERMISSION_KEY);
        if (already) return;
        setModalVisible(true);
      } catch {
        // 무시
      }
    })();
  }, [enabled]);

  const handleConfirm = async () => {
    if (!enabled) return;
    setModalVisible(false);
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => resolve());
    });
    try {
      await requestAllPermissions();
      await AsyncStorage.setItem(PERMISSION_KEY, 'true');
    } catch {
      // 무시
    }
  };

  return { modalVisible, handleConfirm };
}

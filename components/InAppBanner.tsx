// 인앱 배너 알림 컴포넌트 (위에서 슬라이드 내려옴)
import { useEffect, useRef } from 'react';
import { s } from '../utils/scale';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useBannerStore } from '../stores/bannerStore';

const BANNER_HEIGHT = 72;
const AUTO_DISMISS_MS = 3500;

export default function InAppBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { current, dismissCurrent } = useBannerStore();
  const translateY = useSharedValue(-BANNER_HEIGHT - 20);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    translateY.value = withTiming(-BANNER_HEIGHT - 20, { duration: 300 }, (finished) => {
      if (finished) runOnJS(dismissCurrent)();
    });
  };

  useEffect(() => {
    if (current) {
      // 슬라이드 인
      translateY.value = withSpring(insets.top + 8, {
        damping: 18,
        stiffness: 200,
      });

      // 자동 닫기
      timerRef.current = setTimeout(() => {
        dismiss();
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current?.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!current) return null;

  const handlePress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dismiss();
    if (current.type === 'chat' && current.roomId != null) {
      router.push({
        pathname: '/chatroom',
        params: {
          roomId: String(current.roomId),
          requestTitle: current.roomParams?.requestTitle ?? '채팅',
          partnerNickname: current.roomParams?.partnerNickname ?? '상대방',
          partnerProfileImage: current.roomParams?.partnerProfileImage ?? '',
          requestStatus: current.roomParams?.requestStatus ?? '',
          requesterId: current.roomParams?.requesterId ?? '',
          isDirect: current.roomParams?.isDirect ? 'true' : 'false',
        },
      });
    } else if (current.type === 'notification') {
      router.push('/notifications');
    }
  };

  const iconName = current.type === 'chat' ? 'chatbubble' : 'notifications';
  const iconColor = current.type === 'chat' ? Colors.primary : Colors.warning;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        style={styles.banner}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={[styles.iconBox, { backgroundColor: current.type === 'chat' ? Colors.primaryLight : '#FEF3C7' }]}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <View style={styles.textBox}>
          <Text style={styles.title} numberOfLines={1}>{current.title}</Text>
          <Text style={styles.body} numberOfLines={1}>{current.body}</Text>
        </View>
        <TouchableOpacity onPress={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          dismiss();
        }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color={Colors.textLight} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: s(14),
    paddingHorizontal: s(14),
    paddingVertical: s(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.12,
    shadowRadius: s(10),
    elevation: 8,
    gap: s(10),
  },
  iconBox: {
    width: s(36),
    height: s(36),
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: s(13),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: s(2),
  },
  body: {
    fontSize: s(12),
    color: Colors.textSecondary,
  },
});

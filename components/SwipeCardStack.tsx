import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  runOnUI,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CategoryLabels, MethodLabels } from '../constants/colors';
import type { HelpRequest } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 90;
const CARD_HEIGHT = 390;
const CARD_BG = '#FFFFFF';
const ACCENT  = '#0EA5E9';

const SLOT_OFFSET  = [0, 16, 32];
const SLOT_OPACITY = [1, 0.85, 0.7];

const LANG_FLAG: Record<string, string> = {
  'en':      '🇺🇸',
  'ja':      '🇯🇵',
  'zh-Hans': '🇨🇳',
  'ru':      '🇷🇺',
  'mn':      '🇲🇳',
  'vi':      '🇻🇳',
};

function getUrgency(createdAt: string): { label: string; color: string } {
  const ms = Date.now() - new Date(createdAt.includes('Z') ? createdAt : createdAt + 'Z').getTime();
  if (ms > 2 * 60 * 60 * 1000) return { label: '긴급', color: '#F97316' };
  if (ms < 30 * 60 * 1000)     return { label: '신규', color: '#0EA5E9' };
  return                               { label: '진행', color: '#0EA5E9' };
}

function formatTime(iso: string): string {
  const ms = Date.now() - new Date(iso.includes('Z') ? iso : iso + 'Z').getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// ── 카드 한 장 ─────────────────────────────────────────────
const CardContent = memo(
  function CardContent({ card }: { card: HelpRequest }) {
    const [imgError, setImgError] = useState(false);
    const profileUri = card.requester.profileImage?.trim();
    const urgency = getUrgency(card.createdAt);
    const initial = card.requester.nickname.charAt(0);
    const showImage = !!profileUri && !imgError;

    return (
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            {showImage ? (
              <Image
                source={{ uri: profileUri }}
                style={styles.avatarImage}
                onError={() => setImgError(true)}
              />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.cardName}>{card.requester.nickname}</Text>
              {(card.requester.studentIdVerified || card.requester.studentIdStatus === 'APPROVED') && (
                <Ionicons name="shield-checkmark" size={16} color="#22c55e" style={styles.shieldIcon} />
              )}
              <View style={styles.urgencyBadge}>
                <View style={[styles.urgencyDot, { backgroundColor: urgency.color }]} />
                <Text style={[styles.urgencyText, { color: urgency.color }]}>{urgency.label}</Text>
              </View>
            </View>
            {card.requester.userType !== 'KOREAN' ? (
              card.requester.major ? (
                <Text style={styles.subText} numberOfLines={1}>{card.requester.major}</Text>
              ) : null
            ) : (
              card.requester.university ? (
                <Text style={styles.subText} numberOfLines={1}>{card.requester.university}</Text>
              ) : null
            )}
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={11} color="#7799BB" />
              <Text style={styles.timeSmall}>{formatTime(card.createdAt)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoLayer}>
          <Text style={styles.requestLabel}>도움 요청</Text>
          <Text style={styles.requestText} numberOfLines={4}>{card.title}</Text>
        </View>
      </View>
    );
  },
  (prev, next) => prev.card.id === next.card.id,
);

// ── 메인 컴포넌트 ─────────────────────────────────────────
interface SwipeCardProps {
  requests: HelpRequest[];
  onSwipeLeft?: (card: HelpRequest) => void;
  onSwipeRight?: (card: HelpRequest) => void;
  onSwipeActive?: (active: boolean) => void;
}

const SWIPE_THRESHOLD = 80;

export default function SwipeCardStack({ requests, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const [topIdx, setTopIdx] = useState(0);

  const translateX      = useSharedValue(0);
  const isSwiping       = useSharedValue(false);
  const backProgress    = useSharedValue(0);
  const topCardOpacity  = useSharedValue(1);

  const n = requests.length;
  const card0 = n > 0 ? requests[topIdx % n] : null;
  const card1 = n > 0 ? requests[(topIdx + 1) % n] : null;
  const card2 = n > 0 ? requests[(topIdx + 2) % n] : null;

  const onSwipeLeftRef  = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeLeftRef.current  = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;

  const card0Ref = useRef(card0);
  card0Ref.current = card0;

  const notifySwipe = useCallback((dir: 'left' | 'right') => {
    const card = card0Ref.current;
    if (card) {
      if (dir === 'right') onSwipeRightRef.current?.(card);
      else onSwipeLeftRef.current?.(card);
    }
    setTopIdx(prev => prev + 1);
  }, []);

  const advanceCard = useCallback((dir: 'left' | 'right') => {
    notifySwipe(dir);
  }, [notifySwipe]);

  // topIdx가 바뀐 뒤(새 카드 렌더 후) shared value 리셋
  useEffect(() => {
    runOnUI(() => {
      'worklet';
      translateX.value   = 0;
      backProgress.value = 0;
      isSwiping.value    = false;
      topCardOpacity.value = 1;
    })();
  }, [topIdx, translateX, backProgress, isSwiping, topCardOpacity]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (isSwiping.value) return;
      translateX.value = e.translationX;
      backProgress.value = Math.min(Math.abs(e.translationX) / SCREEN_WIDTH, 1);
    })
    .onEnd((e) => {
      if (isSwiping.value) return;

      const swipedRight = e.translationX > SWIPE_THRESHOLD || e.velocityX > 800;
      const swipedLeft  = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -800;

      if (swipedRight) {
        isSwiping.value = true;
        // 뒤 카드는 progress=1 상태로 고정 (전진 완료 위치에서 멈춤)
        backProgress.value = 1;
        translateX.value = withTiming(SCREEN_WIDTH + 200, { duration: 220 }, () => {
          runOnJS(advanceCard)('right');
        });
      } else if (swipedLeft) {
        isSwiping.value = true;
        backProgress.value = 1;
        translateX.value = withTiming(-(SCREEN_WIDTH + 200), { duration: 220 }, () => {
          runOnJS(advanceCard)('left');
        });
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        backProgress.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const topCardStyle = useAnimatedStyle(() => ({
    opacity: topCardOpacity.value,
    transform: [
      { translateX: translateX.value },
      { rotateZ: `${interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-12, 0, 12], Extrapolation.CLAMP)}deg` },
    ],
  }));

  // 중간 카드: backProgress 기반으로만 움직임, opacity 고정
  const midCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(backProgress.value, [0, 1], [SLOT_OFFSET[1], SLOT_OFFSET[0]]) }],
  }));

  // 뒤 카드: backProgress 기반으로만 움직임, opacity 고정
  const backCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(backProgress.value, [0, 1], [SLOT_OFFSET[2], SLOT_OFFSET[1]]) }],
  }));

  if (n === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.stack}>
        <Animated.View style={[styles.cardSlot, styles.backCard, backCardStyle]}>
          <CardContent card={card2!} />
        </Animated.View>

        <Animated.View style={[styles.cardSlot, styles.midCard, midCardStyle]}>
          <CardContent card={card1!} />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.cardSlot, styles.topCard, topCardStyle]}>
            <CardContent card={card0!} />
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-start',
    paddingLeft: 16,
  },
  stack: {
    width: CARD_WIDTH + SLOT_OFFSET[2],
    height: CARD_HEIGHT,
    position: 'relative',
  },
  cardSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    shadowColor: 'rgb(37,99,235)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  topCard:  { zIndex: 3, opacity: SLOT_OPACITY[0] },
  midCard:  { zIndex: 2, opacity: SLOT_OPACITY[1] },
  backCard: { zIndex: 1, opacity: SLOT_OPACITY[2] },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: CARD_BG,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  avatarWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D0D0D0',
  },
  avatarText: { fontSize: 31, fontWeight: '900', color: ACCENT },
  avatarImage: { width: '100%', height: '100%', borderRadius: 39 },
  profileInfo: { flex: 1, gap: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 19, fontWeight: '800', color: '#0C1C3C', letterSpacing: -0.3 },
  shieldIcon: { marginLeft: -4 },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  urgencyDot:  { width: 6, height: 6, borderRadius: 3 },
  urgencyText: { fontSize: 11, fontWeight: '700' },
  subText:  { fontSize: 14, color: '#667799', fontWeight: '600', marginTop: -2 },
  timeRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 0 },
  timeSmall: { fontSize: 13, color: '#7799BB' },
  divider: {
    height: 1,
    backgroundColor: '#D4E4FF',
    marginBottom: 16,
  },
  infoLayer: {
    flex: 1,
  },
  requestLabel: { fontSize: 13, fontWeight: '700', color: ACCENT, letterSpacing: 0.5, marginBottom: 8 },
  requestText:  { fontSize: 17, fontWeight: '600', color: '#0C1C3C', lineHeight: 26 },
});

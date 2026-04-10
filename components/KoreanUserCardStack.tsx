import React, { useRef, useState, useCallback, memo, useEffect } from 'react';
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
import type { User } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 90;
const CARD_HEIGHT = 390;
const CARD_BG = '#FFFFFF';
const ACCENT  = '#0EA5E9';

const SLOT_OFFSET  = [0, 16, 32];
const SLOT_OPACITY = [1, 0.85, 0.7];

function getLevel(count: number): { label: string; color: string } {
  if (count >= 31) return { label: '마스터', color: '#F97316' };
  if (count >= 16) return { label: '전문가', color: '#8B5CF6' };
  if (count >= 6)  return { label: '도우미', color: '#3B6FE8' };
  return                  { label: '새싹',   color: '#22C55E' };
}

const SERVER_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-0a6f.up.railway.app/api').replace('/api', '');

function toAbsoluteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url.startsWith('content://')) return url;
  return SERVER_BASE_URL + url;
}

// ── 카드 한 장 ─────────────────────────────────────────────
const CardContent = memo(
  function CardContent({ user }: { user: User }) {
    const [imgError, setImgError] = useState(false);
    const profileUri = toAbsoluteUrl(user.profileImage?.trim());
    const showImage = !!profileUri && !imgError;
    const initial = user.nickname.charAt(0);
    const lv = getLevel(user.helpCount);

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
              <Text style={styles.cardName}>{user.nickname}</Text>
              {(user.studentIdVerified || user.studentIdStatus === 'APPROVED') && (
                <Ionicons name="shield-checkmark" size={16} color="#22c55e" style={styles.shieldIcon} />
              )}
              <View style={[styles.levelBadge, { backgroundColor: lv.color + '18', borderColor: lv.color + '40' }]}>
                <Text style={[styles.levelText, { color: lv.color }]}>{lv.label}</Text>
              </View>
            </View>
            {user.major ? (
              <Text style={styles.subText} numberOfLines={1}>{user.major}</Text>
            ) : user.university ? (
              <Text style={styles.subText} numberOfLines={1}>{user.university}</Text>
            ) : null}
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#FBBF24" />
              <Text style={styles.ratingText}>{user.rating.toFixed(1)}</Text>
              {user.helpCount > 0 && (
                <>
                  <Text style={styles.dotSep}>·</Text>
                  <Ionicons name="heart" size={12} color={ACCENT} />
                  <Text style={styles.helpCountText}>도움 {user.helpCount}회</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoLayer}>
          <Text style={styles.requestLabel}>자기소개</Text>
          {user.bio ? (
            <Text style={styles.requestText} numberOfLines={4}>{user.bio}</Text>
          ) : (
            <Text style={styles.detailPlaceholder}>소개글이 없어요</Text>
          )}
        </View>
      </View>
    );
  },
  (prev, next) => prev.user.id === next.user.id,
);

// ── 메인 컴포넌트 ─────────────────────────────────────────
interface KoreanUserCardStackProps {
  users: User[];
  onPress?: (user: User) => void;
}

const SWIPE_THRESHOLD = 80;

export default function KoreanUserCardStack({ users, onPress }: KoreanUserCardStackProps) {
  const [topIdx, setTopIdx] = useState(0);

  const translateX     = useSharedValue(0);
  const isSwiping      = useSharedValue(false);
  const backProgress   = useSharedValue(0);
  const topCardOpacity = useSharedValue(1);

  const n = users.length;
  const card0 = n > 0 ? users[topIdx % n] : null;
  const card1 = n > 0 ? users[(topIdx + 1) % n] : null;
  const card2 = n > 0 ? users[(topIdx + 2) % n] : null;

  const card0Ref   = useRef(card0);
  const onPressRef = useRef(onPress);
  card0Ref.current   = card0;
  onPressRef.current = onPress;

  const notifySwipe = useCallback((dir: 'left' | 'right') => {
    const card = card0Ref.current;
    if (dir === 'right' && card) onPressRef.current?.(card);
    setTopIdx(prev => prev + 1);
  }, []);

  const advanceCard = useCallback((dir: 'left' | 'right') => {
    notifySwipe(dir);
  }, [notifySwipe]);

  useEffect(() => {
    runOnUI(() => {
      'worklet';
      translateX.value     = 0;
      backProgress.value   = 0;
      isSwiping.value      = false;
      topCardOpacity.value = 1;
    })();
  }, [topIdx, translateX, backProgress, isSwiping, topCardOpacity]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (isSwiping.value) return;
      translateX.value   = e.translationX;
      backProgress.value = Math.min(Math.abs(e.translationX) / SCREEN_WIDTH, 1);
    })
    .onEnd((e) => {
      if (isSwiping.value) return;

      const swipedRight = e.translationX > SWIPE_THRESHOLD || e.velocityX > 800;
      const swipedLeft  = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -800;

      if (swipedRight) {
        isSwiping.value    = true;
        backProgress.value = 1;
        translateX.value   = withTiming(SCREEN_WIDTH + 200, { duration: 320 }, () => {
          runOnJS(advanceCard)('right');
        });
      } else if (swipedLeft) {
        isSwiping.value    = true;
        backProgress.value = 1;
        translateX.value   = withTiming(-(SCREEN_WIDTH + 200), { duration: 320 }, () => {
          runOnJS(advanceCard)('left');
        });
      } else {
        translateX.value   = withSpring(0, { damping: 25, stiffness: 120 });
        backProgress.value = withSpring(0, { damping: 25, stiffness: 120 });
      }
    });

  const topCardStyle = useAnimatedStyle(() => ({
    opacity: topCardOpacity.value,
    transform: [
      { translateX: translateX.value },
      { rotateZ: `${interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-12, 0, 12], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const midCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(backProgress.value, [0, 1], [SLOT_OFFSET[1], SLOT_OFFSET[0]]) }],
  }));

  const backCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(backProgress.value, [0, 1], [SLOT_OFFSET[2], SLOT_OFFSET[1]]) }],
  }));

  if (n === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.stack}>
        {n >= 3 && (
          <Animated.View style={[styles.cardSlot, styles.backCard, backCardStyle]}>
            <CardContent user={card2!} />
          </Animated.View>
        )}

        {n >= 2 && (
          <Animated.View style={[styles.cardSlot, styles.midCard, midCardStyle]}>
            <CardContent user={card1!} />
          </Animated.View>
        )}

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.cardSlot, styles.topCard, topCardStyle]}>
            <CardContent user={card0!} />
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
    gap: 16,
    marginBottom: 18,
  },
  avatarWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
  avatarText: { fontSize: 44, fontWeight: '900', color: ACCENT },
  avatarImage: { width: '100%', height: '100%', borderRadius: 55 },
  profileInfo: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 22, fontWeight: '800', color: '#0C1C3C', letterSpacing: -0.3 },
  shieldIcon: { marginLeft: -4 },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelText: { fontSize: 13, fontWeight: '700' },
  subText: { fontSize: 16, color: '#667799', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 0 },
  ratingText: { fontSize: 15, color: '#7799BB', fontWeight: '600' },
  dotSep: { fontSize: 15, color: '#AABBCC' },
  helpCountText: { fontSize: 15, color: '#7799BB', fontWeight: '600' },
  divider: {
    height: 1,
    backgroundColor: '#D4E4FF',
    marginBottom: 16,
  },
  infoLayer: {
    flex: 1,
  },
  requestLabel: { fontSize: 15, fontWeight: '700', color: ACCENT, letterSpacing: 0.5, marginBottom: 8 },
  requestText: { fontSize: 19, fontWeight: '600', color: '#0C1C3C', lineHeight: 28 },
  detailPlaceholder: { fontSize: 17, color: '#AABBCC', fontStyle: 'italic' },
});

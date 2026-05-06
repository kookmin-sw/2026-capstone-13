import React, { useRef, useState, useCallback, memo } from 'react';
import { getInitial } from '../utils/getInitial';
import { s } from '../utils/scale';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { User } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_TABLET   = SCREEN_WIDTH >= 768;
const CARD_WIDTH  = IS_TABLET ? Math.min(SCREEN_WIDTH * 0.55, 600) : SCREEN_WIDTH - 90;
const CARD_HEIGHT = IS_TABLET ? Math.min(Math.round(SCREEN_HEIGHT * 0.55), 650) : Math.round(SCREEN_HEIGHT * 0.53);
const ACCENT      = '#0EA5E9';
const BLUE        = '#3B6FE8';

// 슬롯별 scale / 오른쪽 peek offset (슬롯 0 = 앞, 1 = 중간, 2 = 뒤)
const SLOT_SCALE:    [number, number, number] = [1,    1,    1];
const SLOT_PEEK_X:   [number, number, number] = [0,    18,   32];
const SLOT_PEEK_Y:   [number, number, number] = [0,    0,    0];

const GRAD_START = 0;
const GRAD_MAX_A = 0.95;
const GRAD_STEPS = 200;
const GRAD_RANGE = 100 - GRAD_START;
const GRAD_H     = GRAD_RANGE / GRAD_STEPS;

const GRADIENT_LAYERS = Array.from({ length: GRAD_STEPS }, (_, i) => {
  const t      = i / (GRAD_STEPS - 1);
  const eased  = t * t * t;
  const alpha  = parseFloat((eased * GRAD_MAX_A).toFixed(4));
  const top    = parseFloat((GRAD_START + i * GRAD_H).toFixed(4));
  const isLast = i === GRAD_STEPS - 1;
  return (
    <View
      key={i}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: `${top}%`,
        height: `${GRAD_H}%`,
        backgroundColor: `rgba(0,0,0,${alpha})`,
        ...(isLast ? { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 } : {}),
      }}
    />
  );
});

const SERVER_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-0a6f.up.railway.app/api').replace('/api', '');

function toAbsoluteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url.startsWith('content://')) return url;
  return SERVER_BASE_URL + url;
}

// user.id → 말줄임 여부 캐시 (컴포넌트 외부에서 측정 결과 보존)
const truncatedCache = new Map<string | number, boolean>();

// ── 카드 한 장 ─────────────────────────────────────────────
const CardContent = memo(
  function CardContent({ user, onPress, onSkip, onProfilePress }: { user: User; onPress?: () => void; onSkip?: () => void; onProfilePress?: () => void }) {
    const { t } = useTranslation();
    const [imgError, setImgError] = useState(false);
    const [isTruncated, setIsTruncated] = useState(() => truncatedCache.get(user.id) ?? false);
    const profileUri = toAbsoluteUrl(user.profileImage?.trim());
    const showImage  = !!profileUri && !imgError;
    const initial    = getInitial(user.nickname);
    const isVerified = user.studentIdVerified || user.studentIdStatus === 'APPROVED';

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={onProfilePress}>
        {showImage ? (
          <ImageBackground
            source={{ uri: profileUri }}
            style={StyleSheet.absoluteFill}
            imageStyle={styles.bgImage}
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.bgFallback]}>
            <Text style={styles.bgInitial}>{initial}</Text>
          </View>
        )}

        {GRADIENT_LAYERS}

        {/* 좌상단 넘기기 버튼 */}
        <TouchableOpacity style={styles.arrowBtn} onPress={onSkip} activeOpacity={0.75}>
          <Ionicons name="arrow-back-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.cardBottom}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName}>{user.nickname}</Text>
          </View>

          {user.major ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoText} numberOfLines={1}>{user.major}</Text>
              {isVerified && (
                <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
              )}
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <Ionicons name="star" size={13} color="#FBBF24" />
            <Text style={styles.statsText}>{user.rating.toFixed(1)}</Text>
            {user.helpCount > 0 && (
              <>
                <Text style={styles.statsDot}>·</Text>
                <Ionicons name="heart" size={13} color={ACCENT} />
                <Text style={styles.statsText}>{t('requestDetail.helpCountDetail', { count: user.helpCount })}</Text>
              </>
            )}
          </View>

          <View style={styles.bubbleWrap}>
            <View style={styles.bubbleTail} />
            <View style={styles.bubble}>
              <Text
                style={styles.bubbleText}
                numberOfLines={5}
                onTextLayout={(e) => {
                  const result = e.nativeEvent.lines.length >= 5;
                  truncatedCache.set(user.id, result);
                  setIsTruncated(result);
                }}
              >
                {user.bio ?? ''}
                {isTruncated && <Text style={styles.bubbleMore}>  ...{t('home.more')}</Text>}
              </Text>
            </View>
          </View>
        </View>

        {/* 카드 하단 버튼 */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.acceptBtn} onPress={onPress} activeOpacity={0.75}>
            <View style={styles.pillBtn}>
              <Text style={styles.btnLabel}>{t('home.requestAction')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) => prev.user.id === next.user.id,
);

// ── 메인 컴포넌트 ─────────────────────────────────────────
interface ForeignAccountCardStackProps {
  users: User[];
  onPress?: (user: User) => void;
  onProfilePress?: (user: User) => void;
}

const SWIPE_THRESHOLD = 80;

export default function ForeignAccountCardStack({ users, onPress, onProfilePress }: ForeignAccountCardStackProps) {
  const n = users.length;

  const [order, setOrder] = useState<[number, number, number]>([0, 1, 2]);

  const translateX    = useSharedValue(0);
  const swipeProgress = useSharedValue(0);
  const isSwiping     = useSharedValue(false);

  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const advanceOrderFn = useCallback(() => {
    setOrder(([a, b, c]) => {
      const nextBack = (a + 3) % n;
      return [b, c, nextBack] as [number, number, number];
    });
    requestAnimationFrame(() => {
      translateX.value    = 0;
      swipeProgress.value = 0;
      isSwiping.value     = false;
    });
  }, [n, translateX, swipeProgress, isSwiping]);

  const advanceOrderRef = useRef(advanceOrderFn);
  advanceOrderRef.current = advanceOrderFn;
  const stableAdvance = useCallback(() => advanceOrderRef.current(), []);

  const handleSkip = useCallback(() => {
    if (isSwiping.value) return;
    isSwiping.value     = true;
    swipeProgress.value = withTiming(1, { duration: 200 });
    translateX.value    = withTiming(-(SCREEN_WIDTH + 200), { duration: 350 }, () => {
      runOnJS(stableAdvance)();
    });
  }, [isSwiping, swipeProgress, translateX, stableAdvance]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (isSwiping.value) return;
      translateX.value = e.translationX > 0
        ? Math.min(e.translationX, 40)
        : e.translationX;
      swipeProgress.value = Math.min(Math.abs(e.translationX) / SCREEN_WIDTH, 1);
    })
    .onEnd((e) => {
      if (isSwiping.value) return;
      const swipedLeft = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -800;
      if (swipedLeft) {
        isSwiping.value = true;
        swipeProgress.value = withTiming(1, { duration: 200 });
        translateX.value = withTiming(-(SCREEN_WIDTH + 200), { duration: 350 }, () => {
          runOnJS(stableAdvance)();
        });
      } else {
        translateX.value    = withSpring(0, { damping: 25, stiffness: 150 });
        swipeProgress.value = withSpring(0, { damping: 25, stiffness: 150 });
      }
    });

  const slot0Style = useAnimatedStyle(() => ({
    zIndex: 3,
    transform: [
      { translateX: translateX.value },
      {
        rotateZ: `${interpolate(
          translateX.value,
          [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
          [-12, 0, 12],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  const slot1Style = useAnimatedStyle(() => ({
    zIndex: 2,
    transform: [
      { translateX: interpolate(swipeProgress.value, [0, 1], [SLOT_PEEK_X[1], SLOT_PEEK_X[0]]) },
      { translateY: interpolate(swipeProgress.value, [0, 1], [SLOT_PEEK_Y[1], SLOT_PEEK_Y[0]]) },
      { scale:      interpolate(swipeProgress.value, [0, 1], [SLOT_SCALE[1],  SLOT_SCALE[0]]) },
    ],
  }));

  const slot2Style = useAnimatedStyle(() => ({
    zIndex: 1,
    transform: [
      { translateX: interpolate(swipeProgress.value, [0, 1], [SLOT_PEEK_X[2], SLOT_PEEK_X[1]]) },
      { translateY: interpolate(swipeProgress.value, [0, 1], [SLOT_PEEK_Y[2], SLOT_PEEK_Y[1]]) },
      { scale:      interpolate(swipeProgress.value, [0, 1], [SLOT_SCALE[2],  SLOT_SCALE[1]]) },
    ],
  }));

  if (n === 0) return null;

  const user0 = users[order[0] % n];
  const user1 = n > 1 ? users[order[1] % n] : users[0];
  const user2 = n > 2 ? users[order[2] % n] : users[0];

  return (
    <View style={styles.wrapper}>
      <View style={styles.stack}>
        <Animated.View style={[styles.cardSlot, slot2Style]}>
          <CardContent user={user2} />
        </Animated.View>
        <Animated.View style={[styles.cardSlot, slot1Style]}>
          <CardContent user={user1} />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.cardSlot, slot0Style]}>
            <CardContent
              user={user0}
              onPress={onPress ? () => onPressRef.current?.(user0) : undefined}
              onSkip={handleSkip}
              onProfilePress={onProfilePress ? () => onProfilePress(user0) : undefined}
            />
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginTop: s(16),
  },
  stack: {
    width: CARD_WIDTH + SLOT_PEEK_X[2],
    height: CARD_HEIGHT + SLOT_PEEK_Y[2],
    position: 'relative',
  },
  cardSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: s(32),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.18,
    shadowRadius: s(18),
    elevation: 8,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: s(32),
    overflow: 'hidden',
    backgroundColor: '#1A2A4A',
  },
  bgImage: {
    borderRadius: s(32),
    resizeMode: 'cover',
  },
  bgFallback: {
    backgroundColor: '#1A2A4A',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: s(32),
  },
  bgInitial: {
    fontSize: s(80),
    fontWeight: '900',
    color: 'rgba(255,255,255,0.25)',
  },
  arrowBtn: {
    position: 'absolute',
    left: 14,
    top: 14,
    width: s(48),
    height: s(48),
    borderRadius: s(24),
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cardBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 56,
    paddingHorizontal: s(18),
    paddingBottom: s(16),
    paddingTop: s(16),
    gap: s(5),
    marginBottom: s(5),
  },
  actionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    height: s(56),
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    flexWrap: 'wrap',
  },
  cardName: {
    fontSize: s(24),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  ageText: {
    fontSize: s(20),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  levelBadge: {
    borderRadius: s(10),
    paddingHorizontal: s(8),
    paddingVertical: s(2),
  },
  levelText: {
    fontSize: s(11),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
  },
  infoText: {
    fontSize: s(15),
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    marginTop: s(2),
  },
  statsText: {
    fontSize: s(14),
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '800',
  },
  statsDot: {
    fontSize: s(13),
    color: 'rgba(255,255,255,0.5)',
  },
  bubbleWrap: {
    alignSelf: 'stretch',
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 0,
    borderRightWidth: s(10),
    borderBottomWidth: s(10),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255,255,255,0.8)',
    marginLeft: 0,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: s(18),
    borderTopLeftRadius: 0,
    paddingHorizontal: s(14),
    paddingVertical: s(16),
    paddingBottom: s(30),
  },
  bubbleText: {
    fontSize: s(15),
    fontWeight: '600',
    color: '#111',
    lineHeight: s(22),
  },
  bubbleMore: {
    fontSize: s(13),
    fontWeight: '700',
    color: ACCENT,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    backgroundColor: BLUE,
    paddingHorizontal: s(44),
    paddingVertical: s(13),
    borderRadius: 999,
  },
  btnLabel: {
    fontSize: s(18),
    fontWeight: '700',
    color: '#fff',
  },
  acceptBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

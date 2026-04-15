import React, { useRef, useState, useCallback, memo } from 'react';
import { getInitial } from '../utils/getInitial';
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
import type { User } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH  = SCREEN_WIDTH - 90;
const CARD_HEIGHT = Math.round(SCREEN_HEIGHT * 0.53);
const ACCENT      = '#0EA5E9';

// 슬롯별 scale / 오른쪽 peek offset (슬롯 0 = 앞, 1 = 중간, 2 = 뒤)
const SLOT_SCALE:    [number, number, number] = [1,    1,    1];
const SLOT_PEEK_X:   [number, number, number] = [0,    28,   52];
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
        ...(isLast ? { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 } : {}),
      }}
    />
  );
});

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

// user.id → 말줄임 여부 캐시 (컴포넌트 외부에서 측정 결과 보존)
const truncatedCache = new Map<string | number, boolean>();

// ── 카드 한 장 ─────────────────────────────────────────────
const CardContent = memo(
  function CardContent({ user, onPress }: { user: User; onPress?: () => void }) {
    const [imgError, setImgError] = useState(false);
    // 캐시에 이미 측정값이 있으면 초기값으로 사용 → 리마운트 시 깜빡임 방지
    const [isTruncated, setIsTruncated] = useState(() => truncatedCache.get(user.id) ?? false);
    const profileUri = toAbsoluteUrl(user.profileImage?.trim());
    const showImage  = !!profileUri && !imgError;
    const initial    = getInitial(user.nickname);
    const lv         = getLevel(user.helpCount);
    const isVerified = user.studentIdVerified || user.studentIdStatus === 'APPROVED';

    return (
      <View style={styles.card}>
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

        <View style={styles.cardBottom}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName}>{user.nickname}</Text>
            {user.age ? (
              <Text style={styles.ageText}>{user.age}</Text>
            ) : null}
            <View style={[styles.levelBadge, { backgroundColor: lv.color }]}>
              <Text style={styles.levelText}>{lv.label}</Text>
            </View>
          </View>

          {user.major ? (
            <View style={styles.infoRow}>
              <Ionicons name="book-outline" size={13} color="rgba(255,255,255,0.8)" />
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
                <Text style={styles.statsText}>도움 {user.helpCount}회</Text>
              </>
            )}
          </View>

          <View style={styles.bubbleWrap}>
            <View style={styles.bubbleTail} />
            <View style={styles.bubble}>
              <Text
                style={styles.bubbleText}
                numberOfLines={3}
                onTextLayout={(e) => {
                  const result = e.nativeEvent.lines.length >= 3;
                  truncatedCache.set(user.id, result);
                  setIsTruncated(result);
                }}
              >
                {user.bio ?? ''}
                {isTruncated && <Text style={styles.bubbleMore}>  ...더보기</Text>}
              </Text>
              <View style={styles.bubbleFooter}>
                <TouchableOpacity style={styles.detailBtn} onPress={onPress} activeOpacity={0.75}>
                  <Text style={styles.detailBtnText}>요청하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  },
  (prev, next) => prev.user.id === next.user.id,
);

// ── 메인 컴포넌트 ─────────────────────────────────────────
interface ForeignAccountCardStackProps {
  users: User[];
  onPress?: (user: User) => void;
}

const SWIPE_THRESHOLD = 80;

/**
 * 3장 고정 슬롯 순환 카드 스택
 *
 * 슬롯 zIndex:  front(2) > mid(1) > back(0)
 * 데이터 인덱스: order[0]=앞, order[1]=중간, order[2]=뒤
 *
 * 스와이프 완료 시 JS side에서 order를 순환시키고
 * 동시에 UI는 애니메이션이 끝난 후 즉시 리셋되므로 깜빡임 없음.
 */
export default function ForeignAccountCardStack({ users, onPress }: ForeignAccountCardStackProps) {
  const n = users.length;

  // order[slot] = users 배열 인덱스
  // 초기: slot0=앞, slot1=중간, slot2=뒤
  const [order, setOrder] = useState<[number, number, number]>([0, 1, 2]);

  // 앞 카드 애니메이션
  const translateX = useSharedValue(0);
  const swipeProgress = useSharedValue(0); // 0~1

  const isSwiping = useSharedValue(false);

  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  const advanceOrderFn = useCallback(() => {
    setOrder(([a, b, c]) => {
      const nextBack = (a + 3) % n;
      return [b, c, nextBack] as [number, number, number];
    });
    translateX.value = 0;
    swipeProgress.value = 0;
    isSwiping.value = false;
  }, [n, translateX, swipeProgress, isSwiping]);

  const advanceOrderRef = useRef(advanceOrderFn);
  advanceOrderRef.current = advanceOrderFn;
  const stableAdvance = useCallback(() => advanceOrderRef.current(), []);

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
        translateX.value = withSpring(0, { damping: 25, stiffness: 150 });
        swipeProgress.value = withSpring(0, { damping: 25, stiffness: 150 });
      }
    });

  // ── 슬롯별 animated style ──────────────────────────────

  // slot 0 (앞): 스와이프 대상
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

  // slot 1 (중간): 스와이프할수록 앞 위치로 이동
  const slot1Style = useAnimatedStyle(() => ({
    zIndex: 2,
    transform: [
      { translateX: interpolate(swipeProgress.value, [0, 1], [SLOT_PEEK_X[1], SLOT_PEEK_X[0]]) },
      { translateY: interpolate(swipeProgress.value, [0, 1], [SLOT_PEEK_Y[1], SLOT_PEEK_Y[0]]) },
      { scale:      interpolate(swipeProgress.value, [0, 1], [SLOT_SCALE[1],  SLOT_SCALE[0]]) },
    ],
  }));

  // slot 2 (뒤): 스와이프할수록 중간 위치로 이동
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
        {/* slot 2: 가장 뒤 */}
        <Animated.View style={[styles.cardSlot, slot2Style]}>
          <CardContent user={user2} />
        </Animated.View>

        {/* slot 1: 중간 */}
        <Animated.View style={[styles.cardSlot, slot1Style]}>
          <CardContent user={user1} />
        </Animated.View>

        {/* slot 0: 앞, 스와이프 가능 */}
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.cardSlot, slot0Style]}>
            <CardContent
              user={user0}
              onPress={onPress ? () => onPressRef.current?.(user0) : undefined}
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
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },

  card: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A2A4A',
  },
  bgImage: {
    borderRadius: 20,
    resizeMode: 'cover',
  },
  bgFallback: {
    backgroundColor: '#1A2A4A',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  bgInitial: {
    fontSize: 80,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.25)',
  },

  cardBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 20,
    paddingTop: 15,
    gap: 5,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  ageText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  levelBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statsText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  statsDot: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },

  bubbleWrap: {
    alignSelf: 'stretch',
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 0,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255,255,255,0.8)',
    marginLeft: 0,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 18,
    borderTopLeftRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    lineHeight: 22,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  bubbleMore: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },
  detailBtn: {
    marginLeft: 'auto',
    backgroundColor: '#3B6FE8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  detailBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});

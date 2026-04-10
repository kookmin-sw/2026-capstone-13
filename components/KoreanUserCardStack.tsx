import React, { useRef, useState, useCallback, memo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
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
  runOnUI,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH  = SCREEN_WIDTH - 90;
const CARD_HEIGHT = 420;
const ACCENT      = '#0EA5E9';

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

// hobbies 문자열 → 태그 배열 (최대 4개)
function parseHobbies(hobbies: string | undefined): string[] {
  if (!hobbies) return [];
  return hobbies
    .split(/[,，、\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

// ── 카드 한 장 ─────────────────────────────────────────────
const CardContent = memo(
  function CardContent({ user, onPress }: { user: User; onPress?: () => void }) {
    const [imgError, setImgError] = useState(false);
    const profileUri = toAbsoluteUrl(user.profileImage?.trim());
    const showImage  = !!profileUri && !imgError;
    const initial    = user.nickname.charAt(0);
    const lv         = getLevel(user.helpCount);
    const tags        = parseHobbies(user.hobbies);
    const isVerified  = user.studentIdVerified || user.studentIdStatus === 'APPROVED';

    return (
      <View style={styles.card}>
        {/* 배경 사진 */}
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


        {/* 하단 그라데이션 오버레이 */}
        <View style={styles.gradient}>
          {/* 이름 + 뱃지 */}
          <View style={styles.nameRow}>
            <Text style={styles.cardName}>{user.nickname}</Text>
            {user.age ? (
              <Text style={styles.ageText}>{user.age}</Text>
            ) : null}
            <View style={[styles.levelBadge, { backgroundColor: lv.color }]}>
              <Text style={styles.levelText}>{lv.label}</Text>
            </View>
          </View>

          {/* 전공 + 인증 뱃지 */}
          {user.major ? (
            <View style={styles.infoRow}>
              <Ionicons name="book-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoText} numberOfLines={1}>{user.major}</Text>
              {isVerified && (
                <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
              )}
            </View>
          ) : null}

          {/* 별점 + 도움 횟수 */}
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

          {/* 자기소개 + 요청하기 버튼 */}
          <View style={styles.bottomRow}>
            {user.bio ? (
              <Text style={styles.bioText} numberOfLines={2}>{user.bio}</Text>
            ) : <View style={{ flex: 1 }} />}
            <TouchableOpacity style={styles.requestBtn} onPress={onPress} activeOpacity={0.85}>
              <Text style={styles.requestBtnText}>요청하기</Text>
            </TouchableOpacity>
          </View>
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

  const n     = users.length;
  const card0 = n > 0 ? users[topIdx % n] : null;
  const card1 = n > 0 ? users[(topIdx + 1) % n] : null;
  const card2 = n > 0 ? users[(topIdx + 2) % n] : null;

  const card0Ref   = useRef(card0);
  const onPressRef = useRef(onPress);
  card0Ref.current   = card0;
  onPressRef.current = onPress;

  const notifySwipe = useCallback((dir: 'left' | 'right') => {
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
      // 오른쪽은 최대 40px까지만 드래그 허용
      translateX.value   = e.translationX > 0 ? Math.min(e.translationX, 40) : e.translationX;
      backProgress.value = Math.min(Math.abs(e.translationX) / SCREEN_WIDTH, 1);
    })
    .onEnd((e) => {
      if (isSwiping.value) return;

      const swipedLeft = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -800;

      if (swipedLeft) {
        isSwiping.value    = true;
        backProgress.value = 1;
        translateX.value   = withTiming(-(SCREEN_WIDTH + 200), { duration: 320 }, () => {
          runOnJS(advanceCard)('left');
        });
      } else {
        translateX.value   = withSpring(0, { damping: 25, stiffness: 150 });
        backProgress.value = withSpring(0, { damping: 25, stiffness: 150 });
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
            <CardContent user={card0!} onPress={onPress ? () => onPress(card0!) : undefined} />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  topCard:  { zIndex: 3, opacity: SLOT_OPACITY[0] },
  midCard:  { zIndex: 2, opacity: SLOT_OPACITY[1] },
  backCard: { zIndex: 1, opacity: SLOT_OPACITY[2] },

  // 카드 자체
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

  // 상단 태그 행
  topTagRow: {
    position: 'absolute',
    top: 16,
    left: 12,
    right: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    zIndex: 10,
  },
  topTag: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  topTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // 하단 오버레이 (반투명 검정)
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 20,
    paddingTop: 15,
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  // 이름 행
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

  // 정보 행
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

  // 별점 행
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

  // 자기소개
  bioText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 19,
    marginTop: 4,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  requestBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginLeft: 8,
  },
  requestBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});

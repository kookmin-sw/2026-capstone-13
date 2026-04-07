import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 90;
const CARD_HEIGHT = 390;
const CARD_BG = '#FFFFFF';
const ACCENT  = '#0EA5E9';

const SLOT_OFFSET = [0, 16, 32];
const SLOT_OPACITY = [1, 0.8, 0.6];

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

function CardContent({ user }: { user: User }) {
  const [imgError, setImgError] = useState(false);
  const profileUri = toAbsoluteUrl(user.profileImage?.trim());
  const showImage = !!profileUri && !imgError;
  const initial = user.nickname.charAt(0);
  const lv = getLevel(user.helpCount);

  return (
    <View style={styles.card}>
      {/* 상단: 프로필 */}
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
              <Ionicons name="shield-checkmark" size={16} color="#22c55e" style={{ marginLeft: -4 }} />
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

      {/* 구분선 */}
      <View style={styles.divider} />

      {/* 하단: 소개글 */}
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
}

interface KoreanUserCardStackProps {
  users: User[];
  onPress?: (user: User) => void;
}

const SWIPE_THRESHOLD = 80;

export default function KoreanUserCardStack({ users, onPress }: KoreanUserCardStackProps) {
  const [topIdx, setTopIdx] = useState(0);
  const isSwiping = useRef(false);
  const exitX    = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  const midX   = progress.interpolate({ inputRange: [0, 1], outputRange: [SLOT_OFFSET[1], SLOT_OFFSET[0]] });
  const midOp  = progress.interpolate({ inputRange: [0, 1], outputRange: [SLOT_OPACITY[1], SLOT_OPACITY[0]] });
  const backX  = progress.interpolate({ inputRange: [0, 1], outputRange: [SLOT_OFFSET[2], SLOT_OFFSET[1]] });
  const backOp = progress.interpolate({ inputRange: [0, 1], outputRange: [SLOT_OPACITY[2], SLOT_OPACITY[1]] });

  const rotate = exitX.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  const n = users.length;
  const card0 = n > 0 ? users[topIdx % n] : null;
  const card1 = n > 0 ? users[(topIdx + 1) % n] : null;
  const card2 = n > 0 ? users[(topIdx + 2) % n] : null;

  const card0Ref  = useRef(card0);
  const onPressRef = useRef(onPress);
  card0Ref.current  = card0;
  onPressRef.current = onPress;

  const flyOut = (toX: number, cb?: () => void) => {
    Animated.parallel([
      Animated.timing(exitX,    { toValue: toX, duration: 220, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1,   duration: 220, useNativeDriver: false }),
    ]).start(() => {
      setTopIdx(prev => prev + 1);
      exitX.setValue(0);
      progress.setValue(0);
      isSwiping.current = false;
      cb?.();
    });
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !isSwiping.current,
    onMoveShouldSetPanResponder: (_, { dx, dy }) =>
      !isSwiping.current && Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 8,
    onPanResponderMove: (_, { dx }) => {
      if (isSwiping.current) return;
      exitX.setValue(dx);
      progress.setValue(Math.min(Math.abs(dx) / SCREEN_WIDTH, 1));
    },
    onPanResponderRelease: (_, { dx, vx }) => {
      if (isSwiping.current) return;
      const swipedRight = dx > SWIPE_THRESHOLD || vx > 0.8;
      const swipedLeft  = dx < -SWIPE_THRESHOLD || vx < -0.8;

      if (swipedRight) {
        // 오른쪽 스와이프 = O (채팅)
        isSwiping.current = true;
        const card = card0Ref.current;
        if (card) onPressRef.current?.(card);
        flyOut(SCREEN_WIDTH + 200);
      } else if (swipedLeft) {
        // 왼쪽 스와이프 = X (건너뛰기)
        isSwiping.current = true;
        flyOut(-(SCREEN_WIDTH + 200));
      } else {
        Animated.parallel([
          Animated.spring(exitX,    { toValue: 0, useNativeDriver: true, tension: 40, friction: 7 }),
          Animated.spring(progress, { toValue: 0, useNativeDriver: false, tension: 40, friction: 7 }),
        ]).start();
      }
    },
  })).current;

  if (n === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.stack}>
        {n >= 3 && (
          <Animated.View style={[styles.cardSlot, { zIndex: 1, transform: [{ translateX: backX }], opacity: backOp }]}>
            <CardContent user={card2!} />
          </Animated.View>
        )}

        {n >= 2 && (
          <Animated.View style={[styles.cardSlot, { zIndex: 2, transform: [{ translateX: midX }], opacity: midOp }]}>
            <CardContent user={card1!} />
          </Animated.View>
        )}

        <Animated.View
          style={[styles.cardSlot, { zIndex: 3, transform: [{ translateX: exitX }, { rotate }] }]}
          {...panResponder.panHandlers}
        >
          <CardContent user={card0!} />
          <View style={styles.hintRow} pointerEvents="none">
            <View style={styles.hintBadgeRed}>
              <Ionicons name="arrow-back" size={14} color="#EF4444" />
              <Ionicons name="close" size={20} color="#EF4444" />
            </View>
            <View style={styles.hintBadgeGreen}>
              <Ionicons name="chatbubble-outline" size={18} color="#22C55E" />
              <Ionicons name="arrow-forward" size={14} color="#22C55E" />
            </View>
          </View>
        </Animated.View>
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
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: CARD_BG,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  /* 프로필 영역 */
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
    borderColor: '#BAE6FD',
  },
  avatarText: { fontSize: 31, fontWeight: '900', color: ACCENT },
  avatarImage: { width: '100%', height: '100%', borderRadius: 39 },
  profileInfo: { flex: 1, gap: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 19, fontWeight: '800', color: '#0C1C3C', letterSpacing: -0.3 },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelText: { fontSize: 11, fontWeight: '700' },
  subText: { fontSize: 14, color: '#667799', fontWeight: '600', marginTop: -2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 0 },
  ratingText: { fontSize: 13, color: '#7799BB', fontWeight: '600' },
  dotSep: { fontSize: 13, color: '#AABBCC' },
  helpCountText: { fontSize: 13, color: '#7799BB', fontWeight: '600' },
  /* 구분선 */
  divider: {
    height: 1,
    backgroundColor: '#D4E4FF',
    marginBottom: 16,
  },
  /* 소개글 영역 */
  infoLayer: {
    flex: 1,
  },
  requestLabel: { fontSize: 13, fontWeight: '700', color: ACCENT, letterSpacing: 0.5, marginBottom: 8 },
  requestText: { fontSize: 17, fontWeight: '600', color: '#0C1C3C', lineHeight: 26 },
  detailPlaceholder: { fontSize: 15, color: '#AABBCC', fontStyle: 'italic' },
  /* 스와이프 힌트 */
  hintRow: {
    position: 'absolute',
    bottom: 16, left: 16, right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hintBadgeRed: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FEE2E2', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1.5, borderColor: '#EF4444',
  },
  hintBadgeGreen: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#DCFCE7', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1.5, borderColor: '#22C55E',
  },
});

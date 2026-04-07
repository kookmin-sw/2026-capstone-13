import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  TouchableOpacity,
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
            <View style={[styles.levelBadge, { backgroundColor: lv.color + '18', borderColor: lv.color + '40' }]}>
              <Text style={[styles.levelText, { color: lv.color }]}>{lv.label}</Text>
            </View>
          </View>
          {user.university ? (
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

export default function KoreanUserCardStack({ users, onPress }: KoreanUserCardStackProps) {
  const [topIdx, setTopIdx] = useState(0);
  const isSwiping = useRef(false);
  const exitX = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  const midX  = progress.interpolate({ inputRange: [0, 1], outputRange: [SLOT_OFFSET[1], SLOT_OFFSET[0]] });
  const midOp = progress.interpolate({ inputRange: [0, 1], outputRange: [SLOT_OPACITY[1], SLOT_OPACITY[0]] });
  const backX  = progress.interpolate({ inputRange: [0, 1], outputRange: [SLOT_OFFSET[2], SLOT_OFFSET[1]] });
  const backOp = progress.interpolate({ inputRange: [0, 1], outputRange: [SLOT_OPACITY[2], SLOT_OPACITY[1]] });

  const n = users.length;
  const card0 = n > 0 ? users[topIdx % n] : null;
  const card1 = n > 0 ? users[(topIdx + 1) % n] : null;
  const card2 = n > 0 ? users[(topIdx + 2) % n] : null;

  const triggerSwipe = useCallback((dir: 'left' | 'right') => {
    if (isSwiping.current || !card0) return;
    isSwiping.current = true;

    const toX = dir === 'right' ? SCREEN_WIDTH + 200 : -(SCREEN_WIDTH + 200);

    Animated.parallel([
      Animated.timing(exitX,    { toValue: toX, duration: 280, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1,   duration: 280, useNativeDriver: false }),
    ]).start(() => {
      setTopIdx(prev => prev + 1);
      exitX.setValue(0);
      progress.setValue(0);
      isSwiping.current = false;
    });
  }, [card0, exitX, progress]);

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

        <Animated.View style={[styles.cardSlot, { zIndex: 3, transform: [{ translateX: exitX }] }]}>
          <CardContent user={card0!} />
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.skipBtn]} onPress={() => triggerSwipe('left')} activeOpacity={0.8}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => { onPress?.(card0!); triggerSwipe('right'); }} activeOpacity={0.8}>
              <Ionicons name="chatbubble-outline" size={22} color="#fff" />
            </TouchableOpacity>
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
    gap: 16,
    marginBottom: 18,
  },
  avatarWrap: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#BAE6FD',
  },
  avatarText: { fontSize: 52, fontWeight: '900', color: ACCENT },
  avatarImage: { width: '100%', height: '100%', borderRadius: 65 },
  profileInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 21, fontWeight: '800', color: '#0C1C3C', letterSpacing: -0.3 },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelText: { fontSize: 11, fontWeight: '700' },
  subText: { fontSize: 14, color: '#667799', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
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
  /* 버튼 */
  btnRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    zIndex: 10,
  },
  btn: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn:   { backgroundColor: '#CBD5E1' },
  acceptBtn: { backgroundColor: '#0EA5E9' },
});

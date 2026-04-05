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
const CARD_BG = '#5592E0';

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
      <View style={styles.cardBg}>
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
      </View>

      {/* 레벨 뱃지 */}
      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>{lv.label}</Text>
      </View>

      {/* 별점 */}
      <View style={styles.ratingPill}>
        <Ionicons name="star" size={11} color="#FBBF24" />
        <Text style={styles.ratingText}>{user.rating.toFixed(1)}</Text>
      </View>

      <View style={styles.infoLayer}>
        <Text style={styles.cardName}>{user.nickname}</Text>
        {user.university ? (
          <Text style={styles.cardUniv} numberOfLines={1}>{user.university}</Text>
        ) : null}

        <View style={styles.detailBox}>
          {user.bio ? (
            <Text style={styles.detailText} numberOfLines={3}>{user.bio}</Text>
          ) : (
            <Text style={styles.detailPlaceholder}>소개글이 없어요</Text>
          )}
        </View>

        {user.helpCount > 0 && (
          <View style={styles.helpCountRow}>
            <Ionicons name="heart" size={12} color="rgba(255,255,255,0.85)" />
            <Text style={styles.helpCountText}>도움 {user.helpCount}회</Text>
          </View>
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
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 36,
    left: CARD_WIDTH / 2 - 80,
  },
  avatarText: { fontSize: 64, fontWeight: '900', color: 'rgba(255,255,255,0.95)' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 80 },
  levelBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 5,
  },
  levelText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  ratingPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  ratingText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  infoLayer: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingBottom: 16,
    paddingTop: 12,
  },
  cardName: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 2 },
  cardUniv: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 10 },
  detailBox: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 14,
    padding: 14,
    minHeight: 72,
    marginBottom: 10,
  },
  detailText: { fontSize: 14, fontWeight: '600', color: '#fff', lineHeight: 20 },
  detailPlaceholder: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' },
  helpCountRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  helpCountText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  btnRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    zIndex: 10,
  },
  btn: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: { backgroundColor: '#5592E0' },
  skipBtn:   { backgroundColor: '#5592E0' },
});

import React, { useRef, useState, useEffect, useCallback } from 'react';
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
import { CategoryLabels, MethodLabels } from '../constants/colors';
import type { HelpRequest } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 90;
const CARD_HEIGHT = 390;
const CARD_BG = '#FFFFFF';
const ACCENT  = '#0EA5E9';

// 카드 위치: 0=앞, 1=중간, 2=뒤
const SLOT_OFFSET = [0, 16, 32];
const SLOT_OPACITY = [1, 0.8, 0.6];
const SLOT_SCALE = [1, 0.97, 0.94];

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
function CardContent({ card }: { card: HelpRequest }) {
  const [imgError, setImgError] = useState(false);
  const profileUri = card.requester.profileImage?.trim();
  const urgency = getUrgency(card.createdAt);
  const initial = card.requester.nickname.charAt(0);
  const showImage = !!profileUri && !imgError;

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
            <Text style={styles.cardName}>{card.requester.nickname}</Text>
            {(card.requester.studentIdVerified || card.requester.studentIdStatus === 'APPROVED') && (
              <Ionicons name="shield-checkmark" size={16} color="#22c55e" style={{ marginLeft: -4 }} />
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

      {/* 구분선 */}
      <View style={styles.divider} />

      {/* 하단: 도움 요청 내용 */}
      <View style={styles.infoLayer}>
        <Text style={styles.requestLabel}>도움 요청</Text>
        <Text style={styles.requestText} numberOfLines={4}>{card.title}</Text>
      </View>
    </View>
  );
}

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
  const isSwiping = useRef(false);

  const exitX    = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  const midX   = progress.interpolate({ inputRange: [0,1], outputRange: [SLOT_OFFSET[1], SLOT_OFFSET[0]] });
  const midOp  = progress.interpolate({ inputRange: [0,1], outputRange: [SLOT_OPACITY[1], SLOT_OPACITY[0]] });
  const backX  = progress.interpolate({ inputRange: [0,1], outputRange: [SLOT_OFFSET[2], SLOT_OFFSET[1]] });
  const backOp = progress.interpolate({ inputRange: [0,1], outputRange: [SLOT_OPACITY[2], SLOT_OPACITY[1]] });

  // 드래그 시 카드 회전
  const rotate = exitX.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  const n = requests.length;
  const card0 = n > 0 ? requests[topIdx % n] : null;
  const card1 = n > 0 ? requests[(topIdx + 1) % n] : null;
  const card2 = n > 0 ? requests[(topIdx + 2) % n] : null;

  // stale closure 방지용 ref
  const card0Ref = useRef(card0);
  card0Ref.current = card0;
  const onSwipeLeftRef  = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeLeftRef.current  = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;

  const flyOut = useCallback((toX: number, onDone: () => void) => {
    Animated.parallel([
      Animated.timing(exitX,    { toValue: toX, duration: 220, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1,   duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setTopIdx(prev => prev + 1);
      exitX.setValue(0);
      progress.setValue(0);
      isSwiping.current = false;
      onDone();
    });
  }, [exitX, progress]);

  // 버튼용 (오른쪽=X, 왼쪽=O 유지)
  const triggerSwipe = useCallback((dir: 'left' | 'right') => {
    if (isSwiping.current || !card0) return;
    isSwiping.current = true;
    const toX = dir === 'right' ? SCREEN_WIDTH + 200 : -(SCREEN_WIDTH + 200);
    // 버튼: 오른쪽(X)=onSwipeLeft, 왼쪽(O)=onSwipeRight
    if (dir === 'right') onSwipeLeft?.(card0);
    else onSwipeRight?.(card0);
    flyOut(toX, () => {});
  }, [card0, onSwipeLeft, onSwipeRight, flyOut]);

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
        // 오른쪽 스와이프 = O
        isSwiping.current = true;
        const card = card0Ref.current;
        if (card) onSwipeRightRef.current?.(card);
        Animated.parallel([
          Animated.timing(exitX,    { toValue: SCREEN_WIDTH + 200, duration: 220, useNativeDriver: true }),
          Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start(() => {
          setTopIdx(prev => prev + 1);
          exitX.setValue(0);
          progress.setValue(0);
          isSwiping.current = false;
        });
      } else if (swipedLeft) {
        // 왼쪽 스와이프 = X
        isSwiping.current = true;
        const card = card0Ref.current;
        if (card) onSwipeLeftRef.current?.(card);
        Animated.parallel([
          Animated.timing(exitX,    { toValue: -(SCREEN_WIDTH + 200), duration: 220, useNativeDriver: true }),
          Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start(() => {
          setTopIdx(prev => prev + 1);
          exitX.setValue(0);
          progress.setValue(0);
          isSwiping.current = false;
        });
      } else {
        // 임계값 미달 → 원위치
        Animated.parallel([
          Animated.spring(exitX,    { toValue: 0, useNativeDriver: true, tension: 40, friction: 7 }),
          Animated.spring(progress, { toValue: 0, useNativeDriver: true, tension: 40, friction: 7 }),
        ]).start();
      }
    },
  })).current;

  if (n === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.stack}>
        {/* 뒤 (2번째) 카드 */}
        <Animated.View style={[styles.cardSlot, { zIndex: 1, transform: [{ translateX: backX }], opacity: backOp }]}>
          <CardContent card={card2} />
        </Animated.View>

        {/* 중간 (1번째) 카드 */}
        <Animated.View style={[styles.cardSlot, { zIndex: 2, transform: [{ translateX: midX }], opacity: midOp }]}>
          <CardContent card={card1} />
        </Animated.View>

        {/* 앞 (0번째) 카드 */}
        <Animated.View
          style={[styles.cardSlot, { zIndex: 3, transform: [{ translateX: exitX }, { rotate }] }]}
          {...panResponder.panHandlers}
        >
          <CardContent card={card0} />
          {/* 스와이프 방향 힌트 */}
          <View style={styles.hintRow} pointerEvents="none">
            <View style={styles.hintBadgeRed}>
              <Ionicons name="arrow-back" size={14} color="#EF4444" />
              <Ionicons name="close" size={20} color="#EF4444" />
            </View>
            <View style={styles.hintBadgeGreen}>
              <Ionicons name="checkmark" size={20} color="#22C55E" />
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
    borderColor: '#D0D0D0',
  },
  avatarText: { fontSize: 31, fontWeight: '900', color: ACCENT },
  avatarImage: { width: '100%', height: '100%', borderRadius: 39 },
  profileInfo: { flex: 1, gap: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 19, fontWeight: '800', color: '#0C1C3C', letterSpacing: -0.3 },
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
  /* 구분선 */
  divider: {
    height: 1,
    backgroundColor: '#D4E4FF',
    marginBottom: 16,
  },
  /* 도움 요청 내용 */
  infoLayer: {
    flex: 1,
  },
  requestLabel: { fontSize: 13, fontWeight: '700', color: ACCENT, letterSpacing: 0.5, marginBottom: 8 },
  requestText:  { fontSize: 17, fontWeight: '600', color: '#0C1C3C', lineHeight: 26 },
  /* 스와이프 힌트 */
  hintRow: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hintBadgeRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  hintBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: '#22C55E',
  },
});

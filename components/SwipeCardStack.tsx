import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { CategoryLabels, MethodLabels } from '../constants/colors';
import type { HelpRequest } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_HEIGHT = 390;
const SWIPE_THRESHOLD = 90;

const CARD_BG = '#5592E0';

const LANG_FLAG: Record<string, string> = {
  'en':      '🇺🇸',
  'zh-Hans': '🇨🇳',
  'zh-Hant': '🇹🇼',
  'ja':      '🇯🇵',
  'vi':      '🇻🇳',
  'mn':      '🇲🇳',
  'fr':      '🇫🇷',
  'de':      '🇩🇪',
  'es':      '🇪🇸',
  'ru':      '🇷🇺',
};

function getUrgency(createdAt: string): { label: string; color: string } {
  const ms = Date.now() - new Date(createdAt.includes('Z') ? createdAt : createdAt + 'Z').getTime();
  if (ms > 2 * 60 * 60 * 1000) return { label: '긴급', color: '#FFAAAA' };
  if (ms < 30 * 60 * 1000)     return { label: '신규', color: '#C8E0FF' };
  return                               { label: '진행', color: '#C8E0FF' };
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

// ── 카드 슬롯 (imperative 업데이트) ──────────────────────
interface CardHandle {
  setCard: (card: HelpRequest) => void;
}

const CardSlot = forwardRef<CardHandle, { initialCard: HelpRequest }>(({ initialCard }, ref) => {
  const [card, setCardState] = useState(initialCard);
  const [imgError, setImgError] = useState(false);

  const profileUri = card.requester.profileImage?.trim();

  const setCard = useCallback((next: HelpRequest) => {
    setImgError(false);
    setCardState(next);
  }, []);
  useImperativeHandle(ref, () => ({ setCard }));

  const urgency = getUrgency(card.createdAt);
  const initial = card.requester.nickname.charAt(0);
  const tags = [
    CategoryLabels[card.category],
    MethodLabels[card.helpMethod],
  ];

  const showImage = !!profileUri && !imgError;

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
      <View style={styles.urgencyBadge}>
        <View style={[styles.urgencyDot, { backgroundColor: urgency.color }]} />
        <Text style={[styles.urgencyText, { color: urgency.color }]}>{urgency.label}</Text>
      </View>
      <View style={styles.timePill}>
        <Text style={styles.timeText}>{formatTime(card.createdAt)}</Text>
      </View>
      <View style={styles.infoLayer}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName}>{card.requester.nickname}</Text>
          {card.requester.preferredLanguage && LANG_FLAG[card.requester.preferredLanguage] && (
            <Text style={styles.flagText}>{LANG_FLAG[card.requester.preferredLanguage]}</Text>
          )}
        </View>
        <View style={styles.requestBox}>
          <Text style={styles.requestLabel}>도움 요청</Text>
          <Text style={styles.requestText} numberOfLines={4}>{card.title}</Text>
        </View>
      </View>
    </View>
  );
});

// ── 메인 컴포넌트 ─────────────────────────────────────────
interface SwipeCardProps {
  requests: HelpRequest[];
  onSwipeLeft?: (card: HelpRequest) => void;
  onSwipeRight?: (card: HelpRequest) => void;
  onSwipeActive?: (active: boolean) => void;
}

export default function SwipeCardStack({ requests, onSwipeLeft, onSwipeRight, onSwipeActive }: SwipeCardProps) {
  const topIndex = useRef(0);
  const requestsRef = useRef(requests);
  useEffect(() => { requestsRef.current = requests; }, [requests]);

  const slotA = useRef<CardHandle>(null);
  const slotB = useRef<CardHandle>(null);
  const slotC = useRef<CardHandle>(null);

  const slotRoles = useRef<{ front: 'a'|'b'|'c', mid: 'a'|'b'|'c', back: 'a'|'b'|'c' }>({
    front: 'c', mid: 'b', back: 'a',
  });

  const animA = { x: useRef(new Animated.Value(16)).current, opacity: useRef(new Animated.Value(0.75)).current };
  const animB = { x: useRef(new Animated.Value(16)).current, opacity: useRef(new Animated.Value(0.75)).current };
  const animC = { x: useRef(new Animated.Value(0)).current,  opacity: useRef(new Animated.Value(1)).current   };

  const [zIndexes, setZIndexes] = useState<Record<'a'|'b'|'c', number>>({ a: 0, b: 1, c: 2 });

  const midProgress = useRef(new Animated.Value(0)).current;
  const midTranslateX = midProgress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const midOpacity    = midProgress.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });

  const getAnim   = (k: 'a'|'b'|'c') => ({ a: animA, b: animB, c: animC }[k]);
  const getHandle = (k: 'a'|'b'|'c') => ({ a: slotA, b: slotB, c: slotC }[k]);
  const getCard   = (offset: number): HelpRequest | undefined => {
    const reqs = requestsRef.current;
    if (reqs.length === 0) return undefined;
    return reqs[(topIndex.current + offset) % reqs.length];
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderGrant: () => { onSwipeActive?.(true); },
      onPanResponderMove: (_, g) => {
        getAnim(slotRoles.current.front).x.setValue(g.dx);
        midProgress.setValue(Math.min(Math.abs(g.dx) / SWIPE_THRESHOLD, 1));
      },
      onPanResponderRelease: (_, g) => {
        onSwipeActive?.(false);
        if (g.dx > SWIPE_THRESHOLD)       triggerSwipe('right');
        else if (g.dx < -SWIPE_THRESHOLD) triggerSwipe('left');
        else                              resetPosition();
      },
      onPanResponderTerminate: () => {
        onSwipeActive?.(false);
        resetPosition();
      },
    })
  ).current;

  const triggerSwipe = (dir: 'left' | 'right') => {
    if (requestsRef.current.length === 0) return;
    const exitX = dir === 'right' ? SCREEN_WIDTH + 100 : -(SCREEN_WIDTH + 100);
    const { front, mid, back } = slotRoles.current;
    const frontAnim = getAnim(front);
    const midAnim   = getAnim(mid);

    dir === 'right'
      ? onSwipeRight?.(getCard(0))
      : onSwipeLeft?.(getCard(0));

    Animated.parallel([
      Animated.timing(frontAnim.x, { toValue: exitX, duration: 260, useNativeDriver: true }),
      Animated.timing(midProgress, { toValue: 1, duration: 260, useNativeDriver: false }),
    ]).start(() => {
      topIndex.current += 1;

      // 날아간 슬롯 → 화면 밖에 있는 동안 뒤 위치로 조용히 리셋 후 카드 내용 주입
      frontAnim.x.setValue(16);
      frontAnim.opacity.setValue(0.75);
      getHandle(front).current?.setCard(getCard(2));

      // 역할 rotate
      slotRoles.current = { front: mid, mid: back, back: front };

      // zIndex 변경 전 한 프레임 대기해서 setValue 반영 후 적용 (튀는 현상 방지)
      requestAnimationFrame(() => {
        setZIndexes({ [front]: 0, [mid]: 2, [back]: 1 } as Record<'a'|'b'|'c', number>);
        midProgress.setValue(0);
      });
    });
  };

  const resetPosition = () => {
    const { front } = slotRoles.current;
    Animated.parallel([
      Animated.spring(getAnim(front).x, { toValue: 0, friction: 6, useNativeDriver: true }),
      Animated.spring(midProgress,       { toValue: 0, friction: 6, useNativeDriver: false }),
    ]).start();
  };

  if (requests.length === 0) return null;

  const renderSlot = (key: 'a'|'b'|'c', initialCard: HelpRequest | undefined, ref: React.RefObject<CardHandle>) => {
    if (!initialCard) return null;
    const anim   = getAnim(key);
    const zIndex = zIndexes[key];
    const { front, mid } = slotRoles.current;

    if (key === front) {
      return (
        <Animated.View
          key={key}
          style={[styles.cardShadow, styles.cardFront, { zIndex, transform: [{ translateX: anim.x }] }]}
          {...panResponder.panHandlers}
        >
          <CardSlot ref={ref} initialCard={initialCard} />
        </Animated.View>
      );
    }
    if (key === mid) {
      return (
        <Animated.View
          key={key}
          style={[styles.cardShadow, styles.cardBack, { zIndex, transform: [{ translateX: midTranslateX }], opacity: midOpacity }]}
        >
          <CardSlot ref={ref} initialCard={initialCard} />
        </Animated.View>
      );
    }
    return (
      <Animated.View
        key={key}
        style={[styles.cardShadow, styles.cardBack, { zIndex, transform: [{ translateX: anim.x }], opacity: anim.opacity }]}
      >
        <CardSlot ref={ref} initialCard={initialCard} />
      </Animated.View>
    );
  };

  return (
    <View style={styles.stack}>
      {renderSlot('a', getCard(2), slotA)}
      {renderSlot('b', getCard(1), slotB)}
      {renderSlot('c', getCard(0), slotC)}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: CARD_WIDTH + 16,
    height: CARD_HEIGHT,
    position: 'relative',
    shadowColor: '#3B6FE8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  cardShadow: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 14,
  },
  cardBack:  { top: 0, right: 0 },
  cardFront: { top: 0, left: 0 },
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
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: CARD_HEIGHT * 0.5 - 200 * 0.62 - 60,
    left: CARD_WIDTH / 2 - 100,
  },
  avatarText: { fontSize: 80, fontWeight: '900', color: 'rgba(255,255,255,0.95)' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 100 },
  urgencyBadge: {
    position: 'absolute',
    top: 16, left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 5,
    gap: 5,
  },
  urgencyDot:  { width: 7, height: 7, borderRadius: 4 },
  urgencyText: { fontSize: 11, fontWeight: '800' },
  timePill: {
    position: 'absolute',
    top: 16, right: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  timeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  infoLayer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 22,
    paddingBottom: 24,
    paddingTop: 16,
  },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardName: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  flagText: { fontSize: 24 },
  requestBox: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 14,
    padding: 16,
    minHeight: 110,
  },
  requestLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8, marginBottom: 6 },
  requestText:  { fontSize: 15, fontWeight: '700', color: '#fff', lineHeight: 22 },
});

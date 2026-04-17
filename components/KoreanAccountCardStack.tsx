import React, { useState, useRef, memo, useCallback } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { HelpRequest } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH  = SCREEN_WIDTH - 90;
const CARD_HEIGHT = Math.round(SCREEN_HEIGHT * 0.53);
const ACCENT = '#3B6FE8';

// 슬롯별 scale / 오른쪽 peek offset (슬롯 0 = 앞, 1 = 중간, 2 = 뒤)
const SLOT_SCALE:  [number, number, number] = [1,    1,    1];
const SLOT_PEEK_X: [number, number, number] = [0,    18,   32];
const SLOT_PEEK_Y: [number, number, number] = [0,    0,    0];

const SWIPE_THRESHOLD = 80;

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
        left: 0, right: 0,
        top: `${top}%`,
        height: `${GRAD_H}%`,
        backgroundColor: `rgba(0,0,0,${alpha})`,
        ...(isLast ? { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 } : {}),
      }}
    />
  );
});

function formatTime(iso: string): string {
  const ms = Date.now() - new Date(iso.includes('Z') ? iso : iso + 'Z').getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// card.id → 말줄임 여부 캐시 (컴포넌트 외부에서 측정 결과 보존)
const truncatedCache = new Map<string | number, boolean>();

const CardContent = memo(
  function CardContent({ card, onSkip, onAccept }: { card: HelpRequest; onSkip?: () => void; onAccept?: () => void }) {
    const [imgError, setImgError] = useState(false);
    const [isTruncated, setIsTruncated] = useState(() => truncatedCache.get(card.id) ?? false);
    const profileUri = card.requester.profileImage?.trim();
    const showImage  = !!profileUri && !imgError;
    const initial    = getInitial(card.requester.nickname);
    const isVerified = card.requester.studentIdVerified || card.requester.studentIdStatus === 'APPROVED';

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
            <Text style={styles.cardName}>{card.requester.nickname}</Text>
            {isVerified && <Ionicons name="shield-checkmark" size={15} color="#22c55e" />}
          </View>

          {(card.requester.major || card.requester.university) && (
            <View style={styles.infoRow}>
              <Ionicons name="school-outline" size={17} color="rgba(255,255,255,0.95)" />
              <Text style={styles.infoText} numberOfLines={1}>
                {card.requester.userType !== 'KOREAN' ? card.requester.major : card.requester.university}
              </Text>
            </View>
          )}

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={17} color="rgba(255,255,255,0.95)" />
            <Text style={styles.timeSmall}>{formatTime(card.createdAt)}</Text>
          </View>

          <View style={styles.bubbleWrap}>
            <View style={styles.bubbleTail} />
            <View style={styles.bubble}>
              <Text
                style={styles.bubbleText}
                numberOfLines={3}
                onTextLayout={(e) => {
                  const result = e.nativeEvent.lines.length >= 3;
                  truncatedCache.set(card.id, result);
                  setIsTruncated(result);
                }}
              >
                {card.description}
                {isTruncated && <Text style={styles.bubbleMore}>  ...더보기</Text>}
              </Text>
            </View>
          </View>

        </View>

        {/* 좌상단 넘기기 버튼 */}
        <TouchableOpacity style={styles.arrowBtn} onPress={onSkip} activeOpacity={0.75}>
          <Ionicons name="arrow-back-outline" size={24} color="#fff" />
        </TouchableOpacity>

        {/* 카드 하단 버튼 */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.75}>
            <View style={styles.pillBtn}>
              <Text style={styles.btnLabel}>도와주기</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
  (prev, next) => prev.card.id === next.card.id,
);

// ── 메인 컴포넌트 ──────────────────────────────────────────
interface SwipeCardProps {
  requests: HelpRequest[];
  onCardPress?: (card: HelpRequest) => void;
  onAccept?: (card: HelpRequest) => void;
}

export default function KoreanAccountCardStack({ requests, onCardPress, onAccept }: SwipeCardProps) {
  const n = requests.length;

  const [order, setOrder] = useState<[number, number, number]>([0, 1, 2]);

  const translateX    = useSharedValue(0);
  const swipeProgress = useSharedValue(0);
  const isSwiping     = useSharedValue(false);

  const onCardPressRef = useRef(onCardPress);
  onCardPressRef.current = onCardPress;

  const advanceOrderFn = useCallback(() => {
    setOrder(([a, b, c]) => {
      const nextBack = (a + 3) % n;
      return [b, c, nextBack] as [number, number, number];
    });
    // state 업데이트가 커밋된 뒤 리셋해야 깜빡임이 없음
    requestAnimationFrame(() => {
      translateX.value    = 0;
      swipeProgress.value = 0;
      isSwiping.value     = false;
    });
  }, [n, translateX, swipeProgress, isSwiping]);

  const advanceOrderRef = useRef(advanceOrderFn);
  advanceOrderRef.current = advanceOrderFn;
  const stableAdvance = useCallback(() => advanceOrderRef.current(), []);

  const onAcceptRef = useRef(onAccept);
  onAcceptRef.current = onAccept;

  const handleSkip = useCallback(() => {
    if (isSwiping.value) return;
    isSwiping.value     = true;
    swipeProgress.value = withTiming(1, { duration: 200 });
    translateX.value    = withTiming(-(SCREEN_WIDTH + 200), { duration: 350 }, () => {
      runOnJS(stableAdvance)();
    });
  }, [isSwiping, swipeProgress, translateX, stableAdvance]);

  const handleAccept = useCallback(() => {
    if (isSwiping.value) return;
    const currentCard = requests[order[0] % requests.length];
    onAcceptRef.current?.(currentCard);
    isSwiping.value     = true;
    swipeProgress.value = withTiming(1, { duration: 200 });
    translateX.value    = withTiming(-(SCREEN_WIDTH + 200), { duration: 350 }, () => {
      runOnJS(stableAdvance)();
    });
  }, [isSwiping, swipeProgress, translateX, stableAdvance, requests, order]);


  // slot 0 (앞)
  const slot0Style = useAnimatedStyle(() => {
    // 화면 밖으로 나간 상태면 회전 없이 숨겨진 채로 유지
    const isOffscreen = translateX.value < -(SCREEN_WIDTH * 0.9);
    return {
      zIndex: 3,
      opacity: isOffscreen ? 0 : 1,
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
    };
  });

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

  const card0 = requests[order[0] % n];
  const card1 = n > 1 ? requests[order[1] % n] : requests[0];
  const card2 = n > 2 ? requests[order[2] % n] : requests[0];

  return (
    <View style={styles.wrapper}>
      <View style={styles.stack}>
        <Animated.View style={[styles.cardSlot, slot2Style]}>
          <CardContent card={card2} />
        </Animated.View>
        <Animated.View style={[styles.cardSlot, slot1Style]}>
          <CardContent card={card1} />
        </Animated.View>
        <Animated.View style={[styles.cardSlot, slot0Style]}>
          <CardContent
            card={card0}
            onSkip={handleSkip}
            onAccept={handleAccept}
          />
        </Animated.View>
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
    flexDirection: 'column',
  },
  cardPhoto: {
    flex: 1,
  },
  bgImage: {
    borderRadius: s(32),
  },
  bgFallback: {
    backgroundColor: '#C7DCF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgInitial: {
    fontSize: s(80),
    fontWeight: '900',
    color: ACCENT,
    opacity: 0.25,
  },
  cardBottom: {
    position: 'absolute',
    left: 0, right: 0, bottom: 56,
    paddingHorizontal: s(18),
    paddingBottom: s(16),
    paddingTop: s(16),
    gap: s(6),
  },
  actionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    height: s(56),
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
    paddingVertical: s(12),
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    marginTop: s(2),
  },
  cardName: {
    fontSize: s(26),
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: s(5) },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  timeSmall: { fontSize: s(15), color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  infoText: {
    fontSize: s(15),
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: s(32),
    paddingHorizontal: s(7),
    paddingVertical: s(2),
    gap: s(3),
  },
  urgencyDot:  { width: s(5), height: s(5), borderRadius: s(3) },
  urgencyText: { fontSize: s(11), fontWeight: '700' },
  timeDot: {
    fontSize: s(15),
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
  },

  arrowBtn: {
    position: 'absolute',
    left: 14,
    top: 14,
    width: s(48),
    height: s(48),
    borderRadius: s(24),
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    flex: 1,
    height: s(48),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    backgroundColor: ACCENT,
    paddingHorizontal: s(44),
    paddingVertical: s(13),
    borderRadius: 999,
  },
  btnLabel: {
    fontSize: s(18),
    fontWeight: '700',
    color: '#fff',
  },
});

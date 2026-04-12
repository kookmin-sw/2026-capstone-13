import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import type { HelpRequest } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH  = SCREEN_WIDTH - 90;
const CARD_HEIGHT = Math.round(SCREEN_HEIGHT * 0.53);
const ACCENT = '#0EA5E9';

const SLOT_OFFSET  = [0, 16, 32];
const SLOT_OPACITY = [1, 0.85, 0.7];

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
const CardContent = memo(
  function CardContent({ card, onPress }: { card: HelpRequest; onPress?: () => void }) {
    const [imgError, setImgError] = useState(false);
    const profileUri = card.requester.profileImage?.trim();
    const showImage  = !!profileUri && !imgError;
    const initial    = card.requester.nickname.charAt(0);
    const urgency    = getUrgency(card.createdAt);
    const isVerified = card.requester.studentIdVerified || card.requester.studentIdStatus === 'APPROVED';

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

        {/* 그라데이션 */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.75)']}
          locations={[0, 0.4, 0.7, 1]}
          style={styles.gradientOverlay}
          pointerEvents="none"
        />

        {/* 콘텐츠 (배경색 없음) */}
        <View style={styles.cardBottom}>
          {/* 이름 */}
          <View style={styles.nameRow}>
            <Text style={styles.cardName}>{card.requester.nickname}</Text>
            {isVerified && (
              <Ionicons name="shield-checkmark" size={15} color="#22c55e" />
            )}
            <View style={[styles.urgencyBadge, { backgroundColor: urgency.color + '33' }]}>
              <View style={[styles.urgencyDot, { backgroundColor: urgency.color }]} />
              <Text style={[styles.urgencyText, { color: urgency.color }]}>{urgency.label}</Text>
            </View>
          </View>

          {/* 학과/대학 */}
          {(card.requester.major || card.requester.university) && (
            <View style={styles.infoRow}>
              <Ionicons name="school-outline" size={13} color="rgba(255,255,255,0.75)" />
              <Text style={styles.infoText} numberOfLines={1}>
                {card.requester.userType !== 'KOREAN' ? card.requester.major : card.requester.university}
              </Text>
            </View>
          )}

          {/* 시간 */}
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={styles.timeSmall}>{formatTime(card.createdAt)}</Text>
          </View>

          {/* 말풍선 */}
          <View style={styles.bubbleWrap}>
            <View style={styles.bubbleTail} />
            <View style={styles.bubble}>
              <Text style={styles.bubbleText} numberOfLines={2}>{card.title}</Text>
            </View>
          </View>

          {/* 상세보기 버튼 */}
          <TouchableOpacity style={styles.requestBtn} onPress={onPress} activeOpacity={0.85}>
            <Text style={styles.requestBtnText}>상세보기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
  (prev, next) => prev.card.id === next.card.id,
);

// ── 메인 컴포넌트 ─────────────────────────────────────────
interface SwipeCardProps {
  requests: HelpRequest[];
  onCardPress?: (card: HelpRequest) => void;
}

const SWIPE_THRESHOLD = 80;

export default function SwipeCardStack({ requests, onCardPress }: SwipeCardProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const translateX     = useSharedValue(0);
  const isSwiping      = useSharedValue(false);
  const backProgress   = useSharedValue(0);
  const topCardOpacity = useSharedValue(1);

  const n     = requests.length;
  const card0 = n > 0 ? requests[currentIdx % n] : null;
  const card1 = n > 0 ? requests[(currentIdx + 1) % n] : null;
  const card2 = n > 0 ? requests[(currentIdx + 2) % n] : null;

  const onCardPressRef = useRef(onCardPress);
  onCardPressRef.current = onCardPress;

  const card0Ref = useRef(card0);
  card0Ref.current = card0;

  const notifySwipe = useCallback((_dir: 'left' | 'right') => {
    setCurrentIdx(prev => prev + 1);
  }, []);

  const advanceCard = useCallback((dir: 'left' | 'right') => {
    notifySwipe(dir);
  }, [notifySwipe]);

  useEffect(() => {
    translateX.value     = 0;
    backProgress.value   = 0;
    isSwiping.value      = false;
    topCardOpacity.value = 1;
  }, [currentIdx, translateX, backProgress, isSwiping, topCardOpacity]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (isSwiping.value) return;
      translateX.value   = e.translationX > 0 ? Math.min(e.translationX, 40) : e.translationX;
      backProgress.value = Math.min(Math.abs(e.translationX) / SCREEN_WIDTH, 1);
    })
    .onEnd((e) => {
      if (isSwiping.value) return;
      const swipedLeft = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -800;
      if (swipedLeft) {
        isSwiping.value    = true;
        backProgress.value = 1;
        translateX.value   = withTiming(-(SCREEN_WIDTH + 200), { duration: 220 }, () => {
          runOnJS(advanceCard)('left');
        });
      } else {
        translateX.value   = withSpring(0, { damping: 15, stiffness: 150 });
        backProgress.value = withSpring(0, { damping: 15, stiffness: 150 });
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
        <Animated.View style={[styles.cardSlot, styles.backCard, backCardStyle]}>
          <CardContent card={card2!} />
        </Animated.View>
        <Animated.View style={[styles.cardSlot, styles.midCard, midCardStyle]}>
          <CardContent card={card1!} />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.cardSlot, styles.topCard, topCardStyle]}>
            <CardContent
              card={card0!}
              onPress={onCardPressRef.current ? () => onCardPressRef.current!(card0!) : undefined}
            />
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
    shadowRadius: 18,
    elevation: 8,
  },
  topCard:  { zIndex: 3, opacity: SLOT_OPACITY[0] },
  midCard:  { zIndex: 2, opacity: SLOT_OPACITY[1] },
  backCard: { zIndex: 1, opacity: SLOT_OPACITY[2] },

  card: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  bgImage: {
    borderRadius: 20,
  },
  bgFallback: {
    backgroundColor: '#C7DCF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  bgInitial: {
    fontSize: 80,
    fontWeight: '900',
    color: ACCENT,
    opacity: 0.25,
  },

  // 그라데이션 오버레이
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },

  // 콘텐츠 컨테이너 (배경색 없음)
  cardBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 20,
    paddingTop: 16,
    gap: 5,
  },

  // 말풍선
  bubbleWrap: {
    alignSelf: 'flex-start',
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255,255,255,0.95)',
    marginLeft: 16,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    borderTopLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: CARD_WIDTH - 48,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    lineHeight: 20,
  },

  // 이름 줄
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  cardName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 3,
  },
  urgencyDot:  { width: 5, height: 5, borderRadius: 3 },
  urgencyText: { fontSize: 11, fontWeight: '700' },
  timeDot: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
  },

  // 학과
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeSmall: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  // 상세보기
  requestBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  requestBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

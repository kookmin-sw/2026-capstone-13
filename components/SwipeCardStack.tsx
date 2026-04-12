import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
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

        {/* 페이크 그라데이션 레이어 (100단계) */}
        <View style={styles.gradient1} pointerEvents="none" />
        <View style={styles.gradient2} pointerEvents="none" />
        <View style={styles.gradient3} pointerEvents="none" />
        <View style={styles.gradient4} pointerEvents="none" />
        <View style={styles.gradient5} pointerEvents="none" />
        <View style={styles.gradient6} pointerEvents="none" />
        <View style={styles.gradient7} pointerEvents="none" />
        <View style={styles.gradient8} pointerEvents="none" />
        <View style={styles.gradient9} pointerEvents="none" />
        <View style={styles.gradient10} pointerEvents="none" />
        <View style={styles.gradient11} pointerEvents="none" />
        <View style={styles.gradient12} pointerEvents="none" />
        <View style={styles.gradient13} pointerEvents="none" />
        <View style={styles.gradient14} pointerEvents="none" />
        <View style={styles.gradient15} pointerEvents="none" />
        <View style={styles.gradient16} pointerEvents="none" />
        <View style={styles.gradient17} pointerEvents="none" />
        <View style={styles.gradient18} pointerEvents="none" />
        <View style={styles.gradient19} pointerEvents="none" />
        <View style={styles.gradient20} pointerEvents="none" />
        <View style={styles.gradient21} pointerEvents="none" />
        <View style={styles.gradient22} pointerEvents="none" />
        <View style={styles.gradient23} pointerEvents="none" />
        <View style={styles.gradient24} pointerEvents="none" />
        <View style={styles.gradient25} pointerEvents="none" />
        <View style={styles.gradient26} pointerEvents="none" />
        <View style={styles.gradient27} pointerEvents="none" />
        <View style={styles.gradient28} pointerEvents="none" />
        <View style={styles.gradient29} pointerEvents="none" />
        <View style={styles.gradient30} pointerEvents="none" />
        <View style={styles.gradient31} pointerEvents="none" />
        <View style={styles.gradient32} pointerEvents="none" />
        <View style={styles.gradient33} pointerEvents="none" />
        <View style={styles.gradient34} pointerEvents="none" />
        <View style={styles.gradient35} pointerEvents="none" />
        <View style={styles.gradient36} pointerEvents="none" />
        <View style={styles.gradient37} pointerEvents="none" />
        <View style={styles.gradient38} pointerEvents="none" />
        <View style={styles.gradient39} pointerEvents="none" />
        <View style={styles.gradient40} pointerEvents="none" />
        <View style={styles.gradient41} pointerEvents="none" />
        <View style={styles.gradient42} pointerEvents="none" />
        <View style={styles.gradient43} pointerEvents="none" />
        <View style={styles.gradient44} pointerEvents="none" />
        <View style={styles.gradient45} pointerEvents="none" />
        <View style={styles.gradient46} pointerEvents="none" />
        <View style={styles.gradient47} pointerEvents="none" />
        <View style={styles.gradient48} pointerEvents="none" />
        <View style={styles.gradient49} pointerEvents="none" />
        <View style={styles.gradient50} pointerEvents="none" />
        <View style={styles.gradient51} pointerEvents="none" />
        <View style={styles.gradient52} pointerEvents="none" />
        <View style={styles.gradient53} pointerEvents="none" />
        <View style={styles.gradient54} pointerEvents="none" />
        <View style={styles.gradient55} pointerEvents="none" />
        <View style={styles.gradient56} pointerEvents="none" />
        <View style={styles.gradient57} pointerEvents="none" />
        <View style={styles.gradient58} pointerEvents="none" />
        <View style={styles.gradient59} pointerEvents="none" />
        <View style={styles.gradient60} pointerEvents="none" />
        <View style={styles.gradient61} pointerEvents="none" />
        <View style={styles.gradient62} pointerEvents="none" />
        <View style={styles.gradient63} pointerEvents="none" />
        <View style={styles.gradient64} pointerEvents="none" />
        <View style={styles.gradient65} pointerEvents="none" />
        <View style={styles.gradient66} pointerEvents="none" />
        <View style={styles.gradient67} pointerEvents="none" />
        <View style={styles.gradient68} pointerEvents="none" />
        <View style={styles.gradient69} pointerEvents="none" />
        <View style={styles.gradient70} pointerEvents="none" />
        <View style={styles.gradient71} pointerEvents="none" />
        <View style={styles.gradient72} pointerEvents="none" />
        <View style={styles.gradient73} pointerEvents="none" />
        <View style={styles.gradient74} pointerEvents="none" />
        <View style={styles.gradient75} pointerEvents="none" />
        <View style={styles.gradient76} pointerEvents="none" />
        <View style={styles.gradient77} pointerEvents="none" />
        <View style={styles.gradient78} pointerEvents="none" />
        <View style={styles.gradient79} pointerEvents="none" />
        <View style={styles.gradient80} pointerEvents="none" />
        <View style={styles.gradient81} pointerEvents="none" />
        <View style={styles.gradient82} pointerEvents="none" />
        <View style={styles.gradient83} pointerEvents="none" />
        <View style={styles.gradient84} pointerEvents="none" />
        <View style={styles.gradient85} pointerEvents="none" />
        <View style={styles.gradient86} pointerEvents="none" />
        <View style={styles.gradient87} pointerEvents="none" />
        <View style={styles.gradient88} pointerEvents="none" />
        <View style={styles.gradient89} pointerEvents="none" />
        <View style={styles.gradient90} pointerEvents="none" />
        <View style={styles.gradient91} pointerEvents="none" />
        <View style={styles.gradient92} pointerEvents="none" />
        <View style={styles.gradient93} pointerEvents="none" />
        <View style={styles.gradient94} pointerEvents="none" />
        <View style={styles.gradient95} pointerEvents="none" />
        <View style={styles.gradient96} pointerEvents="none" />
        <View style={styles.gradient97} pointerEvents="none" />
        <View style={styles.gradient98} pointerEvents="none" />
        <View style={styles.gradient99} pointerEvents="none" />
        <View style={styles.gradient100} pointerEvents="none" />

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

  gradient1:   { position: 'absolute', left: 0, right: 0, top: '37.00%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0000)' },
  gradient2:   { position: 'absolute', left: 0, right: 0, top: '37.63%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0000)' },
  gradient3:   { position: 'absolute', left: 0, right: 0, top: '38.26%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0002)' },
  gradient4:   { position: 'absolute', left: 0, right: 0, top: '38.89%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0004)' },
  gradient5:   { position: 'absolute', left: 0, right: 0, top: '39.52%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0007)' },
  gradient6:   { position: 'absolute', left: 0, right: 0, top: '40.15%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0011)' },
  gradient7:   { position: 'absolute', left: 0, right: 0, top: '40.78%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0017)' },
  gradient8:   { position: 'absolute', left: 0, right: 0, top: '41.41%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0022)' },
  gradient9:   { position: 'absolute', left: 0, right: 0, top: '42.04%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0029)' },
  gradient10:  { position: 'absolute', left: 0, right: 0, top: '42.67%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0037)' },
  gradient11:  { position: 'absolute', left: 0, right: 0, top: '43.30%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0046)' },
  gradient12:  { position: 'absolute', left: 0, right: 0, top: '43.93%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0056)' },
  gradient13:  { position: 'absolute', left: 0, right: 0, top: '44.56%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0066)' },
  gradient14:  { position: 'absolute', left: 0, right: 0, top: '45.19%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0078)' },
  gradient15:  { position: 'absolute', left: 0, right: 0, top: '45.82%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0090)' },
  gradient16:  { position: 'absolute', left: 0, right: 0, top: '46.45%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0103)' },
  gradient17:  { position: 'absolute', left: 0, right: 0, top: '47.08%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0118)' },
  gradient18:  { position: 'absolute', left: 0, right: 0, top: '47.71%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0133)' },
  gradient19:  { position: 'absolute', left: 0, right: 0, top: '48.34%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0149)' },
  gradient20:  { position: 'absolute', left: 0, right: 0, top: '48.97%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0166)' },
  gradient21:  { position: 'absolute', left: 0, right: 0, top: '49.60%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0184)' },
  gradient22:  { position: 'absolute', left: 0, right: 0, top: '50.23%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0202)' },
  gradient23:  { position: 'absolute', left: 0, right: 0, top: '50.86%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0222)' },
  gradient24:  { position: 'absolute', left: 0, right: 0, top: '51.49%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0243)' },
  gradient25:  { position: 'absolute', left: 0, right: 0, top: '52.12%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0264)' },
  gradient26:  { position: 'absolute', left: 0, right: 0, top: '52.75%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0287)' },
  gradient27:  { position: 'absolute', left: 0, right: 0, top: '53.38%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0310)' },
  gradient28:  { position: 'absolute', left: 0, right: 0, top: '54.01%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0335)' },
  gradient29:  { position: 'absolute', left: 0, right: 0, top: '54.64%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0360)' },
  gradient30:  { position: 'absolute', left: 0, right: 0, top: '55.27%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0386)' },
  gradient31:  { position: 'absolute', left: 0, right: 0, top: '55.90%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0413)' },
  gradient32:  { position: 'absolute', left: 0, right: 0, top: '56.53%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0441)' },
  gradient33:  { position: 'absolute', left: 0, right: 0, top: '57.16%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0470)' },
  gradient34:  { position: 'absolute', left: 0, right: 0, top: '57.79%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0500)' },
  gradient35:  { position: 'absolute', left: 0, right: 0, top: '58.42%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0531)' },
  gradient36:  { position: 'absolute', left: 0, right: 0, top: '59.05%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0562)' },
  gradient37:  { position: 'absolute', left: 0, right: 0, top: '59.68%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0595)' },
  gradient38:  { position: 'absolute', left: 0, right: 0, top: '60.31%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0629)' },
  gradient39:  { position: 'absolute', left: 0, right: 0, top: '60.94%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0663)' },
  gradient40:  { position: 'absolute', left: 0, right: 0, top: '61.57%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0698)' },
  gradient41:  { position: 'absolute', left: 0, right: 0, top: '62.20%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0735)' },
  gradient42:  { position: 'absolute', left: 0, right: 0, top: '62.83%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0772)' },
  gradient43:  { position: 'absolute', left: 0, right: 0, top: '63.46%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0810)' },
  gradient44:  { position: 'absolute', left: 0, right: 0, top: '64.09%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0849)' },
  gradient45:  { position: 'absolute', left: 0, right: 0, top: '64.72%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0889)' },
  gradient46:  { position: 'absolute', left: 0, right: 0, top: '65.35%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0930)' },
  gradient47:  { position: 'absolute', left: 0, right: 0, top: '65.98%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.0972)' },
  gradient48:  { position: 'absolute', left: 0, right: 0, top: '66.61%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1014)' },
  gradient49:  { position: 'absolute', left: 0, right: 0, top: '67.24%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1058)' },
  gradient50:  { position: 'absolute', left: 0, right: 0, top: '67.87%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1102)' },
  gradient51:  { position: 'absolute', left: 0, right: 0, top: '68.50%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1148)' },
  gradient52:  { position: 'absolute', left: 0, right: 0, top: '69.13%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1194)' },
  gradient53:  { position: 'absolute', left: 0, right: 0, top: '69.76%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1242)' },
  gradient54:  { position: 'absolute', left: 0, right: 0, top: '70.39%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1290)' },
  gradient55:  { position: 'absolute', left: 0, right: 0, top: '71.02%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1339)' },
  gradient56:  { position: 'absolute', left: 0, right: 0, top: '71.65%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1389)' },
  gradient57:  { position: 'absolute', left: 0, right: 0, top: '72.28%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1440)' },
  gradient58:  { position: 'absolute', left: 0, right: 0, top: '72.91%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1492)' },
  gradient59:  { position: 'absolute', left: 0, right: 0, top: '73.54%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1545)' },
  gradient60:  { position: 'absolute', left: 0, right: 0, top: '74.17%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1598)' },
  gradient61:  { position: 'absolute', left: 0, right: 0, top: '74.80%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1653)' },
  gradient62:  { position: 'absolute', left: 0, right: 0, top: '75.43%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1708)' },
  gradient63:  { position: 'absolute', left: 0, right: 0, top: '76.06%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1765)' },
  gradient64:  { position: 'absolute', left: 0, right: 0, top: '76.69%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1822)' },
  gradient65:  { position: 'absolute', left: 0, right: 0, top: '77.32%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1881)' },
  gradient66:  { position: 'absolute', left: 0, right: 0, top: '77.95%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.1940)' },
  gradient67:  { position: 'absolute', left: 0, right: 0, top: '78.58%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2000)' },
  gradient68:  { position: 'absolute', left: 0, right: 0, top: '79.21%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2061)' },
  gradient69:  { position: 'absolute', left: 0, right: 0, top: '79.84%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2123)' },
  gradient70:  { position: 'absolute', left: 0, right: 0, top: '80.47%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2186)' },
  gradient71:  { position: 'absolute', left: 0, right: 0, top: '81.10%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2250)' },
  gradient72:  { position: 'absolute', left: 0, right: 0, top: '81.73%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2315)' },
  gradient73:  { position: 'absolute', left: 0, right: 0, top: '82.36%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2380)' },
  gradient74:  { position: 'absolute', left: 0, right: 0, top: '82.99%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2447)' },
  gradient75:  { position: 'absolute', left: 0, right: 0, top: '83.62%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2514)' },
  gradient76:  { position: 'absolute', left: 0, right: 0, top: '84.25%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2583)' },
  gradient77:  { position: 'absolute', left: 0, right: 0, top: '84.88%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2652)' },
  gradient78:  { position: 'absolute', left: 0, right: 0, top: '85.51%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2722)' },
  gradient79:  { position: 'absolute', left: 0, right: 0, top: '86.14%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2793)' },
  gradient80:  { position: 'absolute', left: 0, right: 0, top: '86.77%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2865)' },
  gradient81:  { position: 'absolute', left: 0, right: 0, top: '87.40%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.2938)' },
  gradient82:  { position: 'absolute', left: 0, right: 0, top: '88.03%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3012)' },
  gradient83:  { position: 'absolute', left: 0, right: 0, top: '88.66%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3087)' },
  gradient84:  { position: 'absolute', left: 0, right: 0, top: '89.29%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3163)' },
  gradient85:  { position: 'absolute', left: 0, right: 0, top: '89.92%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3240)' },
  gradient86:  { position: 'absolute', left: 0, right: 0, top: '90.55%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3317)' },
  gradient87:  { position: 'absolute', left: 0, right: 0, top: '91.18%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3396)' },
  gradient88:  { position: 'absolute', left: 0, right: 0, top: '91.81%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3475)' },
  gradient89:  { position: 'absolute', left: 0, right: 0, top: '92.44%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3556)' },
  gradient90:  { position: 'absolute', left: 0, right: 0, top: '93.07%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3637)' },
  gradient91:  { position: 'absolute', left: 0, right: 0, top: '93.70%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3719)' },
  gradient92:  { position: 'absolute', left: 0, right: 0, top: '94.33%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3802)' },
  gradient93:  { position: 'absolute', left: 0, right: 0, top: '94.96%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3886)' },
  gradient94:  { position: 'absolute', left: 0, right: 0, top: '95.59%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.3971)' },
  gradient95:  { position: 'absolute', left: 0, right: 0, top: '96.22%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.4057)' },
  gradient96:  { position: 'absolute', left: 0, right: 0, top: '96.85%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.4144)' },
  gradient97:  { position: 'absolute', left: 0, right: 0, top: '97.48%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.4231)' },
  gradient98:  { position: 'absolute', left: 0, right: 0, top: '98.11%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.4320)' },
  gradient99:  { position: 'absolute', left: 0, right: 0, top: '98.74%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.4410)' },
  gradient100: { position: 'absolute', left: 0, right: 0, top: '99.37%', height: '0.63%', backgroundColor: 'rgba(0,0,0,0.4500)', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },

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

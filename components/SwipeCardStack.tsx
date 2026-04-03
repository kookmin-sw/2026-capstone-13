import React, { useRef, useState, useEffect, useCallback } from 'react';
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
import { CategoryLabels, MethodLabels } from '../constants/colors';
import type { HelpRequest } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 90;
const CARD_HEIGHT = 390;
const CARD_BG = '#5592E0';

// 카드 위치: 0=앞, 1=중간, 2=뒤
const SLOT_OFFSET = [0, 16, 32];
const SLOT_OPACITY = [1, 0.8, 0.6];
const SLOT_SCALE = [1, 0.97, 0.94];

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

// ── 카드 한 장 ─────────────────────────────────────────────
function CardContent({ card }: { card: HelpRequest }) {
  const [imgError, setImgError] = useState(false);
  const profileUri = card.requester.profileImage?.trim();
  const urgency = getUrgency(card.createdAt);
  const initial = card.requester.nickname.charAt(0);
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
          <Text style={styles.requestText} numberOfLines={3}>{card.title}</Text>
        </View>
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

export default function SwipeCardStack({ requests, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  // 현재 맨 앞 카드의 인덱스
  const [topIdx, setTopIdx] = useState(0);
  const isSwiping = useRef(false);

  // 앞 카드 날아가는 애니메이션
  const exitX = useRef(new Animated.Value(0)).current;
  // 뒤 두 카드가 앞으로 당겨지는 진행도 (0→1)
  const progress = useRef(new Animated.Value(0)).current;

  // progress 에 따라 mid(1번)→front(0번), back(2번)→mid(1번) 위치로 이동
  const midX   = progress.interpolate({ inputRange: [0,1], outputRange: [SLOT_OFFSET[1], SLOT_OFFSET[0]] });
  const midOp  = progress.interpolate({ inputRange: [0,1], outputRange: [SLOT_OPACITY[1], SLOT_OPACITY[0]] });
  const backX  = progress.interpolate({ inputRange: [0,1], outputRange: [SLOT_OFFSET[2], SLOT_OFFSET[1]] });
  const backOp = progress.interpolate({ inputRange: [0,1], outputRange: [SLOT_OPACITY[2], SLOT_OPACITY[1]] });

  const n = requests.length;

  const card0 = n > 0 ? requests[topIdx % n] : null;
  const card1 = n > 0 ? requests[(topIdx + 1) % n] : null;
  const card2 = n > 0 ? requests[(topIdx + 2) % n] : null;

  const triggerSwipe = useCallback((dir: 'left' | 'right') => {
    if (isSwiping.current || !card0) return;
    isSwiping.current = true;

    const toX = dir === 'right' ? SCREEN_WIDTH + 200 : -(SCREEN_WIDTH + 200);

    dir === 'right' ? onSwipeRight?.(card0) : onSwipeLeft?.(card0);

    Animated.parallel([
      Animated.timing(exitX,    { toValue: toX, duration: 280, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1,   duration: 280, useNativeDriver: false }),
    ]).start(() => {
      setTopIdx(prev => prev + 1);
      exitX.setValue(0);
      progress.setValue(0);
      isSwiping.current = false;
    });
  }, [card0, onSwipeLeft, onSwipeRight, exitX, progress]);

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
        <Animated.View style={[styles.cardSlot, { zIndex: 3, transform: [{ translateX: exitX }] }]}>
          <CardContent card={card0} />
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.skipBtn]} onPress={() => triggerSwipe('left')} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => triggerSwipe('right')} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={24} color="#fff" />
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
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
    bottom: 56,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingBottom: 16,
    paddingTop: 12,
  },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardName: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  flagText: { fontSize: 22 },
  requestBox: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 14,
    padding: 14,
    minHeight: 80,
  },
  requestLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8, marginBottom: 6 },
  requestText:  { fontSize: 14, fontWeight: '700', color: '#fff', lineHeight: 20 },
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

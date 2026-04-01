import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 90;
const CARD_WIDTH = SCREEN_WIDTH - 32;

// ── 데이터 ────────────────────────────────────────────────
const CARDS = [
  {
    id: 1,
    color: '#FF6B6B',
    avatarLabel: '리',
    name: '리웨이',
    school: '베이징 출신 · 3학년',
    badge: '🚨 긴급',
    badgeColor: '#C45A10',
    badgeBg: '#FFF0E6',
    time: '15분 전',
    title: '외국인등록증 갱신 서류 도움',
    tags: [
      { label: '🏫 행정', bg: '#FFF0E6', color: '#C45A10' },
      { label: '📄 서류', bg: '#EEF4FF', color: '#3B6FE8' },
      { label: '🤝 대화', bg: '#EEF4FF', color: '#3B6FE8' },
    ],
  },
  {
    id: 2,
    color: '#3B6FE8',
    avatarLabel: '아',
    name: '아흐메드',
    school: '이집트 출신 · 2학년',
    badge: '✨ 신규',
    badgeColor: '#3B6FE8',
    badgeBg: '#EEF4FF',
    time: '1시간 전',
    title: '건강보험 가입 방법 알려주실 분',
    tags: [
      { label: '🏥 건강', bg: '#EDFAF4', color: '#0F9B72' },
      { label: '🌐 온라인', bg: '#EEF4FF', color: '#3B6FE8' },
      { label: '💬 채팅', bg: '#EEF4FF', color: '#3B6FE8' },
    ],
  },
  {
    id: 3,
    color: '#F97316',
    avatarLabel: '마',
    name: '마리아',
    school: '브라질 출신 · 1학년',
    badge: 'ℹ 정보',
    badgeColor: '#6B9DF0',
    badgeBg: '#EEF4FF',
    time: '2시간 전',
    title: '취업비자 서류 작성 도움',
    tags: [
      { label: '💼 취업', bg: '#EEF4FF', color: '#3B6FE8' },
      { label: '📄 서류', bg: '#FFF0E6', color: '#C45A10' },
      { label: '⚡ 빠른답변', bg: '#FFFBE6', color: '#B45309' },
    ],
  },
  {
    id: 4,
    color: '#8B5CF6',
    avatarLabel: '유',
    name: '유수포바',
    school: '카자흐 출신 · 4학년',
    badge: '🚨 긴급',
    badgeColor: '#C45A10',
    badgeBg: '#FFF0E6',
    time: '30분 전',
    title: '병원 동행 및 통역 도움 신청',
    tags: [
      { label: '🏥 건강', bg: '#EDFAF4', color: '#0F9B72' },
      { label: '🗣 통역', bg: '#F3F0FF', color: '#7C3AED' },
      { label: '🤝 대화', bg: '#EEF4FF', color: '#3B6FE8' },
    ],
  },
  {
    id: 5,
    color: '#10B981',
    avatarLabel: '이',
    name: '이반',
    school: '우크라이나 출신 · 3학년',
    badge: '✨ 신규',
    badgeColor: '#3B6FE8',
    badgeBg: '#EEF4FF',
    time: '3시간 전',
    title: '은행 계좌 개설 동행 신청',
    tags: [
      { label: '🏦 금융', bg: '#EEF4FF', color: '#3B6FE8' },
      { label: '🤝 대화', bg: '#EEF4FF', color: '#3B6FE8' },
      { label: '📄 서류', bg: '#FFF0E6', color: '#C45A10' },
    ],
  },
];

// ── 카드 컴포넌트 ───────────────────────────────────────────
interface CardData {
  id: number;
  color: string;
  avatarLabel: string;
  name: string;
  school: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  time: string;
  title: string;
  tags: { label: string; bg: string; color: string }[];
}

interface SwipeCardProps {
  onSwipeLeft?: (card: CardData) => void;
  onSwipeRight?: (card: CardData) => void;
}

export default function SwipeCardStack({ onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const [index, setIndex] = useState(0);

  const positionX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        positionX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeOut('left');
        } else if (gesture.dx > SWIPE_THRESHOLD) {
          swipeOut('right');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const swipeOut = (dir: 'left' | 'right') => {
    const toValue = dir === 'left' ? -SCREEN_WIDTH - 100 : SCREEN_WIDTH + 100;
    positionX.stopAnimation();
    Animated.timing(positionX, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      const card = CARDS[index % CARDS.length];
      if (dir === 'left') onSwipeLeft?.(card);
      else onSwipeRight?.(card);
      positionX.setValue(0);
      setIndex(prev => prev + 1);
    });
  };

  const resetPosition = () => {
    positionX.stopAnimation();
    Animated.timing(positionX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const card = CARDS[index % CARDS.length];
  const nextCard = CARDS[(index + 1) % CARDS.length];

  return (
    <View style={styles.stackContainer}>
      {/* 뒤 카드 */}
      <View style={[styles.card, styles.cardBehind1, { backgroundColor: nextCard.color + '55' }]} />

      {/* 메인 카드 */}
      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateX: positionX }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* 상단 컬러 프로필 영역 */}
        <View style={[styles.cardTop, { backgroundColor: card.color }]}>
          <View style={styles.colorOverlay} />

          {/* 배지 + 시간 */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
              <Text style={[styles.badgeText, { color: card.badgeColor }]}>{card.badge}</Text>
            </View>
            <View style={styles.timeBadge}>
              <Text style={styles.timeText}>⏱ {card.time}</Text>
            </View>
          </View>

          {/* 프로필 */}
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLabel}>{card.avatarLabel}</Text>
            </View>
            <View style={styles.nameBlock}>
              <Text style={styles.cardName}>{card.name}</Text>
              <Text style={styles.cardSchool}>{card.school}</Text>
            </View>
          </View>
        </View>

        {/* 하단 흰 영역 */}
        <View style={styles.cardBottom}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <View style={styles.tagsRow}>
            {card.tags.map((tag, i) => (
              <View key={i} style={[styles.tag, { backgroundColor: tag.bg }]}>
                <Text style={[styles.tagText, { color: tag.color }]}>{tag.label}</Text>
              </View>
            ))}
          </View>
        </View>

      </Animated.View>
    </View>
  );
}

// ── 스타일 ────────────────────────────────────────────────
const CARD_HEIGHT = 300;

const styles = StyleSheet.create({
  stackContainer: {
    height: CARD_HEIGHT + 24,
    marginHorizontal: 16,
    marginBottom: 8,
    position: 'relative',
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  cardBehind1: {
    transform: [{ translateX: 10 }, { translateY: 10 }],
  },
  cardTop: {
    height: 160,
    padding: 16,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  colorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  badgeRow: {
    position: 'absolute',
    top: 14,
    right: 14,
    gap: 6,
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  timeBadge: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  avatarLabel: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  nameBlock: {
    paddingBottom: 4,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 2,
  },
  cardSchool: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  cardBottom: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0C1C3C',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

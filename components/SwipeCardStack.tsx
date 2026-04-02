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
const CARD_WIDTH = SCREEN_WIDTH - 64; // 좌 16 + 우 16 + 여유 32
const CARD_HEIGHT = 390;
const SWIPE_THRESHOLD = 90;

// ── 데이터 ────────────────────────────────────────────────
const CARDS = [
  {
    id: 1,
    bgTop: '#4A90D9',
    flag: '🇨🇳',
    avatarLabel: '리',
    name: '리웨이',
    sub: '베이징 출신 · 국민대 3학년',
    urgency: '긴급',
    urgencyColor: '#FFAAAA',
    time: '15분 전',
    title: '외국인등록증 갱신 서류, 어떻게 준비해야 할지 모르겠어요 😢',
    tags: ['🏛 행정', '📋 서류', '🤝 동행'],
  },
  {
    id: 2,
    bgTop: '#5B8EE6',
    flag: '🇪🇬',
    avatarLabel: '아',
    name: '아흐메드',
    sub: '이집트 출신 · 국민대 2학년',
    urgency: '신규',
    urgencyColor: '#C8E0FF',
    time: '1시간 전',
    title: '건강보험 가입이 너무 복잡해요. 아는 분 있으면 도움 부탁드려요!',
    tags: ['🏥 건강', '💬 채팅', '📱 온라인'],
  },
  {
    id: 3,
    bgTop: '#4888D4',
    flag: '🇧🇷',
    avatarLabel: '마',
    name: '마리아',
    sub: '브라질 출신 · 국민대 1학년',
    urgency: '정보',
    urgencyColor: '#C8E0FF',
    time: '2시간 전',
    title: '편의점 알바 지원 서류 작성 도와주실 분 찾아요 🙏',
    tags: ['💼 취업', '📝 서류', '⚡ 급해요'],
  },
  {
    id: 4,
    bgTop: '#5592E0',
    flag: '🇨🇳',
    avatarLabel: '왕',
    name: '왕샤오밍',
    sub: '상하이 출신 · 국민대 4학년',
    urgency: '긴급',
    urgencyColor: '#FFAAAA',
    time: '30분 전',
    title: '병원 예약이랑 진료 통역 같이 가주실 분 정말 필요해요!',
    tags: ['🏥 병원', '🗣 통역', '🤝 동행'],
  },
  {
    id: 5,
    bgTop: '#4F8ADB',
    flag: '🇺🇦',
    avatarLabel: '안',
    name: '안나',
    sub: '우크라이나 출신 · 국민대 3학년',
    urgency: '신규',
    urgencyColor: '#C8E0FF',
    time: '3시간 전',
    title: '은행 계좌 개설하러 같이 가주실 착한 분 구해요 😊',
    tags: ['🏦 금융', '🤝 동행', '📋 서류'],
  },
  {
    id: 6,
    bgTop: '#5A8CE4',
    flag: '🇲🇦',
    avatarLabel: '타',
    name: '타마라',
    sub: '모로코 출신 · 국민대 2학년',
    urgency: '정보',
    urgencyColor: '#C8E0FF',
    time: '4시간 전',
    title: '대학원 지원서 한국어 교정 도와주실 분 계세요?',
    tags: ['🎓 학업', '✏️ 교정', '💬 채팅'],
  },
  {
    id: 7,
    bgTop: '#4D8CD8',
    flag: '🇲🇽',
    avatarLabel: '카',
    name: '카를로스',
    sub: '멕시코 출신 · 국민대 1학년',
    urgency: '긴급',
    urgencyColor: '#FFAAAA',
    time: '5분 전',
    title: '기숙사 계약서 번역 급하게 필요해요!! 도와주세요',
    tags: ['🏠 주거', '📋 번역', '⚡ 급해요'],
  },
];

type CardData = (typeof CARDS)[0];

interface SwipeCardProps {
  onSwipeLeft?: (card: CardData) => void;
  onSwipeRight?: (card: CardData) => void;
  onSwipeActive?: (active: boolean) => void;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function SwipeCardStack({ onSwipeLeft, onSwipeRight, onSwipeActive }: SwipeCardProps) {
  const [index, setIndex] = useState(0);
  const positionRef = useRef(new Animated.ValueXY());
  const position = positionRef.current;
  const isSwiping = useRef(false);


  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
      onPanResponderGrant: () => {
        isSwiping.current = true;
        onSwipeActive?.(true);
      },
      onPanResponderMove: (_, g) => {
        position.setValue({ x: g.dx, y: 0 });
      },
      onPanResponderRelease: (_, g) => {
        isSwiping.current = false;
        onSwipeActive?.(false);
        if (g.dx > SWIPE_THRESHOLD) swipeOut('right');
        else if (g.dx < -SWIPE_THRESHOLD) swipeOut('left');
        else resetPosition();
      },
      onPanResponderTerminate: () => {
        isSwiping.current = false;
        onSwipeActive?.(false);
        resetPosition();
      },
    })
  ).current;

  const swipeOut = (dir: 'left' | 'right') => {
    const x = dir === 'right' ? SCREEN_WIDTH + 100 : -(SCREEN_WIDTH + 100);
    position.stopAnimation();
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      const card = CARDS[index % CARDS.length];
      dir === 'right' ? onSwipeRight?.(card) : onSwipeLeft?.(card);
      position.setValue({ x: 0, y: 0 });
      setIndex(prev => prev + 1);
    });
  };

  const resetPosition = () => {
    position.stopAnimation();
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      useNativeDriver: false,
    }).start();
  };

  // 현재 + 뒤 한 장
  const card = CARDS[index % CARDS.length];
  const next = CARDS[(index + 1) % CARDS.length];

  return (
    <View style={styles.stack}>

      {/* 뒤 카드 */}
      <View style={[styles.card, styles.cardBack1]}>
        <View style={[styles.cardBg, { backgroundColor: next.bgTop }]}>
          <View style={[styles.bgCircle, { width: 280, height: 280, top: -60, right: -60 }]} />
          <View style={[styles.bgCircle, { width: 180, height: 180, bottom: -40, left: -40 }]} />
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{next.avatarLabel}</Text>
          </View>
        </View>
        <View style={styles.gradientOverlay} />
        <View style={styles.urgencyBadge}>
          <View style={[styles.urgencyDot, { backgroundColor: next.urgencyColor }]} />
          <Text style={[styles.urgencyText, { color: next.urgencyColor }]}>{next.urgency}</Text>
        </View>
        <View style={styles.timePill}>
          <Text style={styles.timeText}>{next.time}</Text>
        </View>
        <View style={styles.infoLayer}>
          <View style={styles.infoTop}>
            <View style={styles.infoTopLeft}>
              <View style={styles.nameRow}>
                <Text style={styles.cardName}>{next.name}</Text>
                <Text style={styles.flag}>{next.flag}</Text>
              </View>
              <Text style={styles.cardSub}>{next.sub}</Text>
            </View>
            <View style={styles.schoolBadge}>
              <Text style={styles.schoolBadgeText}>국민대</Text>
            </View>
          </View>
          <View style={styles.requestBox}>
            <Text style={styles.requestLabel}>도움 요청</Text>
            <Text style={styles.requestText}>{next.title}</Text>
          </View>
          <View style={styles.tagsRow}>
            {next.tags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 메인 카드 */}
      <Animated.View
        style={[
          styles.card,
          { left: 0, top: 0, transform: [{ translateX: position.x }] },
        ]}
        {...panResponder.panHandlers}>

        {/* 배경 */}
        <View style={[styles.cardBg, { backgroundColor: card.bgTop }]}>
          <View style={[styles.bgCircle, { width: 280, height: 280, top: -60, right: -60 }]} />
          <View style={[styles.bgCircle, { width: 180, height: 180, bottom: -40, left: -40 }]} />
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{card.avatarLabel}</Text>
          </View>
        </View>

        {/* 그라데이션 오버레이 */}
        <View style={styles.gradientOverlay} />

        {/* 긴급 뱃지 */}
        <View style={styles.urgencyBadge}>
          <View style={[styles.urgencyDot, { backgroundColor: card.urgencyColor }]} />
          <Text style={[styles.urgencyText, { color: card.urgencyColor }]}>
            {card.urgency}
          </Text>
        </View>

        {/* 시간 필 */}
        <View style={styles.timePill}>
          <Text style={styles.timeText}>{card.time}</Text>
        </View>

        {/* 정보 레이어 */}
        <View style={styles.infoLayer}>
          <View style={styles.infoTop}>
            <View style={styles.infoTopLeft}>
              <View style={styles.nameRow}>
                <Text style={styles.cardName}>{card.name}</Text>
                <Text style={styles.flag}>{card.flag}</Text>
              </View>
              <Text style={styles.cardSub}>{card.sub}</Text>
            </View>
            <View style={styles.schoolBadge}>
              <Text style={styles.schoolBadgeText}>국민대</Text>
            </View>
          </View>

          <View style={styles.requestBox}>
            <Text style={styles.requestLabel}>도움 요청</Text>
            <Text style={styles.requestText}>{card.title}</Text>
          </View>

          <View style={styles.tagsRow}>
            {card.tags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

      </Animated.View>
    </View>
  );
}

// ── 스타일 ────────────────────────────────────────────────
const styles = StyleSheet.create({
  stack: {
    width: CARD_WIDTH + 32,
    height: CARD_HEIGHT + 8,
    position: 'relative',
    shadowColor: '#3B6FE8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },

  // 카드 기본
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardBack1: {
    right: 0,
    bottom: 0,
    opacity: 0.75,
  },

  // 배경
  cardBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: 'rgba(20,50,110,0.82)',
  },

  // 아바타
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
    top: CARD_HEIGHT * 0.5 - 200 * 0.62 - 100,
    left: CARD_WIDTH / 2 - 100,
  },
  avatarText: {
    fontSize: 80,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.95)',
  },

  // 긴급 뱃지
  urgencyBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
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
  urgencyDot: { width: 7, height: 7, borderRadius: 4 },
  urgencyText: { fontSize: 11, fontWeight: '800' },

  // 시간
  timePill: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  timeText: { fontSize: 11, fontWeight: '600', color: '#fff' },

  // 정보 레이어
  infoLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingBottom: 22,
    paddingTop: 20,
  },
  infoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  infoTopLeft: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  cardName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  flag: { fontSize: 18 },
  cardSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    marginBottom: 12,
  },
  schoolBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  schoolBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // 요청 박스
  requestBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  requestLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  requestText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 20,
  },

  // 태그
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 7,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },

});

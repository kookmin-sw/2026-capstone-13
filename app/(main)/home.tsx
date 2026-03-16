// 홈 화면 - 도움 요청 피드 (리디자인)
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_REQUESTS } from '../../constants/mockData';
import { getHelpRequests } from '../../services/helpService';
import { useHelpRequestStore } from '../../stores/helpRequestStore';
import type { HelpCategory, HelpMethod, HelpRequest } from '../../types';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';
const BANNER_WIDTH = Dimensions.get('window').width - 40;

const BANNER_SLIDES = [
  {
    id: 1,
    sub: '국민대학교 · 지금 활동중',
    main: '도움 요청 ',
    highlight: '23개',
    tail: ' 대기중이에요',
    bg: ['#4F46E5', '#7C3AED'],
  },
  {
    id: 2,
    sub: '📢 중요 공지',
    main: '수강정정 기간 ',
    highlight: '3/16~3/20',
    tail: '',
    bg: ['#0EA5E9', '#6366F1'],
  },
  {
    id: 3,
    sub: '내 활동 요약',
    main: '이번 달 도움 ',
    highlight: '3회',
    tail: ' · 평점 4.8 ⭐',
    bg: ['#059669', '#0EA5E9'],
  },
];


const CATEGORY_EMOJI: Record<HelpCategory, string> = {
  BANK: '🏦', HOSPITAL: '🏥', SCHOOL: '🏫', DAILY: '🏠', OTHER: '📌',
};

const CATEGORY_BG: Record<HelpCategory, string> = {
  BANK: '#FEF3C7', HOSPITAL: '#FEE2E2', SCHOOL: '#EDE9FE', DAILY: '#D1FAE5', OTHER: '#F3F4F6',
};

const METHOD_BADGE: Record<HelpMethod, { bg: string; color: string; dot: string; label: string }> = {
  CHAT:       { bg: '#EEF2FF', color: PRIMARY,    dot: PRIMARY,    label: '채팅' },
  VIDEO_CALL: { bg: '#F5F3FF', color: '#7C3AED',  dot: '#7C3AED',  label: '영상통화' },
  OFFLINE:    { bg: '#FFFBEB', color: '#D97706',  dot: '#D97706',  label: '오프라인' },
};

function formatTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { myRequests } = useHelpRequestStore();
  const [requests, setRequests] = useState<HelpRequest[]>(MOCK_REQUESTS);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory] = useState<HelpCategory | 'ALL'>('ALL');
  const [sortMode, setSortMode] = useState<'LATEST' | 'OPEN'>('LATEST');
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<ScrollView>(null);

  // 3초마다 자동 슬라이드
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % BANNER_SLIDES.length;
        bannerRef.current?.scrollTo({ x: next * BANNER_WIDTH, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await getHelpRequests();
      if (response.success && response.data.length > 0) {
        setRequests(response.data);
      }
    } catch {
      // 백엔드 미연결 시 목업 데이터 유지
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  // 내가 작성한 글 + 기존 목록 합치기 (중복 id 제거)
  const existingIds = new Set(requests.map((r) => r.id));
  const allRequests = [
    ...myRequests.filter((r) => !existingIds.has(r.id)),
    ...requests,
  ];

  const filteredRequests = (selectedCategory === 'ALL'
    ? allRequests
    : allRequests.filter((r) => r.category === selectedCategory)
  ).filter((r) => sortMode === 'OPEN' ? r.status === 'WAITING' : true)
   .sort((a, b) => sortMode === 'LATEST'
     ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
     : 0
   );

  const renderItem = useCallback(({ item }: { item: HelpRequest }) => {
    const method = METHOD_BADGE[item.helpMethod];
    const isMatched = item.status === 'MATCHED';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/request-detail', params: { id: item.id } })}
        activeOpacity={0.85}
      >

        {/* 왼쪽 아이콘 */}
        <View style={[styles.cardIcon, { backgroundColor: CATEGORY_BG[item.category] }]}>
          <Text style={styles.cardIconEmoji}>{CATEGORY_EMOJI[item.category]}</Text>
        </View>

        {/* 오른쪽 내용 */}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.statusBadge, isMatched ? styles.statusMatched : styles.statusOpen]}>
              <Text style={[styles.statusText, isMatched ? styles.statusMatchedText : styles.statusOpenText]}>
                {isMatched ? '매칭됨' : '모집중'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.cardInfo}>
              <View style={styles.schoolTag}><Text style={styles.schoolTagText}>국민대</Text></View>
              <Text style={styles.timeTag}>{formatTime(item.createdAt)}</Text>
            </View>
            <View style={[styles.methodBadge, { backgroundColor: method.bg }]}>
              <View style={[styles.methodDot, { backgroundColor: method.dot }]} />
              <Text style={[styles.methodText, { color: method.color }]}>{method.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const ListHeader = (
    <View style={styles.sectionHeader}>
      <TouchableOpacity
        style={[styles.sortBtn, sortMode === 'LATEST' && styles.sortBtnActive]}
        onPress={() => setSortMode('LATEST')}
      >
        <Text style={[styles.sortBtnText, sortMode === 'LATEST' && styles.sortBtnTextActive]}>최신순</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sortBtn, sortMode === 'OPEN' && styles.sortBtnActive]}
        onPress={() => setSortMode('OPEN')}
      >
        <Text style={[styles.sortBtnText, sortMode === 'OPEN' && styles.sortBtnTextActive]}>모집중</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 커스텀 헤더 */}
      <View style={styles.header}>
        {/* 로고 + 버튼 */}
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkEmoji}>🤝</Text>
            </View>
            <Text style={styles.appName}>
              도와줘<Text style={styles.appNameAccent}>코리안</Text>
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/search')}>
              <Ionicons name="search-outline" size={18} color={PRIMARY} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtnRelative}>
              <Ionicons name="notifications-outline" size={18} color={PRIMARY} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 배너 캐러셀 */}
        <View style={styles.bannerWrap}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
              setBannerIndex(idx);
            }}
          >
            {BANNER_SLIDES.map((slide) => (
              <View key={slide.id} style={[styles.bannerSlide, { backgroundColor: slide.bg[0] }]}>
                <Text style={styles.bannerSub}>{slide.sub}</Text>
                <Text style={styles.bannerMain}>
                  {slide.main}
                  <Text style={styles.bannerHighlight}>{slide.highlight}</Text>
                  {slide.tail}
                </Text>
              </View>
            ))}
          </ScrollView>
          {/* 닷 인디케이터 */}
          <View style={styles.dots}>
            {BANNER_SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, bannerIndex === i && styles.dotActive]} />
            ))}
          </View>
        </View>

      </View>

      {/* 피드 */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListHeaderComponent={ListHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>도움 요청이 없습니다</Text>
              <Text style={styles.emptySubtext}>첫 번째 요청을 등록해보세요!</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(main)/write')}
        activeOpacity={0.88}
      >
        <View style={styles.fabPlus}>
          <Text style={styles.fabPlusText}>+</Text>
        </View>
        <Text style={styles.fabText}>도움 요청하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 헤더
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79,70,229,0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoMark: {
    width: 32,
    height: 32,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMarkEmoji: {
    fontSize: 16,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1B4B',
    letterSpacing: -0.5,
  },
  appNameAccent: {
    color: PRIMARY,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnRelative: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    width: 7,
    height: 7,
    backgroundColor: '#EF4444',
    borderRadius: 4,
    top: 6,
    right: 6,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // 배너 캐러셀
  bannerWrap: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerSlide: {
    width: BANNER_WIDTH,
    padding: 18,
    paddingBottom: 30,
    borderRadius: 16,
  },
  bannerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 4,
  },
  bannerMain: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bannerHighlight: {
    color: '#FCD34D',
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 16,
    backgroundColor: '#FFFFFF',
  },

  // 필터 칩
  filterScroll: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 7,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(79,70,229,0.1)',
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // 리스트
  list: {
    padding: 14,
    paddingBottom: 100,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(79,70,229,0.15)',
    backgroundColor: '#FFFFFF',
  },
  sortBtnActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  sortBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  sortBtnTextActive: {
    color: '#FFFFFF',
  },

  // 카드
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.06)',
    position: 'relative',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardIconEmoji: {
    fontSize: 26,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B',
    letterSpacing: -0.3,
    lineHeight: 20,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
    marginTop: 1,
  },
  statusOpen: {
    backgroundColor: '#D1FAE5',
  },
  statusMatched: {
    backgroundColor: PRIMARY_LIGHT,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusOpenText: {
    color: '#065F46',
  },
  statusMatchedText: {
    color: '#3730A3',
  },
  cardDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  schoolTag: {
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  schoolTagText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: '600',
  },
  timeTag: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  methodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // 빈 상태
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  fabPlus: {
    width: 22,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabPlusText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 20,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

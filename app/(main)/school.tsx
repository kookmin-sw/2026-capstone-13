// 학교생활 화면
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

// ── Design tokens (홈 화면과 동일) ──
const BLUE     = '#3B6FE8';
const BLUE_L   = '#EEF4FF';
const BLUE_MID = '#A8C8FA';
const BORDER   = '#D4E4FA';
const T1       = '#0E1E40';
const T3       = '#6B9DF0';

type TabKey = 'CAFETERIA' | 'NOTICE';

interface CafeteriaMenu {
  id: number;
  date: string;
  mealTime: '아침' | '점심' | '저녁';
  items: { korean: string; english: string; price?: number }[];
  restaurant: string;
}

interface SchoolNotice {
  id: number;
  categoryId: string;
  categoryName: string;
  titleKo: string;
  title: string;
  link: string;
  pubDate: string | null;
}

const MOCK_MENUS: CafeteriaMenu[] = [
  {
    id: 1, date: '2026-03-15', mealTime: '점심', restaurant: '제1학생식당',
    items: [
      { korean: '김치찌개', english: 'Kimchi Stew', price: 4500 },
      { korean: '제육볶음', english: 'Spicy Stir-fried Pork', price: 5000 },
      { korean: '된장국', english: 'Soybean Paste Soup' },
      { korean: '공기밥', english: 'Steamed Rice' },
      { korean: '깍두기', english: 'Cubed Radish Kimchi' },
    ],
  },
  {
    id: 2, date: '2026-03-15', mealTime: '점심', restaurant: '교직원식당',
    items: [
      { korean: '순두부찌개', english: 'Soft Tofu Stew', price: 5500 },
      { korean: '불고기덮밥', english: 'Bulgogi Rice Bowl', price: 6000 },
      { korean: '미역국', english: 'Seaweed Soup' },
      { korean: '잡채', english: 'Glass Noodles with Vegetables' },
    ],
  },
  {
    id: 3, date: '2026-03-15', mealTime: '저녁', restaurant: '제1학생식당',
    items: [
      { korean: '부대찌개', english: 'Army Base Stew', price: 5000 },
      { korean: '돈까스', english: 'Pork Cutlet', price: 5500 },
      { korean: '콩나물국', english: 'Bean Sprout Soup' },
      { korean: '시금치나물', english: 'Seasoned Spinach' },
    ],
  },
];


const MEAL_TIME_COLOR = {
  아침: { bg: '#FEF3C7', text: '#D97706' },
  점심: { bg: BLUE_L,   text: BLUE       },
  저녁: { bg: '#F5F3FF', text: '#7C3AED' },
};

const CATEGORY_COLOR: Record<string, string> = {
  장학: '#10B981', 학사: BLUE, 행사: '#8B5CF6', 취업: '#F59E0B', 시설: BLUE_MID,
};

export default function SchoolScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('CAFETERIA');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedNotice, setExpandedNotice] = useState<number | null>(null);
  const [notices, setNotices] = useState<SchoolNotice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);

  const fetchNotices = async () => {
    setNoticesLoading(true);
    try {
      const res = await api.get('/notices');
      setNotices(res.data.data ?? []);
    } catch (e) {
      // 실패 시 빈 목록 유지
    } finally {
      setNoticesLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotices().finally(() => setRefreshing(false));
  };

  return (
    <View style={styles.container}>
      {/* 탭 전환 */}
      <View style={styles.tabBar}>
        {(['CAFETERIA', 'NOTICE'] as TabKey[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={key === 'CAFETERIA' ? 'restaurant-outline' : 'megaphone-outline'}
              size={16}
              color={activeTab === key ? BLUE : BLUE_MID}
            />
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
              {key === 'CAFETERIA' ? '오늘의 학식' : '공지사항'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
      >
        {/* 학식 탭 */}
        {activeTab === 'CAFETERIA' && (
          <View style={styles.section}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={15} color={T3} />
              <Text style={styles.dateText}>2026년 3월 15일 (일) 메뉴</Text>
            </View>
            <View style={styles.translateBadge}>
              <Ionicons name="language-outline" size={13} color={BLUE} />
              <Text style={styles.translateBadgeText}>한국어 메뉴를 영어로 번역했어요</Text>
            </View>
            {MOCK_MENUS.map((menu) => (
              <View key={menu.id} style={styles.card}>
                <View style={[styles.cardBar, { backgroundColor: MEAL_TIME_COLOR[menu.mealTime].text }]} />
                <View style={styles.cardInner}>
                  <View style={styles.menuHeader}>
                    <Text style={styles.restaurantName}>{menu.restaurant}</Text>
                    <View style={[styles.mealTimeBadge, { backgroundColor: MEAL_TIME_COLOR[menu.mealTime].bg }]}>
                      <Text style={[styles.mealTimeBadgeText, { color: MEAL_TIME_COLOR[menu.mealTime].text }]}>
                        {menu.mealTime}
                      </Text>
                    </View>
                  </View>
                  {menu.items.map((item, idx) => (
                    <View key={idx} style={styles.menuItem}>
                      <View style={styles.menuItemLeft}>
                        <Text style={styles.menuKorean}>{item.korean}</Text>
                        <Text style={styles.menuEnglish}>{item.english}</Text>
                      </View>
                      {item.price ? <Text style={styles.menuPrice}>{item.price.toLocaleString()}원</Text> : null}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 공지사항 탭 */}
        {activeTab === 'NOTICE' && (
          <View style={styles.section}>
            <View style={styles.translateBadge}>
              <Ionicons name="language-outline" size={13} color={BLUE} />
              <Text style={styles.translateBadgeText}>공지사항 제목을 영어로 번역했어요</Text>
            </View>
            {noticesLoading ? (
              <ActivityIndicator color={BLUE} style={{ marginTop: 40 }} />
            ) : notices.length === 0 ? (
              <Text style={styles.emptyText}>공지사항이 없습니다.</Text>
            ) : (
              notices.map((notice) => (
                <TouchableOpacity
                  key={notice.id}
                  style={styles.card}
                  onPress={() => setExpandedNotice(expandedNotice === notice.id ? null : notice.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.noticeHeaderRow}>
                    <View style={[styles.noticeCategoryBadge, { backgroundColor: (CATEGORY_COLOR[notice.categoryName] ?? '#9CA3AF') + '22' }]}>
                      <Text style={[styles.noticeCategoryText, { color: CATEGORY_COLOR[notice.categoryName] ?? '#9CA3AF' }]}>
                        {notice.categoryName}
                      </Text>
                    </View>
                    <Text style={styles.noticeDate}>{notice.pubDate ?? ''}</Text>
                  </View>
                  <Text style={styles.noticeTitleKo} numberOfLines={expandedNotice === notice.id ? undefined : 1}>
                    {notice.titleKo}
                  </Text>
                  <View style={styles.enTitleRow}>
                    <Ionicons name="language-outline" size={12} color={BLUE} />
                    <Text style={styles.noticeTitleEn} numberOfLines={expandedNotice === notice.id ? undefined : 1}>
                      {notice.title}
                    </Text>
                  </View>
                  {expandedNotice === notice.id && notice.link ? (
                    <TouchableOpacity
                      style={styles.linkBox}
                      onPress={() => Linking.openURL(notice.link)}
                    >
                      <Ionicons name="open-outline" size={13} color={BLUE} />
                      <Text style={styles.linkText}>원문 보기</Text>
                    </TouchableOpacity>
                  ) : null}
                  <View style={styles.expandRow}>
                    <Ionicons
                      name={expandedNotice === notice.id ? 'chevron-up' : 'chevron-down'}
                      size={14} color="#9CA3AF"
                    />
                    <Text style={styles.expandText}>
                      {expandedNotice === notice.id ? '접기' : '자세히 보기'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingTop: Platform.OS === 'ios' ? 60 : 32,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 6,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: BLUE },
  tabText: { fontSize: 14, fontWeight: '700', color: BLUE_MID },
  tabTextActive: { color: BLUE },

  scroll: { flex: 1 },
  section: { padding: 16, gap: 12 },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 14, fontWeight: '700', color: T1 },

  translateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BLUE_L, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  translateBadgeText: { fontSize: 12, color: BLUE, fontWeight: '600' },

  // ── Card (홈과 동일한 왼쪽 컬러 바 스타일) ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row',
  },
  cardBar:   { width: 5, flexShrink: 0 },
  cardInner: { flex: 1, padding: 14, gap: 8 },

  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restaurantName: { fontSize: 15, fontWeight: '800', color: T1 },
  mealTimeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  mealTimeBadgeText: { fontSize: 12, fontWeight: '700' },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderTopWidth: 1, borderTopColor: BORDER,
  },
  menuItemLeft: { flex: 1, gap: 2 },
  menuKorean:  { fontSize: 14, fontWeight: '600', color: T1 },
  menuEnglish: { fontSize: 12, color: T3 },
  menuPrice:   { fontSize: 13, fontWeight: '700', color: BLUE_MID },

  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noticeCategoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  noticeCategoryText: { fontSize: 11, fontWeight: '700' },
  noticeDate: { fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' },
  noticeTitleKo: { fontSize: 14, fontWeight: '700', color: '#1E1B4B', lineHeight: 20 },
  enTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  noticeTitleEn: { flex: 1, fontSize: 13, color: BLUE, fontWeight: '500', lineHeight: 18 },
  linkBox: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BLUE_L, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, alignSelf: 'flex-start', marginTop: 2,
  },
  linkText: { fontSize: 13, color: BLUE, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 40 },
  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 2 },
  expandText: { fontSize: 12, color: '#9CA3AF' },
});

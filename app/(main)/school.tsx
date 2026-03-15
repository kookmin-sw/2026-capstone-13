// 학교생활 화면
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';

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
  category: string;
  titleKo: string;
  titleEn: string;
  summaryEn: string;
  date: string;
  isImportant: boolean;
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

const MOCK_NOTICES: SchoolNotice[] = [
  {
    id: 1, category: '장학', isImportant: true, date: '2026-03-14',
    titleKo: '2026학년도 1학기 국가장학금 2차 신청 안내',
    titleEn: '2026 Spring Semester National Scholarship (2nd Round) Application Guide',
    summaryEn: 'Applications for the 2nd round of national scholarships are open. Eligible students can apply through the Korea Scholarship Foundation website by March 31.',
  },
  {
    id: 2, category: '학사', isImportant: true, date: '2026-03-13',
    titleKo: '2026학년도 1학기 수강정정 기간 안내',
    titleEn: 'Course Change Period Notice – Spring 2026',
    summaryEn: 'The course change period runs from March 16 to March 20. You may add or drop courses through the student portal during this time.',
  },
  {
    id: 3, category: '행사', isImportant: false, date: '2026-03-12',
    titleKo: '외국인 유학생 한국문화 체험 프로그램 참가자 모집',
    titleEn: 'Korean Culture Experience Program – International Student Recruitment',
    summaryEn: 'The International Student Support Center is recruiting participants for the Korean Culture Experience Program. Activities include temple stay, hanbok wearing, and cooking classes.',
  },
  {
    id: 4, category: '취업', isImportant: false, date: '2026-03-11',
    titleKo: '외국인 유학생 취업 특강 및 상담 프로그램 안내',
    titleEn: 'Career Seminar & Counseling Program for International Students',
    summaryEn: 'A special career seminar for international students will be held on March 25. Topics include job search in Korea, visa requirements for employment, and resume writing.',
  },
  {
    id: 5, category: '시설', isImportant: false, date: '2026-03-10',
    titleKo: '도서관 시험기간 연장 운영 안내',
    titleEn: 'Extended Library Hours During Exam Period',
    summaryEn: 'The main library will operate extended hours (07:00–02:00) during the midterm exam period from April 14 to April 25.',
  },
];

const MEAL_TIME_COLOR = {
  아침: { bg: '#FEF3C7', text: '#D97706' },
  점심: { bg: '#DBEAFE', text: '#2563EB' },
  저녁: { bg: '#EDE9FE', text: '#7C3AED' },
};

const CATEGORY_COLOR: Record<string, string> = {
  장학: '#10B981', 학사: '#3B82F6', 행사: '#8B5CF6', 취업: '#F59E0B', 시설: '#6B7280',
};

export default function SchoolScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('CAFETERIA');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedNotice, setExpandedNotice] = useState<number | null>(null);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
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
          >
            <Ionicons
              name={key === 'CAFETERIA' ? 'restaurant-outline' : 'megaphone-outline'}
              size={16}
              color={activeTab === key ? PRIMARY : '#9CA3AF'}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        {/* 학식 탭 */}
        {activeTab === 'CAFETERIA' && (
          <View style={styles.section}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={15} color="#6B7280" />
              <Text style={styles.dateText}>2026년 3월 15일 (일) 메뉴</Text>
            </View>
            <View style={styles.translateBadge}>
              <Ionicons name="language-outline" size={13} color={PRIMARY} />
              <Text style={styles.translateBadgeText}>한국어 메뉴를 영어로 번역했어요</Text>
            </View>
            {MOCK_MENUS.map((menu) => (
              <View key={menu.id} style={styles.card}>
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
            ))}
          </View>
        )}

        {/* 공지사항 탭 */}
        {activeTab === 'NOTICE' && (
          <View style={styles.section}>
            <View style={styles.translateBadge}>
              <Ionicons name="language-outline" size={13} color={PRIMARY} />
              <Text style={styles.translateBadgeText}>공지사항 제목과 내용을 영어로 번역했어요</Text>
            </View>
            {MOCK_NOTICES.map((notice) => (
              <TouchableOpacity
                key={notice.id}
                style={styles.card}
                onPress={() => setExpandedNotice(expandedNotice === notice.id ? null : notice.id)}
                activeOpacity={0.85}
              >
                <View style={styles.noticeHeaderRow}>
                  <View style={[styles.noticeCategoryBadge, { backgroundColor: (CATEGORY_COLOR[notice.category] ?? '#9CA3AF') + '22' }]}>
                    <Text style={[styles.noticeCategoryText, { color: CATEGORY_COLOR[notice.category] ?? '#9CA3AF' }]}>
                      {notice.category}
                    </Text>
                  </View>
                  {notice.isImportant && (
                    <View style={styles.importantBadge}>
                      <Text style={styles.importantBadgeText}>중요</Text>
                    </View>
                  )}
                  <Text style={styles.noticeDate}>{notice.date}</Text>
                </View>
                <Text style={styles.noticeTitleKo} numberOfLines={expandedNotice === notice.id ? undefined : 1}>
                  {notice.titleKo}
                </Text>
                <View style={styles.enTitleRow}>
                  <Ionicons name="language-outline" size={12} color={PRIMARY} />
                  <Text style={styles.noticeTitleEn} numberOfLines={expandedNotice === notice.id ? undefined : 1}>
                    {notice.titleEn}
                  </Text>
                </View>
                {expandedNotice === notice.id && (
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>English Summary</Text>
                    <Text style={styles.summaryText}>{notice.summaryEn}</Text>
                  </View>
                )}
                <View style={styles.expandRow}>
                  <Ionicons
                    name={expandedNotice === notice.id ? 'chevron-up' : 'chevron-down'}
                    size={14} color="#9CA3AF"
                  />
                  <Text style={styles.expandText}>
                    {expandedNotice === notice.id ? '접기' : '영문 요약 보기'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
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
    borderBottomColor: 'rgba(79,70,229,0.1)',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 6,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: PRIMARY },

  scroll: { flex: 1 },
  section: { padding: 16, gap: 12 },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 14, fontWeight: '700', color: '#1E1B4B' },
  translateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  translateBadgeText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 10,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(79,70,229,0.06)',
  },

  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restaurantName: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  mealTimeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  mealTimeBadgeText: { fontSize: 12, fontWeight: '700' },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(79,70,229,0.06)',
  },
  menuItemLeft: { flex: 1, gap: 2 },
  menuKorean: { fontSize: 14, fontWeight: '600', color: '#1E1B4B' },
  menuEnglish: { fontSize: 12, color: PRIMARY },
  menuPrice: { fontSize: 13, fontWeight: '700', color: '#6B7280' },

  noticeHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noticeCategoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  noticeCategoryText: { fontSize: 11, fontWeight: '700' },
  importantBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  importantBadgeText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  noticeDate: { fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' },
  noticeTitleKo: { fontSize: 14, fontWeight: '700', color: '#1E1B4B', lineHeight: 20 },
  enTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  noticeTitleEn: { flex: 1, fontSize: 13, color: PRIMARY, fontWeight: '500', lineHeight: 18 },
  summaryBox: {
    backgroundColor: '#F3F4F8', borderRadius: 10, padding: 12, gap: 6, marginTop: 2,
  },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 2 },
  expandText: { fontSize: 12, color: '#9CA3AF' },
});

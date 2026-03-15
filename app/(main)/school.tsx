// 학교생활 화면 - 학식 메뉴 번역 & 공지사항 번역
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
import { Colors } from '../../constants/colors';

type TabKey = 'CAFETERIA' | 'NOTICE';

// ─── 타입 ───────────────────────────────────────────
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

// ─── 목업 데이터 ─────────────────────────────────────
const MOCK_MENUS: CafeteriaMenu[] = [
  {
    id: 1,
    date: '2026-03-15',
    mealTime: '점심',
    restaurant: '제1학생식당',
    items: [
      { korean: '김치찌개', english: 'Kimchi Stew', price: 4500 },
      { korean: '제육볶음', english: 'Spicy Stir-fried Pork', price: 5000 },
      { korean: '된장국', english: 'Soybean Paste Soup', price: 0 },
      { korean: '공기밥', english: 'Steamed Rice', price: 0 },
      { korean: '깍두기', english: 'Cubed Radish Kimchi', price: 0 },
    ],
  },
  {
    id: 2,
    date: '2026-03-15',
    mealTime: '점심',
    restaurant: '교직원식당',
    items: [
      { korean: '순두부찌개', english: 'Soft Tofu Stew', price: 5500 },
      { korean: '불고기덮밥', english: 'Bulgogi Rice Bowl', price: 6000 },
      { korean: '미역국', english: 'Seaweed Soup', price: 0 },
      { korean: '잡채', english: 'Glass Noodles with Vegetables', price: 0 },
    ],
  },
  {
    id: 3,
    date: '2026-03-15',
    mealTime: '저녁',
    restaurant: '제1학생식당',
    items: [
      { korean: '부대찌개', english: 'Army Base Stew', price: 5000 },
      { korean: '돈까스', english: 'Pork Cutlet', price: 5500 },
      { korean: '콩나물국', english: 'Bean Sprout Soup', price: 0 },
      { korean: '시금치나물', english: 'Seasoned Spinach', price: 0 },
    ],
  },
];

const MOCK_NOTICES: SchoolNotice[] = [
  {
    id: 1,
    category: '장학',
    titleKo: '2026학년도 1학기 국가장학금 2차 신청 안내',
    titleEn: '2026 Spring Semester National Scholarship (2nd Round) Application Guide',
    summaryEn: 'Applications for the 2nd round of national scholarships are open. Eligible students can apply through the Korea Scholarship Foundation website by March 31.',
    date: '2026-03-14',
    isImportant: true,
  },
  {
    id: 2,
    category: '학사',
    titleKo: '2026학년도 1학기 수강정정 기간 안내',
    titleEn: 'Course Change Period Notice – Spring 2026',
    summaryEn: 'The course change period runs from March 16 to March 20. You may add or drop courses through the student portal during this time.',
    date: '2026-03-13',
    isImportant: true,
  },
  {
    id: 3,
    category: '행사',
    titleKo: '외국인 유학생 한국문화 체험 프로그램 참가자 모집',
    titleEn: 'Korean Culture Experience Program – International Student Recruitment',
    summaryEn: 'The International Student Support Center is recruiting participants for the Korean Culture Experience Program. Activities include temple stay, hanbok wearing, and cooking classes.',
    date: '2026-03-12',
    isImportant: false,
  },
  {
    id: 4,
    category: '취업',
    titleKo: '외국인 유학생 취업 특강 및 상담 프로그램 안내',
    titleEn: 'Career Seminar & Counseling Program for International Students',
    summaryEn: 'A special career seminar for international students will be held on March 25. Topics include job search in Korea, visa requirements for employment, and resume writing.',
    date: '2026-03-11',
    isImportant: false,
  },
  {
    id: 5,
    category: '시설',
    titleKo: '도서관 시험기간 연장 운영 안내',
    titleEn: 'Extended Library Hours During Exam Period',
    summaryEn: 'The main library will operate extended hours (07:00–02:00) during the midterm exam period from April 14 to April 25.',
    date: '2026-03-10',
    isImportant: false,
  },
];

const MEAL_TIME_COLOR = {
  아침: { bg: '#FEF3C7', text: '#D97706' },
  점심: { bg: '#DBEAFE', text: '#2563EB' },
  저녁: { bg: '#EDE9FE', text: '#7C3AED' },
};

const CATEGORY_COLOR: Record<string, string> = {
  장학: '#10B981',
  학사: '#3B82F6',
  행사: '#8B5CF6',
  취업: '#F59E0B',
  시설: '#6B7280',
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
      {/* 상단 탭 전환 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'CAFETERIA' && styles.tabActive]}
          onPress={() => setActiveTab('CAFETERIA')}
        >
          <Ionicons
            name="restaurant-outline"
            size={16}
            color={activeTab === 'CAFETERIA' ? Colors.primary : Colors.textLight}
          />
          <Text style={[styles.tabText, activeTab === 'CAFETERIA' && styles.tabTextActive]}>
            오늘의 학식
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'NOTICE' && styles.tabActive]}
          onPress={() => setActiveTab('NOTICE')}
        >
          <Ionicons
            name="megaphone-outline"
            size={16}
            color={activeTab === 'NOTICE' ? Colors.primary : Colors.textLight}
          />
          <Text style={[styles.tabText, activeTab === 'NOTICE' && styles.tabTextActive]}>
            공지사항
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* ── 학식 탭 ── */}
        {activeTab === 'CAFETERIA' && (
          <View style={styles.section}>
            {/* 날짜 표시 */}
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.dateText}>2026년 3월 15일 (일) 메뉴</Text>
            </View>

            <View style={styles.translateBadge}>
              <Ionicons name="language-outline" size={13} color={Colors.primary} />
              <Text style={styles.translateBadgeText}>한국어 메뉴를 영어로 번역했어요</Text>
            </View>

            {MOCK_MENUS.map((menu) => (
              <View key={menu.id} style={styles.menuCard}>
                {/* 식당명 + 식사 시간 */}
                <View style={styles.menuHeader}>
                  <Text style={styles.restaurantName}>{menu.restaurant}</Text>
                  <View style={[
                    styles.mealTimeBadge,
                    { backgroundColor: MEAL_TIME_COLOR[menu.mealTime].bg },
                  ]}>
                    <Text style={[
                      styles.mealTimeBadgeText,
                      { color: MEAL_TIME_COLOR[menu.mealTime].text },
                    ]}>
                      {menu.mealTime}
                    </Text>
                  </View>
                </View>

                {/* 메뉴 아이템 */}
                {menu.items.map((item, idx) => (
                  <View key={idx} style={styles.menuItem}>
                    <View style={styles.menuItemLeft}>
                      <Text style={styles.menuKorean}>{item.korean}</Text>
                      <Text style={styles.menuEnglish}>{item.english}</Text>
                    </View>
                    {item.price ? (
                      <Text style={styles.menuPrice}>{item.price.toLocaleString()}원</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ── 공지사항 탭 ── */}
        {activeTab === 'NOTICE' && (
          <View style={styles.section}>
            <View style={styles.translateBadge}>
              <Ionicons name="language-outline" size={13} color={Colors.primary} />
              <Text style={styles.translateBadgeText}>공지사항 제목과 내용을 영어로 번역했어요</Text>
            </View>

            {MOCK_NOTICES.map((notice) => (
              <TouchableOpacity
                key={notice.id}
                style={styles.noticeCard}
                onPress={() => setExpandedNotice(expandedNotice === notice.id ? null : notice.id)}
              >
                {/* 카테고리 + 중요 뱃지 */}
                <View style={styles.noticeHeaderRow}>
                  <View style={[
                    styles.noticeCategoryBadge,
                    { backgroundColor: (CATEGORY_COLOR[notice.category] ?? Colors.textLight) + '22' },
                  ]}>
                    <Text style={[
                      styles.noticeCategoryText,
                      { color: CATEGORY_COLOR[notice.category] ?? Colors.textLight },
                    ]}>
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

                {/* 제목 (한국어) */}
                <Text style={styles.noticeTitleKo} numberOfLines={expandedNotice === notice.id ? undefined : 1}>
                  {notice.titleKo}
                </Text>

                {/* 제목 (영어 번역) */}
                <View style={styles.enTitleRow}>
                  <Ionicons name="language-outline" size={12} color={Colors.primary} />
                  <Text style={styles.noticeTitleEn} numberOfLines={expandedNotice === notice.id ? undefined : 1}>
                    {notice.titleEn}
                  </Text>
                </View>

                {/* 펼쳤을 때 영어 요약 */}
                {expandedNotice === notice.id && (
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>English Summary</Text>
                    <Text style={styles.summaryText}>{notice.summaryEn}</Text>
                  </View>
                )}

                {/* 펼치기/접기 힌트 */}
                <View style={styles.expandRow}>
                  <Ionicons
                    name={expandedNotice === notice.id ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={Colors.textLight}
                  />
                  <Text style={styles.expandText}>
                    {expandedNotice === notice.id ? '접기' : '영문 요약 보기'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // 상단 탭
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  tabTextActive: {
    color: Colors.primary,
  },

  scroll: {
    flex: 1,
  },
  section: {
    padding: 16,
    gap: 12,
  },

  // 날짜 & 번역 안내
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  translateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  translateBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },

  // 학식 카드
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  mealTimeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mealTimeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  menuItemLeft: {
    flex: 1,
    gap: 2,
  },
  menuKorean: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  menuEnglish: {
    fontSize: 12,
    color: Colors.primary,
  },
  menuPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },

  // 공지사항 카드
  noticeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  noticeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  noticeCategoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  importantBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  importantBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.error,
  },
  noticeDate: {
    fontSize: 11,
    color: Colors.textLight,
    marginLeft: 'auto',
  },
  noticeTitleKo: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  enTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  noticeTitleEn: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
    lineHeight: 18,
  },
  summaryBox: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginTop: 2,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 2,
  },
  expandText: {
    fontSize: 12,
    color: Colors.textLight,
  },

  bottomPadding: {
    height: 30,
  },
});

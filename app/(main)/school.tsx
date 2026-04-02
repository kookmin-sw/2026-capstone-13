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
import { useAuthStore } from '../../stores/authStore';

const LANG_NAMES: Record<string, string> = {
  en: '영어', 'zh-Hans': '중국어(간체)', 'zh-Hant': '중국어(번체)',
  ja: '일본어', vi: '베트남어', mn: '몽골어',
  fr: '프랑스어', de: '독일어', es: '스페인어', ru: '러시아어',
};

// ── Design tokens (홈 화면과 동일) ──
const BLUE     = '#3B6FE8';
const BLUE_L   = '#EEF4FF';
const BLUE_MID = '#A8C8FA';
const BORDER   = '#D4E4FA';
const T1       = '#0E1E40';
const T3       = '#6B9DF0';

type TabKey = 'CAFETERIA' | 'NOTICE';

interface MealData {
  id: number;
  mealDate: string;
  cafeteria: string;
  corner: string;
  cafeteriaKo: string;
  cornerKo: string;
  menu: string;
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


const CATEGORY_COLOR: Record<string, string> = {
  장학: '#10B981', 학사: BLUE, 행사: '#8B5CF6', 취업: '#F59E0B', 시설: BLUE_MID,
};

export default function SchoolScreen() {
  const user = useAuthStore((s) => s.user);
  const langCode = user?.preferredLanguage ?? 'en';
  const langName = LANG_NAMES[langCode] ?? langCode;

  const [activeTab, setActiveTab] = useState<TabKey>('CAFETERIA');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedNotice, setExpandedNotice] = useState<number | null>(null);
  const [notices, setNotices] = useState<SchoolNotice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [meals, setMeals] = useState<MealData[]>([]);
  const [mealsLoading, setMealsLoading] = useState(false);

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

  const fetchMeals = async () => {
    setMealsLoading(true);
    try {
      const res = await api.get('/meals');
      setMeals(res.data.data ?? []);
    } catch (e) {
      // 실패 시 빈 목록 유지
    } finally {
      setMealsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
    fetchMeals();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchNotices(), fetchMeals()]).finally(() => setRefreshing(false));
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
            {meals.length > 0 && (
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={15} color={T3} />
                <Text style={styles.dateText}>{meals[0].mealDate} 오늘의 메뉴</Text>
              </View>
            )}
            {mealsLoading ? (
              <ActivityIndicator color={BLUE} style={{ marginTop: 40 }} />
            ) : meals.length === 0 ? (
              <Text style={styles.emptyText}>오늘의 식단 정보가 없습니다.</Text>
            ) : (
              meals.map((meal) => (
                <View key={meal.id} style={styles.card}>
                  <View style={[styles.cardBar, { backgroundColor: BLUE }]} />
                  <View style={styles.cardInner}>
                    <View style={styles.menuHeader}>
                      <Text style={styles.restaurantName}>{meal.cafeteria}</Text>
                      <View style={[styles.mealTimeBadge, { backgroundColor: BLUE_L }]}>
                        <Text style={[styles.mealTimeBadgeText, { color: BLUE }]}>{meal.corner}</Text>
                      </View>
                    </View>
                    {meal.menu.split('\n').filter(Boolean).map((item, idx) => (
                      <View key={idx} style={styles.menuItem}>
                        <Text style={styles.menuKorean}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* 공지사항 탭 */}
        {activeTab === 'NOTICE' && (
          <View style={styles.section}>
            <View style={styles.translateBadge}>
              <Ionicons name="language-outline" size={13} color={BLUE} />
              <Text style={styles.translateBadgeText}>공지사항 제목을 {langName}로 번역했어요</Text>
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

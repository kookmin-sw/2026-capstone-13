// 커뮤니티 화면
import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, RefreshControl, Image, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCommunityStore } from '../../stores/communityStore';
import type { CommunityPost, PostCategory } from '../../types';

const BLUE    = '#3B6FE8';
const BLUE_BG = '#F5F8FF';
const BLUE_L  = '#EEF4FF';
const BORDER  = '#D0E0F8';
const T1      = '#0C1C3C';
const T2      = '#A8C8FA';
const T3      = '#6B9DF0';

type FilterCategory = 'ALL' | PostCategory;

const CATEGORY_FILTERS: { key: FilterCategory; label: string }[] = [
  { key: 'ALL',      label: '전체'    },
  { key: 'INFO',     label: '정보공유' },
  { key: 'QUESTION', label: '질문'    },
  { key: 'CHAT',     label: '잡담'    },
  { key: 'CULTURE',  label: '문화교류' },
];

const CATEGORY_LABEL: Record<PostCategory, string> = {
  INFO: '정보공유', QUESTION: '질문', CHAT: '잡담', CULTURE: '문화교류',
};

const CATEGORY_COLOR: Record<PostCategory, string> = {
  INFO: BLUE, QUESTION: BLUE, CHAT: T3, CULTURE: BLUE,
};

const AVATAR_COLORS = ['#3B6FE8', '#6B9DF0', '#A8C8FA', '#5B8DEF', '#4A7CE0'];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function formatTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function CommunityScreen() {
  const router = useRouter();
  const { posts } = useCommunityStore();
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const filteredPosts = selectedCategory === 'ALL'
    ? posts
    : posts.filter((p) => p.category === selectedCategory);

  const isHot = (item: CommunityPost) => item.likes >= 30;

  const renderPost = useCallback(({ item }: { item: CommunityPost }) => {
    const catColor = CATEGORY_COLOR[item.category];
    const hot = isHot(item);
    return (
      <TouchableOpacity style={s.card} activeOpacity={0.85}>
        {/* 상단 메타 */}
        <View style={s.cardMeta}>
          <View style={[s.catBadge, { backgroundColor: BLUE_L }]}>
            <Text style={[s.catBadgeText, { color: catColor }]}>
              {CATEGORY_LABEL[item.category]}
            </Text>
          </View>
          {item.userType === 'INTERNATIONAL' && (
            <View style={s.intlBadge}>
              <Text style={s.intlBadgeText}>유학생</Text>
            </View>
          )}
          <View style={s.dotSep} />
          <Text style={s.metaTime}>{formatTime(item.createdAt)}</Text>
          {hot && (
            <View style={s.hotBadge}>
              <View style={s.hotDot} />
              <Text style={s.hotBadgeText}>인기</Text>
            </View>
          )}
        </View>

        {/* 제목 */}
        <Text style={s.title} numberOfLines={2}>{item.title}</Text>

        {/* 내용 미리보기 */}
        <Text style={s.content} numberOfLines={2}>{item.content}</Text>

        {/* 이미지 미리보기 */}
        {item.images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.imageScroll}>
            {item.images.map((uri, idx) => (
              <Image key={idx} source={{ uri }} style={s.imageThumbnail} />
            ))}
          </ScrollView>
        )}

        {/* 푸터 */}
        <View style={s.footer}>
          <View style={s.authorRow}>
            <View style={[s.avatar, { backgroundColor: avatarColor(item.author) }]}>
              <Text style={s.avatarText}>{item.author.charAt(0)}</Text>
            </View>
            <Text style={s.authorName}>{item.author}</Text>
          </View>
          <View style={s.reactions}>
            <View style={s.reactionItem}>
              <Ionicons name="heart-outline" size={12} color={T2} />
              <Text style={s.reactionCount}>{item.likes}</Text>
            </View>
            <View style={s.reactionItem}>
              <Ionicons name="chatbubble-outline" size={12} color={T2} />
              <Text style={s.reactionCount}>{item.comments}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <View style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.headerTitle}>커뮤니티</Text>
        <View style={s.headerIcons}>
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="search-outline" size={14} color={T3} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="menu-outline" size={14} color={T3} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 카테고리 필터 */}
      <View style={s.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {CATEGORY_FILTERS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[s.chip, selectedCategory === key && s.chipOn]}
              onPress={() => setSelectedCategory(key)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, selectedCategory === key && s.chipTextOn]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 게시글 목록 */}
      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>💬</Text>
            <Text style={s.emptyTitle}>게시글이 없습니다</Text>
            <Text style={s.emptySub}>첫 번째 글을 작성해보세요!</Text>
          </View>
        }
      />

      {/* FAB */}
      <View style={s.fabWrap}>
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/community-write')}
          activeOpacity={0.88}
        >
          <Ionicons name="add" size={12} color="#fff" />
          <Text style={s.fabText}>글쓰기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLUE_BG },

  // ── Header ──
  header: {
    backgroundColor: BLUE_BG,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 0,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '900', color: T1, letterSpacing: -0.5 },
  headerIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Filter ──
  filterWrap: { paddingTop: 12 },
  filterScroll: { paddingHorizontal: 18, gap: 6 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 5,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER, flexShrink: 0,
  },
  chipOn:      { backgroundColor: BLUE, borderColor: BLUE },
  chipText:    { fontSize: 10, fontWeight: '700', color: T2 },
  chipTextOn:  { color: '#fff' },

  // ── List ──
  list: { padding: 14, paddingBottom: 100 },

  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', padding: 14,
  },

  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 9, fontWeight: '800' },
  intlBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    backgroundColor: '#FFF0E6',
  },
  intlBadgeText: { fontSize: 9, fontWeight: '800', color: '#C45A10' },
  dotSep: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: BORDER,
  },
  metaTime: { fontSize: 9, color: T2, fontWeight: '500' },
  hotBadge: {
    marginLeft: 'auto',
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF3E6', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  hotDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: '#F97316' },
  hotBadgeText:{ fontSize: 9, fontWeight: '800', color: '#C45A10' },

  title:   { fontSize: 13, fontWeight: '800', color: T1, lineHeight: 18, marginBottom: 5, letterSpacing: -0.2 },
  content: { fontSize: 11, color: T3, lineHeight: 16, marginBottom: 10 },

  imageScroll:    { marginBottom: 10 },
  imageThumbnail: { width: 66, height: 66, borderRadius: 8, marginRight: 6 },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  authorRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: {
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText:  { fontSize: 8, fontWeight: '700', color: '#fff' },
  authorName:  { fontSize: 10, color: T3, fontWeight: '600' },
  reactions:   { flexDirection: 'row', gap: 10 },
  reactionItem:{ flexDirection: 'row', alignItems: 'center', gap: 3 },
  reactionCount:{ fontSize: 10, color: T2, fontWeight: '600' },

  // ── Empty ──
  empty:      { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T1, marginBottom: 4 },
  emptySub:   { fontSize: 14, color: T2 },

  // ── FAB ──
  fabWrap: {
    position: 'absolute', bottom: 24, right: 16,
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BLUE,
    borderRadius: 24, paddingHorizontal: 18, paddingVertical: 11,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});

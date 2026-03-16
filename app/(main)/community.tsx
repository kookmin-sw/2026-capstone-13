// 커뮤니티 화면
import { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useCommunityStore } from '../../stores/communityStore';
import type { CommunityPost, PostCategory } from '../../types';

const PRIMARY = '#4F46E5';

type FilterCategory = 'ALL' | PostCategory;

const CATEGORY_FILTERS: { key: FilterCategory; label: string }[] = [
  { key: 'ALL',      label: '전체' },
  { key: 'INFO',     label: '정보공유' },
  { key: 'QUESTION', label: '질문' },
  { key: 'CHAT',     label: '잡담' },
  { key: 'CULTURE',  label: '문화교류' },
];

const CATEGORY_LABEL: Record<FilterCategory, string> = {
  ALL: '전체', INFO: '정보공유', QUESTION: '질문', CHAT: '잡담', CULTURE: '문화교류',
};

const CATEGORY_COLOR: Record<FilterCategory, string> = {
  ALL: '#9CA3AF', INFO: '#3B82F6', QUESTION: '#F59E0B', CHAT: '#10B981', CULTURE: '#8B5CF6',
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

  const renderPost = useCallback(({ item }: { item: CommunityPost }) => (
    <TouchableOpacity style={styles.postCard} activeOpacity={0.85}>
      <View style={styles.postHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLOR[item.category] + '22' }]}>
          <Text style={[styles.categoryBadgeText, { color: CATEGORY_COLOR[item.category] }]}>
            {CATEGORY_LABEL[item.category]}
          </Text>
        </View>
        {item.userType === 'INTERNATIONAL' && (
          <View style={styles.internationalBadge}>
            <Text style={styles.internationalBadgeText}>유학생</Text>
          </View>
        )}
      </View>
      <Text style={styles.postTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.postContent} numberOfLines={2}>{item.content}</Text>

      {/* 첨부 사진 미리보기 */}
      {item.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {item.images.map((uri, idx) => (
            <Image key={idx} source={{ uri }} style={styles.imageThumbnail} />
          ))}
        </ScrollView>
      )}

      <View style={styles.postFooter}>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.author}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
        <View style={styles.reactions}>
          <View style={styles.reactionItem}>
            <Ionicons name="heart-outline" size={13} color="#9CA3AF" />
            <Text style={styles.reactionCount}>{item.likes}</Text>
          </View>
          <View style={styles.reactionItem}>
            <Ionicons name="chatbubble-outline" size={13} color="#9CA3AF" />
            <Text style={styles.reactionCount}>{item.comments}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ), []);

  return (
    <View style={styles.container}>
      {/* 필터 칩 */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORY_FILTERS.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.chip, selectedCategory === cat.key && styles.chipActive]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={[styles.chipText, selectedCategory === cat.key && styles.chipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>게시글이 없습니다</Text>
            <Text style={styles.emptySubtext}>첫 번째 글을 작성해보세요!</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/community-write')} activeOpacity={0.88}>
        <View style={styles.fabPlus}><Text style={styles.fabPlusText}>+</Text></View>
        <Text style={styles.fabText}>글쓰기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79,70,229,0.1)',
  },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 7 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(79,70,229,0.1)',
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  list: { paddingBottom: 100, backgroundColor: '#FFFFFF' },
  separator: { height: 1, backgroundColor: 'rgba(79,70,229,0.06)', marginHorizontal: 16 },

  postCard: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  postHeader: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryBadgeText: { fontSize: 11, fontWeight: '700' },
  internationalBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  internationalBadgeText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  postTitle: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  postContent: { fontSize: 13, color: '#6B7280', lineHeight: 19 },

  imageScroll: { marginTop: 4 },
  imageThumbnail: { width: 72, height: 72, borderRadius: 8, marginRight: 6 },

  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  authorName: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  dot: { fontSize: 12, color: '#9CA3AF' },
  time: { fontSize: 12, color: '#9CA3AF' },
  reactions: { flexDirection: 'row', gap: 10 },
  reactionItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reactionCount: { fontSize: 12, color: '#9CA3AF' },

  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF' },

  fab: {
    position: 'absolute', bottom: 24, right: 16,
    backgroundColor: PRIMARY, flexDirection: 'row', alignItems: 'center',
    gap: 7, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 28,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 24, elevation: 8,
  },
  fabPlus: {
    width: 22, height: 22, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  fabPlusText: { fontSize: 16, color: '#FFFFFF', fontWeight: '300', lineHeight: 20 },
  fabText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
});

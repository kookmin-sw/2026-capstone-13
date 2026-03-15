// 커뮤니티 화면 - 유학생 & 한국인 자유게시판
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

type PostCategory = 'ALL' | 'INFO' | 'QUESTION' | 'CHAT' | 'CULTURE';

const CATEGORY_FILTERS: { key: PostCategory; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'INFO', label: '📢 정보공유' },
  { key: 'QUESTION', label: '❓ 질문' },
  { key: 'CHAT', label: '💬 잡담' },
  { key: 'CULTURE', label: '🌏 문화교류' },
];

const CATEGORY_LABEL: Record<PostCategory, string> = {
  ALL: '전체',
  INFO: '정보공유',
  QUESTION: '질문',
  CHAT: '잡담',
  CULTURE: '문화교류',
};

const CATEGORY_COLOR: Record<PostCategory, string> = {
  ALL: Colors.textLight,
  INFO: Colors.info,
  QUESTION: Colors.warning,
  CHAT: Colors.success,
  CULTURE: '#8B5CF6',
};

interface CommunityPost {
  id: number;
  category: PostCategory;
  title: string;
  content: string;
  author: string;
  university: string;
  userType: 'INTERNATIONAL' | 'KOREAN';
  likes: number;
  comments: number;
  createdAt: string;
}

// 임시 목업 데이터
const MOCK_POSTS: CommunityPost[] = [
  {
    id: 1,
    category: 'INFO',
    title: '외국인 학생 건강보험 가입 방법 총정리',
    content: '많이들 모르는 외국인 유학생 건강보험 가입 절차를 정리해봤어요. 국민건강보험 홈페이지에서...',
    author: '김민준',
    university: '서울대학교',
    userType: 'KOREAN',
    likes: 34,
    comments: 12,
    createdAt: '2026-03-15T08:00:00',
  },
  {
    id: 2,
    category: 'QUESTION',
    title: '편의점 알바 지원할 때 외국인도 가능한가요?',
    content: 'D-2 비자로 재학 중인데, 주 20시간 이내로 편의점 알바를 하려고 합니다. 서류는 어떻게...',
    author: '리웨이',
    university: '한양대학교',
    userType: 'INTERNATIONAL',
    likes: 15,
    comments: 8,
    createdAt: '2026-03-15T09:30:00',
  },
  {
    id: 3,
    category: 'CULTURE',
    title: '한국 추석 문화가 너무 신기해요!',
    content: '지난 추석에 친구 가족이랑 같이 지냈는데 차례상 차리고 성묘 가는 문화가 정말 인상적이었어요. 한국 전통 문화...',
    author: '아흐메드',
    university: '연세대학교',
    userType: 'INTERNATIONAL',
    likes: 42,
    comments: 23,
    createdAt: '2026-03-14T14:00:00',
  },
  {
    id: 4,
    category: 'CHAT',
    title: '오늘 학식 메뉴 추천해주세요 ㅋㅋ',
    content: '성균관대 학식 처음 먹어보는데 뭐가 맛있어요? 한국 밥은 다 맛있어 보여서 고르기가 어렵네요 😂',
    author: '마리아',
    university: '성균관대학교',
    userType: 'INTERNATIONAL',
    likes: 7,
    comments: 19,
    createdAt: '2026-03-15T11:20:00',
  },
  {
    id: 5,
    category: 'INFO',
    title: '서울 외국인 유학생 무료 한국어 수업 정보',
    content: '서울시에서 운영하는 무료 한국어 수업 링크 공유해요. 초급/중급/고급 반 모두 있고 온라인도...',
    author: '이서연',
    university: '고려대학교',
    userType: 'KOREAN',
    likes: 28,
    comments: 6,
    createdAt: '2026-03-14T10:00:00',
  },
  {
    id: 6,
    category: 'QUESTION',
    title: '기숙사 신청 경쟁률이 너무 높아요',
    content: '1지망 탈락했는데 2지망도 안될 것 같아서요. 학교 근처 고시원이나 쉐어하우스 어떻게 구하는지...',
    author: '천밍',
    university: '고려대학교',
    userType: 'INTERNATIONAL',
    likes: 11,
    comments: 14,
    createdAt: '2026-03-13T16:00:00',
  },
];

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
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const filteredPosts = selectedCategory === 'ALL'
    ? MOCK_POSTS
    : MOCK_POSTS.filter((p) => p.category === selectedCategory);

  const renderPost = useCallback(({ item }: { item: CommunityPost }) => (
    <TouchableOpacity style={styles.postCard}>
      {/* 카테고리 뱃지 + 제목 */}
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

      {/* 작성자 정보 + 반응 */}
      <View style={styles.postFooter}>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.author}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.university}>{item.university}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
        <View style={styles.reactions}>
          <View style={styles.reactionItem}>
            <Ionicons name="heart-outline" size={13} color={Colors.textLight} />
            <Text style={styles.reactionCount}>{item.likes}</Text>
          </View>
          <View style={styles.reactionItem}>
            <Ionicons name="chatbubble-outline" size={13} color={Colors.textLight} />
            <Text style={styles.reactionCount}>{item.comments}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ), []);

  return (
    <View style={styles.container}>
      {/* 카테고리 필터 탭 */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORY_FILTERS.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.filterTab,
                selectedCategory === cat.key && styles.filterTabActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={[
                styles.filterTabText,
                selectedCategory === cat.key && styles.filterTabTextActive,
              ]}>
                {cat.label}
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
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>게시글이 없습니다</Text>
            <Text style={styles.emptySubtext}>첫 번째 글을 작성해보세요!</Text>
          </View>
        }
      />

      {/* 글쓰기 FAB */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="pencil" size={20} color={Colors.textWhite} />
        <Text style={styles.fabText}>글쓰기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // 카테고리 필터
  filterContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.textWhite,
  },

  // 리스트
  list: {
    paddingBottom: 100,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
  },

  // 게시글 카드
  postCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    gap: 6,
  },
  postHeader: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 2,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  internationalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
  },
  internationalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  postContent: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dot: {
    fontSize: 12,
    color: Colors.textLight,
  },
  university: {
    fontSize: 12,
    color: Colors.textLight,
  },
  time: {
    fontSize: 12,
    color: Colors.textLight,
  },
  reactions: {
    flexDirection: 'row',
    gap: 10,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reactionCount: {
    fontSize: 12,
    color: Colors.textLight,
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
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 30,
    gap: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  fabText: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
});

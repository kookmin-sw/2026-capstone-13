// 홈 화면 - 도움 요청 피드 (당근마켓 스타일)
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, CategoryLabels, MethodLabels } from '../../constants/colors';
import { getHelpRequests } from '../../services/helpService';
import type { HelpCategory, HelpRequest } from '../../types';

// 카테고리 필터 탭 정의
const CATEGORY_FILTERS: { key: HelpCategory | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'BANK', label: '🏦 은행' },
  { key: 'HOSPITAL', label: '🏥 병원' },
  { key: 'SCHOOL', label: '🏫 학교행정' },
  { key: 'DAILY', label: '🏠 생활' },
  { key: 'OTHER', label: '📌 기타' },
];

// 카테고리별 이모지 (카드 썸네일 대용)
const CATEGORY_EMOJI: Record<HelpCategory, string> = {
  BANK: '🏦',
  HOSPITAL: '🏥',
  SCHOOL: '🏫',
  DAILY: '🏠',
  OTHER: '📌',
};

// 카테고리별 배경색
const CATEGORY_BG: Record<HelpCategory, string> = {
  BANK: '#FEF3C7',
  HOSPITAL: '#FEE2E2',
  SCHOOL: '#EDE9FE',
  DAILY: '#D1FAE5',
  OTHER: '#F3F4F6',
};

// 임시 목업 데이터 (백엔드 연결 전 UI 확인용)
const MOCK_REQUESTS: HelpRequest[] = [
  {
    id: 1,
    title: '은행 계좌 개설 도와주실 분 구해요',
    description: '신한은행에서 외국인 계좌 개설하려는데 서류 준비부터 같이 가주실 분 있나요?',
    category: 'BANK',
    helpMethod: 'OFFLINE',
    status: 'WAITING',
    requester: { id: 1, email: 'li@test.com', nickname: '리웨이', userType: 'INTERNATIONAL', university: '한양대학교', rating: 4.5, helpCount: 2, createdAt: '2026-03-10' },
    createdAt: '2026-03-15T09:00:00',
    updatedAt: '2026-03-15T09:00:00',
  },
  {
    id: 2,
    title: '병원 예약 전화 통역 부탁드려요',
    description: '내과 예약 전화해야 하는데 한국어가 아직 서툴러서 통역 좀 도와주실 수 있나요?',
    category: 'HOSPITAL',
    helpMethod: 'CHAT',
    status: 'WAITING',
    requester: { id: 2, email: 'ahmed@test.com', nickname: '아흐메드', userType: 'INTERNATIONAL', university: '연세대학교', rating: 4.8, helpCount: 0, createdAt: '2026-03-12' },
    createdAt: '2026-03-15T10:30:00',
    updatedAt: '2026-03-15T10:30:00',
  },
  {
    id: 3,
    title: '수강신청 방법 알려주실 분!',
    description: '포탈에서 수강신청하는 방법을 잘 모르겠어요. 영상통화로 같이 해주실 수 있나요?',
    category: 'SCHOOL',
    helpMethod: 'VIDEO_CALL',
    status: 'WAITING',
    requester: { id: 3, email: 'maria@test.com', nickname: '마리아', userType: 'INTERNATIONAL', university: '성균관대학교', rating: 5.0, helpCount: 1, createdAt: '2026-03-11' },
    createdAt: '2026-03-15T11:00:00',
    updatedAt: '2026-03-15T11:00:00',
  },
  {
    id: 4,
    title: '주민등록증 발급 절차 안내 부탁해요',
    description: '외국인 등록증 발급받으러 출입국사무소 가야 하는데 어떻게 하는지 알려주실 분!',
    category: 'DAILY',
    helpMethod: 'CHAT',
    status: 'MATCHED',
    requester: { id: 4, email: 'chen@test.com', nickname: '천밍', userType: 'INTERNATIONAL', university: '고려대학교', rating: 4.2, helpCount: 3, createdAt: '2026-03-08' },
    createdAt: '2026-03-14T15:00:00',
    updatedAt: '2026-03-14T16:00:00',
  },
];

// 시간 포맷 (예: "방금 전", "3시간 전")
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
  const [requests, setRequests] = useState<HelpRequest[]>(MOCK_REQUESTS);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | 'ALL'>('ALL');

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

  const filteredRequests = selectedCategory === 'ALL'
    ? requests
    : requests.filter((r) => r.category === selectedCategory);

  const renderItem = useCallback(({ item }: { item: HelpRequest }) => (
    <TouchableOpacity style={styles.card}>
      {/* 왼쪽 썸네일 */}
      <View style={[styles.thumbnail, { backgroundColor: CATEGORY_BG[item.category] }]}>
        <Text style={styles.thumbnailEmoji}>{CATEGORY_EMOJI[item.category]}</Text>
      </View>

      {/* 오른쪽 내용 */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>{item.requester.university}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{formatTime(item.createdAt)}</Text>
        </View>
        <View style={styles.cardTags}>
          <View style={styles.methodTag}>
            <Text style={styles.methodTagText}>{MethodLabels[item.helpMethod]}</Text>
          </View>
          {item.status === 'MATCHED' && (
            <View style={styles.matchedTag}>
              <Text style={styles.matchedTagText}>매칭완료</Text>
            </View>
          )}
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

      {/* 도움 요청 피드 */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
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

      {/* 도움 요청하기 FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(main)/write')}
      >
        <Text style={styles.fabText}>+ 도움요청하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginLeft: 16,
  },

  // 카드 (당근마켓 스타일)
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailEmoji: {
    fontSize: 36,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  metaDot: {
    fontSize: 12,
    color: Colors.textLight,
  },
  cardTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  methodTag: {
    backgroundColor: Colors.divider,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  methodTagText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  matchedTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchedTagText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '700',
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
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

// 한국인 유저 - 내 도움 내역 화면
import { useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { s } from '../utils/scale';
import { useHelpHistoryStore, type HelpHistoryItem } from '../stores/helpHistoryStore';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import type { HelpCategory, HelpMethod, RequestStatus } from '../types';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';

const CATEGORY_EMOJI: Record<HelpCategory, string> = {
  BANK: '🏦', HOSPITAL: '🏥', SCHOOL: '🏫', DAILY: '🏠', OTHER: '📌',
};
const CATEGORY_LABEL: Record<HelpCategory, string> = {
  BANK: '은행', HOSPITAL: '병원', SCHOOL: '학교', DAILY: '생활', OTHER: '기타',
};
const CATEGORY_BG: Record<HelpCategory, string> = {
  BANK: '#FEF3C7', HOSPITAL: '#FEE2E2', SCHOOL: '#EDE9FE', DAILY: '#D1FAE5', OTHER: '#F3F4F6',
};
const METHOD_BADGE: Record<HelpMethod, { bg: string; color: string; dot: string; label: string }> = {
  CHAT:       { bg: '#EEF2FF', color: PRIMARY,   dot: PRIMARY,   label: '채팅' },
  VIDEO_CALL: { bg: '#F5F3FF', color: '#7C3AED', dot: '#7C3AED', label: '영상통화' },
  OFFLINE:    { bg: '#FFFBEB', color: '#D97706', dot: '#D97706', label: '오프라인' },
};

const STATUS_CONFIG = {
  WAITING:     { label: '모집중',   bg: '#D1FAE5', color: '#065F46', icon: 'time-outline' },
  MATCHED:     { label: '대기중',   bg: PRIMARY_LIGHT, color: '#3730A3', icon: 'checkmark-circle-outline' },
  IN_PROGRESS: { label: '진행중',   bg: '#FEF3C7', color: '#92400E', icon: 'sync-outline' },
  COMPLETED:   { label: '도움 완료', bg: '#D1FAE5', color: '#065F46', icon: 'checkmark-circle' },
  CANCELLED:   { label: '취소됨',   bg: '#FEE2E2', color: '#991B1B', icon: 'close-circle-outline' },
} as const;

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function MyHelpHistoryScreen() {
  const router = useRouter();
  const { helpHistory, isLoading, fetchHelpHistory } = useHelpHistoryStore();
  const { hasLeft } = useChatStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchHelpHistory();
  }, []);

  // MATCHED는 항상 제외, IN_PROGRESS는 나간 방 제외, COMPLETED/CANCELLED는 항상 표시
  const visibleHistory = helpHistory.filter((h) => {
    if (h.status === 'MATCHED') return false;
    if (h.status === 'COMPLETED' || h.status === 'CANCELLED') return true;
    return !hasLeft(h.id, user?.id ?? 0);
  });

  const completedCount  = visibleHistory.filter((h) => h.status === 'COMPLETED').length;
  const inProgressCount = visibleHistory.filter((h) => h.status === 'IN_PROGRESS').length;

  const renderItem = useCallback(({ item }: { item: HelpHistoryItem }) => {
    const method = METHOD_BADGE[item.helpMethod];
    const status = STATUS_CONFIG[item.status as RequestStatus];

    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/request-detail', params: { id: item.id } })} activeOpacity={0.85}>
        {/* 카테고리 아이콘 */}
        <View style={[styles.cardIcon, { backgroundColor: CATEGORY_BG[item.category] }]}>
          <Text style={styles.cardIconEmoji}>{CATEGORY_EMOJI[item.category]}</Text>
        </View>

        {/* 내용 */}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.categoryLabel}>{CATEGORY_LABEL[item.category]}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon as never} size={12} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>

          {/* 요청자 */}
          <View style={styles.requesterRow}>
            <Ionicons name="person-outline" size={12} color="#9CA3AF" />
            <Text style={styles.requesterText}>{item.requester.nickname}</Text>
          </View>

          <View style={styles.cardMeta}>
            <Text style={styles.timeText}>{formatTime(item.helpedAt)}</Text>
            <View style={[styles.methodBadge, { backgroundColor: method.bg }]}>
              <View style={[styles.methodDot, { backgroundColor: method.dot }]} />
              <Text style={[styles.methodText, { color: method.color }]}>{method.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [router]);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 도움 내역</Text>
        <View style={styles.backBtn} />
      </View>

      {/* 요약 */}
      {visibleHistory.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryText}>전체 {visibleHistory.length}건</Text>
          </View>
          <View style={styles.summaryBadge}>
            <View style={styles.summaryDot} />
            <Text style={styles.summaryText}>진행중 {inProgressCount}건</Text>
          </View>
          <View style={styles.summaryBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
            <Text style={styles.summaryText}>완료 {completedCount}건</Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : null}

      <FlatList
        data={visibleHistory}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={isLoading ? null : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤝</Text>
            <Text style={styles.emptyText}>아직 도움을 준 내역이 없어요</Text>
            <Text style={styles.emptySubtext}>유학생들의 도움 요청에 응해보세요!</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F8' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingTop: Platform.OS === 'ios' ? 60 : s(20),
    paddingBottom: s(14),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: s(1), borderBottomColor: 'rgba(79,70,229,0.1)',
  },
  backBtn: { width: s(36), alignItems: 'center' },
  headerTitle: { fontSize: s(17), fontWeight: '700', color: '#1E1B4B' },

  summaryRow: {
    flexDirection: 'row', gap: s(8),
    paddingHorizontal: s(16), paddingVertical: s(12),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: s(1), borderBottomColor: 'rgba(79,70,229,0.06)',
  },
  summaryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: s(5),
    backgroundColor: PRIMARY_LIGHT, paddingHorizontal: s(10), paddingVertical: s(5), borderRadius: s(20),
  },
  summaryText: { fontSize: s(12), color: PRIMARY, fontWeight: '600' },
  summaryDot: { width: s(6), height: s(6), borderRadius: s(3), backgroundColor: '#10B981' },

  list: { padding: s(14), gap: s(10), paddingBottom: s(40) },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: s(16), padding: s(14),
    flexDirection: 'row', gap: s(12), alignItems: 'flex-start',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.07, shadowRadius: s(10), elevation: 2,
    borderWidth: s(1), borderColor: 'rgba(79,70,229,0.06)',
  },
  cardIcon: {
    width: s(52), height: s(52), borderRadius: s(14),
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  cardIconEmoji: { fontSize: 24 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: s(4),
  },
  categoryLabel: { fontSize: s(11), fontWeight: '600', color: '#9CA3AF' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: s(3),
    paddingHorizontal: s(8), paddingVertical: s(3), borderRadius: s(20),
  },
  statusText: { fontSize: s(11), fontWeight: '700' },

  cardTitle: { fontSize: s(14), fontWeight: '700', color: '#1E1B4B', lineHeight: s(20), marginBottom: s(3) },
  cardDesc: { fontSize: s(12), color: '#6B7280', lineHeight: s(17), marginBottom: s(6) },

  requesterRow: { flexDirection: 'row', alignItems: 'center', gap: s(4), marginBottom: s(6) },
  requesterText: { fontSize: s(11), color: '#9CA3AF' },

  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { fontSize: s(11), color: '#9CA3AF' },
  methodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    paddingHorizontal: s(9), paddingVertical: s(4), borderRadius: s(8),
  },
  methodDot: { width: s(6), height: s(6), borderRadius: s(3) },
  methodText: { fontSize: s(11), fontWeight: '600' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: s(60) },

  emptyState: { alignItems: 'center', paddingVertical: s(80) },
  emptyEmoji: { fontSize: 48, marginBottom: s(16) },
  emptyText: { fontSize: s(16), fontWeight: '700', color: '#6B7280', marginBottom: s(6) },
  emptySubtext: { fontSize: s(14), color: '#9CA3AF' },
});

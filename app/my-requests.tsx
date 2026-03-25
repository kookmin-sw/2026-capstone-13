// 내 도움 요청 목록 화면
import { useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHelpRequestStore } from '../stores/helpRequestStore';
import type { HelpRequest, HelpCategory, HelpMethod } from '../types';

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
  WAITING:     { label: '모집중',   bg: '#D1FAE5', color: '#065F46' },
  MATCHED:     { label: '대기중',   bg: PRIMARY_LIGHT, color: '#3730A3' },
  IN_PROGRESS: { label: '진행중',   bg: '#FEF3C7', color: '#92400E' },
  COMPLETED:   { label: '완료',     bg: '#F3F4F6', color: '#6B7280' },
  CANCELLED:   { label: '취소됨',   bg: '#FEE2E2', color: '#991B1B' },
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

export default function MyRequestsScreen() {
  const router = useRouter();
  const { myRequests, isLoading, fetchMyRequests } = useHelpRequestStore();

  useEffect(() => { fetchMyRequests(); }, []);

  const renderItem = useCallback(({ item }: { item: HelpRequest }) => {
    const method = METHOD_BADGE[item.helpMethod];
    const status = STATUS_CONFIG[item.status];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/request-detail', params: { id: item.id } })}
        activeOpacity={0.85}
      >
        {/* 카테고리 아이콘 */}
        <View style={[styles.cardIcon, { backgroundColor: CATEGORY_BG[item.category] }]}>
          <Text style={styles.cardIconEmoji}>{CATEGORY_EMOJI[item.category]}</Text>
        </View>

        {/* 내용 */}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.categoryLabel}>{CATEGORY_LABEL[item.category]}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
            <View style={[styles.methodBadge, { backgroundColor: method.bg }]}>
              <View style={[styles.methodDot, { backgroundColor: method.dot }]} />
              <Text style={[styles.methodText, { color: method.color }]}>{method.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 도움 요청</Text>
        <View style={styles.backBtn} />
      </View>

      {/* 요약 배지 */}
      {myRequests.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryText}>전체 {myRequests.length}건</Text>
          </View>
          <View style={styles.summaryBadge}>
            <View style={styles.summaryDot} />
            <Text style={styles.summaryText}>
              모집중 {myRequests.filter((r) => r.status === 'WAITING').length}건
            </Text>
          </View>
          <View style={styles.summaryBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
            <Text style={styles.summaryText}>
              완료 {myRequests.filter((r) => r.status === 'COMPLETED').length}건
            </Text>
          </View>
        </View>
      )}

      {isLoading && myRequests.length === 0 && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      )}
      <FlatList
        data={myRequests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>아직 작성한 도움 요청이 없어요</Text>
            <Text style={styles.emptySubtext}>홈 화면에서 도움 요청을 작성해보세요!</Text>
            <TouchableOpacity
              style={styles.goWriteBtn}
              onPress={() => { router.back(); router.push('/(main)/write'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.goWriteText}>도움 요청하기</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F8' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: 'rgba(79,70,229,0.1)',
  },
  backBtn: { width: 36, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B4B' },

  summaryRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: 'rgba(79,70,229,0.06)',
  },
  summaryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  summaryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  summaryText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  list: { padding: 14, gap: 10, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(79,70,229,0.06)',
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  cardIconEmoji: { fontSize: 24 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  categoryLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B4B', lineHeight: 20, marginBottom: 3 },
  cardDesc: { fontSize: 12, color: '#6B7280', lineHeight: 17, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { fontSize: 11, color: '#9CA3AF' },
  methodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  methodDot: { width: 6, height: 6, borderRadius: 3 },
  methodText: { fontSize: 11, fontWeight: '600' },

  loadingWrap: { paddingVertical: 60, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginBottom: 24 },
  goWriteBtn: {
    backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  goWriteText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

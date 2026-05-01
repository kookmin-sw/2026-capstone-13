// 내 도움 요청 목록 화면
import { useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { s } from '../utils/scale';
import { useHelpRequestStore } from '../stores/helpRequestStore';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
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
  const { t } = useTranslation();
  const { myRequests, isLoading, fetchMyRequests } = useHelpRequestStore();
  const { hasLeft } = useChatStore();
  const { user } = useAuthStore();

  useEffect(() => { fetchMyRequests(); }, []);

  // 나간 채팅방은 WAITING으로 표시
  const displayRequests = myRequests.map(r => {
    if ((r.status === 'MATCHED' || r.status === 'IN_PROGRESS') && hasLeft(r.id, user?.id ?? 0)) {
      return { ...r, status: 'WAITING' as HelpRequest['status'] };
    }
    return r;
  });

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
        <Text style={styles.headerTitle}>{t('myRequests.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      {/* 요약 배지 */}
      {displayRequests.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryText}>{t('myRequests.total', { count: displayRequests.length })}</Text>
          </View>
          <View style={styles.summaryBadge}>
            <View style={styles.summaryDot} />
            <Text style={styles.summaryText}>
              {t('myRequests.active', { count: displayRequests.filter((r) => r.status === 'WAITING' || r.status === 'MATCHED' || r.status === 'IN_PROGRESS').length })}
            </Text>
          </View>
          <View style={styles.summaryBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
            <Text style={styles.summaryText}>
              {t('myRequests.completed', { count: displayRequests.filter((r) => r.status === 'COMPLETED').length })}
            </Text>
          </View>
        </View>
      )}

      {isLoading && displayRequests.length === 0 && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      )}
      <FlatList
        data={displayRequests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>{t('myRequests.empty')}</Text>
            <Text style={styles.emptySubtext}>{t('myRequests.emptyDesc')}</Text>
            <TouchableOpacity
              style={styles.goWriteBtn}
              onPress={() => { router.back(); router.push('/(main)/write'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.goWriteText}>{t('myRequests.goWrite')}</Text>
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
  summaryDot: { width: s(6), height: s(6), borderRadius: s(3), backgroundColor: '#10B981' },
  summaryText: { fontSize: s(12), color: PRIMARY, fontWeight: '600' },

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
  statusBadge: { paddingHorizontal: s(8), paddingVertical: s(3), borderRadius: s(20) },
  statusText: { fontSize: s(11), fontWeight: '700' },
  cardTitle: { fontSize: s(14), fontWeight: '700', color: '#1E1B4B', lineHeight: s(20), marginBottom: s(3) },
  cardDesc: { fontSize: s(12), color: '#6B7280', lineHeight: s(17), marginBottom: s(8) },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { fontSize: s(11), color: '#9CA3AF' },
  methodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    paddingHorizontal: s(9), paddingVertical: s(4), borderRadius: s(8),
  },
  methodDot: { width: s(6), height: s(6), borderRadius: s(3) },
  methodText: { fontSize: s(11), fontWeight: '600' },

  loadingWrap: { paddingVertical: s(60), alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: s(80) },
  emptyEmoji: { fontSize: 48, marginBottom: s(16) },
  emptyText: { fontSize: s(16), fontWeight: '700', color: '#6B7280', marginBottom: s(6) },
  emptySubtext: { fontSize: s(14), color: '#9CA3AF', marginBottom: s(24) },
  goWriteBtn: {
    backgroundColor: PRIMARY, paddingHorizontal: s(24), paddingVertical: s(12), borderRadius: s(24),
  },
  goWriteText: { fontSize: s(14), fontWeight: '700', color: '#FFFFFF' },
});

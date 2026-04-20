// 한국인 유저 - 내 도움 내역 화면
import React, { useCallback, useEffect } from 'react';
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
import type { HelpCategory, HelpMethod } from '../types';

const SKY = '#3B6FE8';
const SKY_DARK = '#3B6FE8';
const SKY_LIGHT = '#EEF4FF';
const SKY_BORDER = 'rgba(59,111,232,0.12)';

const CATEGORY_LABEL: Record<HelpCategory, string> = {
  BANK: '행정', HOSPITAL: '병원', SCHOOL: '학업', DAILY: '생활', OTHER: '기타',
};
const CATEGORY_ICON: Record<HelpCategory, { name: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  BANK:     { name: 'business-outline',                   color: '#3B6FE8', bg: '#EEF4FF' },
  HOSPITAL: { name: 'medkit-outline',                     color: '#EF4444', bg: '#FEE2E2' },
  SCHOOL:   { name: 'book-outline',                       color: '#8B5CF6', bg: '#EDE9FE' },
  DAILY:    { name: 'home-outline',                       color: '#F97316', bg: '#FFF3E0' },
  OTHER:    { name: 'ellipsis-horizontal-circle-outline', color: '#6B7280', bg: '#F3F4F6' },
};
const METHOD_LABEL: Record<HelpMethod, string> = {
  CHAT: '채팅', VIDEO_CALL: '영상통화', OFFLINE: '오프라인',
};

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

  // 완료된 항목만 표시
  const completedHistory = helpHistory.filter((h) => h.status === 'COMPLETED');

  const renderItem = useCallback(({ item }: { item: HelpHistoryItem }) => {
    const catIcon = CATEGORY_ICON[item.category];
    return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/request-detail', params: { id: item.id } })}
      activeOpacity={0.8}
    >
      {/* 카테고리 아이콘 */}
      <View style={[styles.iconWrap, { backgroundColor: catIcon.bg }]}>
        <Ionicons name={catIcon.name} size={s(18)} color={catIcon.color} />
      </View>

      {/* 내용 */}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.methodLabel}>{METHOD_LABEL[item.helpMethod]}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.requesterText}>{item.requester.nickname}</Text>
          <Text style={styles.timeText}>{formatTime(item.helpedAt)}</Text>
        </View>
      </View>

      {/* 완료 체크 */}
      <Ionicons name="checkmark-circle" size={s(20)} color={SKY} />
    </TouchableOpacity>
  );}, [router]);

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


      {!isLoading && completedHistory.length > 0 && (
        <Text style={styles.countLabel}>완료 {completedHistory.length}건</Text>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={SKY} />
        </View>
      ) : null}

      <FlatList
        data={completedHistory}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={isLoading ? null : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤝</Text>
            <Text style={styles.emptyText}>완료된 도움 내역이 없어요</Text>
            <Text style={styles.emptySubtext}>유학생들의 도움 요청에 응해보세요!</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingTop: Platform.OS === 'ios' ? 60 : s(20),
    paddingBottom: s(14),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: s(1), borderBottomColor: SKY_BORDER,
  },
  backBtn: { width: s(36), alignItems: 'center' },
  headerTitle: { fontSize: s(17), fontWeight: '700', color: '#1E1B4B' },

  countLabel: { fontSize: s(16), fontWeight: '700', color: '#1E1B4B', paddingHorizontal: s(24), paddingTop: s(16), paddingBottom: s(4) },

  list: { padding: s(16), gap: s(10), paddingBottom: s(40) },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: s(14),
    paddingHorizontal: s(14),
    paddingVertical: s(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(11),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.08,
    shadowRadius: s(8),
    elevation: 3,
  },
  iconWrap: {
    width: s(38), height: s(38), borderRadius: s(11),
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },

  cardBody: { flex: 1, minWidth: 0, gap: s(3) },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s(8) },
  cardTitle: { flex: 1, fontSize: s(14), fontWeight: '700', color: '#1E1B4B' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  methodLabel: {
    fontSize: s(10), fontWeight: '600', color: SKY_DARK,
    backgroundColor: SKY_LIGHT, paddingHorizontal: s(7), paddingVertical: s(2), borderRadius: s(6),
  },
  timeText: { fontSize: s(11), color: '#B0BEC5' },
  requesterText: { fontSize: s(11), color: '#9CA3AF' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: s(60) },

  emptyState: { alignItems: 'center', paddingVertical: s(80) },
  emptyEmoji: { fontSize: 48, marginBottom: s(16) },
  emptyText: { fontSize: s(16), fontWeight: '700', color: '#6B7280', marginBottom: s(6) },
  emptySubtext: { fontSize: s(14), color: '#9CA3AF' },
});

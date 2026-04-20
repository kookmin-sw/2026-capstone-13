// 알림 화면 - 인스타그램 스타일
import { useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActivityIndicator, SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { s as sc } from '../utils/scale';
import { useNotificationStore } from '../stores/notificationStore';
import type { AppNotification } from '../types';

const BLUE    = '#3B6FE8';
const BLUE_BG = '#F5F8FF';
const BLUE_L  = '#EEF4FF';
const BORDER  = '#D0E0F8';
const T1      = '#0C1C3C';
const T2      = '#6B7280';
const T3      = '#6B9DF0';
const ORANGE  = '#F97316';
const WHITE   = '#FFFFFF';

function formatTime(createdAt: string): string {
  const utc = createdAt.includes('Z') || createdAt.includes('+') ? createdAt : createdAt + 'Z';
  const diff = Date.now() - new Date(utc).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function getAgeInHours(createdAt: string): number {
  const utc = createdAt.includes('Z') || createdAt.includes('+') ? createdAt : createdAt + 'Z';
  return (Date.now() - new Date(utc).getTime()) / 3600000;
}

function notifIcon(type: AppNotification['type']): { name: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string } {
  switch (type) {
    case 'COMMENT':              return { name: 'chatbubble',        color: BLUE,      bg: BLUE_L };
    case 'REPLY':                return { name: 'chatbubbles',       color: T3,        bg: BLUE_L };
    case 'LIKE':                 return { name: 'heart',             color: '#EF4444', bg: '#FEE2E2' };
    case 'HELP_OFFER':           return { name: 'hand-left',         color: '#10B981', bg: '#D1FAE5' };
    case 'HELP_COMPLETED':       return { name: 'checkmark-circle',  color: '#10B981', bg: '#D1FAE5' };
    case 'REVIEW_REQUEST':       return { name: 'star-outline',      color: ORANGE,    bg: '#FFF7ED' };
    case 'REVIEW_RECEIVED':      return { name: 'star',              color: ORANGE,    bg: '#FFF7ED' };
    case 'STUDENT_ID_APPROVED':  return { name: 'shield-checkmark',  color: '#10B981', bg: '#D1FAE5' };
    case 'STUDENT_ID_REJECTED':  return { name: 'shield',            color: '#EF4444', bg: '#FEE2E2' };
    default:                     return { name: 'notifications',     color: BLUE,      bg: BLUE_L };
  }
}

// 알림 타입별 액션 버튼 표시 여부
function getActionButton(type: AppNotification['type']): { label: string; style: 'primary' | 'secondary' | 'danger' | null } {
  switch (type) {
    case 'HELP_OFFER':          return { label: '확인하기', style: 'primary' };
    case 'REVIEW_REQUEST':      return { label: '후기 작성', style: 'primary' };
    case 'STUDENT_ID_APPROVED': return { label: '확인됨', style: 'secondary' };
    case 'STUDENT_ID_REJECTED': return { label: '재제출', style: 'danger' };
    default:                    return { label: '', style: null };
  }
}

type Section = { title: string; data: AppNotification[] };

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, loading, fetchNotifications, markAsRead, markAllAsRead, deleteAll } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // 인스타그램처럼 "어제", "최근 7일", "이전" 섹션으로 분류
  const sections: Section[] = useMemo(() => {
    const today: AppNotification[]   = [];
    const yesterday: AppNotification[] = [];
    const week: AppNotification[]    = [];
    const older: AppNotification[]   = [];

    for (const n of notifications) {
      const h = getAgeInHours(n.createdAt);
      if (h < 24)       today.push(n);
      else if (h < 48)  yesterday.push(n);
      else if (h < 168) week.push(n);
      else              older.push(n);
    }

    const result: Section[] = [];
    if (today.length)     result.push({ title: '오늘',      data: today });
    if (yesterday.length) result.push({ title: '어제',      data: yesterday });
    if (week.length)      result.push({ title: '최근 7일',  data: week });
    if (older.length)     result.push({ title: '이전',      data: older });
    return result;
  }, [notifications]);

  const handleNavigate = async (item: AppNotification) => {
    await markAsRead(item.id);
    if (item.referenceId != null) {
      router.push({ pathname: '/community-post', params: { id: item.referenceId } });
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const icon   = notifIcon(item.type);
    const action = getActionButton(item.type);
    const canNavigate = item.referenceId != null;

    return (
      <TouchableOpacity
        style={[s.item, !item.isRead && s.itemUnread]}
        activeOpacity={canNavigate ? 0.7 : 1}
        onPress={canNavigate ? () => handleNavigate(item) : () => markAsRead(item.id)}
      >
        {/* 왼쪽: 아이콘 */}
        <View style={[s.iconWrap, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={sc(18)} color={icon.color} />
          {/* 읽지 않은 경우 파란 점 */}
          {!item.isRead && <View style={s.unreadDot} />}
        </View>

        {/* 중앙: 텍스트 */}
        <View style={s.itemBody}>
          <Text style={s.itemText} numberOfLines={2}>{item.message}</Text>
          <Text style={s.itemTime}>{formatTime(item.createdAt)}</Text>
        </View>

        {/* 오른쪽: 액션 버튼 or 썸네일 자리 */}
        {action.style ? (
          <TouchableOpacity
            style={[s.actionBtn,
              action.style === 'primary' && s.actionPrimary,
              action.style === 'secondary' && s.actionSecondary,
              action.style === 'danger' && s.actionDanger,
            ]}
            onPress={() => handleNavigate(item)}
          >
            <Text style={[s.actionBtnText,
              action.style === 'primary' && s.actionPrimaryText,
              action.style === 'secondary' && s.actionSecondaryText,
              action.style === 'danger' && s.actionDangerText,
            ]}>{action.label}</Text>
          </TouchableOpacity>
        ) : (
          // 읽음 처리용 작은 버튼
          !item.isRead && (
            <TouchableOpacity style={s.readDotBtn} onPress={() => markAsRead(item.id)}>
              <View style={s.readDotInner} />
            </TouchableOpacity>
          )
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{section.title}</Text>
    </View>
  );

  return (
    <View style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={sc(20)} color={T1} />
        </TouchableOpacity>

        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} style={s.headerAction}>
            <Text style={s.allRead}>모두 읽음</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: sc(64) }} />
        )}
      </View>

      {/* 읽지 않은 알림 수 배너 */}
      {unreadCount > 0 && (
        <View style={s.unreadBanner}>
          <View style={s.unreadDotSmall} />
          <Text style={s.unreadBannerText}>읽지 않은 알림 {unreadCount}개</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={BLUE} style={{ marginTop: sc(60) }} />
      ) : sections.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="notifications-off-outline" size={sc(48)} color={BORDER} />
          <Text style={s.emptyTitle}>알림이 없습니다</Text>
          <Text style={s.emptySubtitle}>새로운 소식이 생기면 알려드릴게요</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={s.list}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },

  // 헤더
  header: {
    backgroundColor: WHITE,
    paddingTop: Platform.OS === 'ios' ? sc(56) : sc(28),
    paddingBottom: sc(14),
    paddingHorizontal: sc(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: sc(36), height: sc(36), borderRadius: sc(18),
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: sc(17), fontWeight: '800', color: T1, letterSpacing: -0.3 },
  headerAction: { minWidth: sc(64), alignItems: 'flex-end' },
  allRead:   { fontSize: sc(13), fontWeight: '700', color: BLUE },
  deleteAll: { fontSize: sc(13), fontWeight: '700', color: '#EF4444' },

  // 읽지 않은 배너
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sc(6),
    backgroundColor: BLUE_L,
    paddingHorizontal: sc(16),
    paddingVertical: sc(9),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  unreadDotSmall: {
    width: sc(7), height: sc(7), borderRadius: sc(4), backgroundColor: BLUE,
  },
  unreadBannerText: { fontSize: sc(12), color: BLUE, fontWeight: '700' },

  // 섹션 헤더 ("어제", "최근 7일" 등)
  sectionHeader: {
    paddingHorizontal: sc(16),
    paddingTop: sc(20),
    paddingBottom: sc(8),
  },
  sectionTitle: {
    fontSize: sc(14),
    fontWeight: '700',
    color: T1,
  },

  list: { paddingBottom: sc(60) },

  // 알림 아이템
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sc(16),
    paddingVertical: sc(13),
    gap: sc(12),
    backgroundColor: WHITE,
  },
  itemUnread: {
    backgroundColor: BLUE_BG,
  },

  // 아이콘
  iconWrap: {
    width: sc(46), height: sc(46), borderRadius: sc(23),
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0, position: 'relative',
  },
  unreadDot: {
    position: 'absolute', top: 0, right: 0,
    width: sc(10), height: sc(10), borderRadius: sc(5),
    backgroundColor: BLUE, borderWidth: 2, borderColor: WHITE,
  },

  // 텍스트
  itemBody: { flex: 1 },
  itemText: { fontSize: sc(13), color: T1, lineHeight: sc(19), fontWeight: '500' },
  itemTime: { fontSize: sc(12), color: T2, marginTop: sc(3) },

  // 읽음 dot 버튼 (오른쪽)
  readDotBtn: {
    width: sc(28), height: sc(28), borderRadius: sc(14),
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  readDotInner: {
    width: sc(8), height: sc(8), borderRadius: sc(4), backgroundColor: BLUE,
  },

  // 액션 버튼들
  actionBtn: {
    paddingHorizontal: sc(14),
    paddingVertical: sc(7),
    borderRadius: sc(10),
    flexShrink: 0,
    minWidth: sc(72),
    alignItems: 'center',
  },
  actionPrimary: { backgroundColor: BLUE },
  actionSecondary: { backgroundColor: BLUE_L, borderWidth: 1, borderColor: BORDER },
  actionDanger: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },

  actionBtnText: { fontSize: sc(12), fontWeight: '700' },
  actionPrimaryText:   { color: WHITE },
  actionSecondaryText: { color: BLUE },
  actionDangerText:    { color: '#EF4444' },

  // 빈 상태
  empty: { flex: 1, paddingTop: sc(120), alignItems: 'center', gap: sc(10) },
  emptyTitle:    { fontSize: sc(16), fontWeight: '700', color: T1 },
  emptySubtitle: { fontSize: sc(13), color: T2 },
});

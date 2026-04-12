// 알림 화면
import { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '../stores/notificationStore';
import type { AppNotification } from '../types';

const BLUE    = '#3B6FE8';
const BLUE_BG = '#F5F8FF';
const BLUE_L  = '#EEF4FF';
const BORDER  = '#D0E0F8';
const T1      = '#0C1C3C';
const T2      = '#A8C8FA';
const T3      = '#6B9DF0';
const ORANGE  = '#F97316';

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

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, hasUnread, loading, fetchNotifications, markAsRead, markAllAsRead, deleteAll } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // 알림 탭 시 해당 게시글로 이동 + 읽음 처리
  const handleNavigate = async (item: AppNotification) => {
    await markAsRead(item.id);
    if (item.referenceId != null) {
      router.push({ pathname: '/community-post', params: { id: item.referenceId } });
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const icon = notifIcon(item.type);
    const canNavigate = item.referenceId != null;

    return (
      <View style={[s.item, !item.isRead && s.itemUnread]}>
        <TouchableOpacity
          style={s.itemMain}
          activeOpacity={canNavigate ? 0.75 : 1}
          onPress={canNavigate ? () => handleNavigate(item) : undefined}
        >
          <View style={[s.iconWrap, { backgroundColor: icon.bg }]}>
            <Ionicons name={icon.name} size={18} color={icon.color} />
          </View>
          <View style={s.itemBody}>
            <Text style={s.itemText}>{item.message}</Text>
            <Text style={s.itemTime}>{formatTime(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        {!item.isRead && (
          <TouchableOpacity style={s.readBtn} onPress={() => markAsRead(item.id)}>
            <Text style={s.readBtnText}>읽음</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={T1} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>알림</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={s.allRead}>모두 읽음</Text>
          </TouchableOpacity>
        ) : notifications.length > 0 ? (
          <TouchableOpacity onPress={deleteAll}>
            <Text style={s.deleteAll}>모두 삭제</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      {/* 미읽음 뱃지 - 항상 표시 */}
      <View style={s.unreadBanner}>
        <Text style={s.unreadBannerText}>읽지 않은 알림 {unreadCount}개</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={BLUE} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={T2} />
              <Text style={s.emptyTitle}>알림이 없습니다</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLUE_BG },

  header: {
    backgroundColor: BLUE_BG,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BLUE_L,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: T1 },
  allRead: { fontSize: 12, fontWeight: '700', color: BLUE },
  deleteAll: { fontSize: 12, fontWeight: '700', color: '#EF4444' },

  unreadBanner: {
    backgroundColor: BLUE_L,
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  unreadBannerText: { fontSize: 12, color: BLUE, fontWeight: '700' },

  list: { padding: 12, paddingBottom: 60 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  itemUnread: { borderColor: BLUE, backgroundColor: '#F8FBFF' },

  itemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },

  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  itemBody: { flex: 1 },
  itemText: { fontSize: 13, color: T1, lineHeight: 18, fontWeight: '500' },
  itemTime: { fontSize: 11, color: T2, marginTop: 4 },

  readBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: BLUE_L,
  },
  readBtnText: { fontSize: 12, fontWeight: '700', color: BLUE },

  sep: { height: 8 },

  empty: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T2 },
});

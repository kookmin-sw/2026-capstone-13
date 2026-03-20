// 알림 화면
import { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
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
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function notifIcon(type: AppNotification['type']): { name: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string } {
  switch (type) {
    case 'COMMENT':    return { name: 'chatbubble',      color: BLUE,   bg: BLUE_L };
    case 'LIKE':       return { name: 'heart',           color: '#EF4444', bg: '#FEE2E2' };
    case 'HELP_OFFER': return { name: 'hand-left',       color: '#10B981', bg: '#D1FAE5' };
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();

  const userId = user?.id ?? 0;
  const myNotifications = notifications.filter((n) => n.recipientId === userId);
  const unreadCount = myNotifications.filter((n) => !n.isRead).length;

  const renderItem = ({ item }: { item: AppNotification }) => {
    const icon = notifIcon(item.type);
    return (
      <TouchableOpacity
        style={[s.item, !item.isRead && s.itemUnread]}
        onPress={() => markAsRead(item.id)}
        activeOpacity={0.85}
      >
        <View style={[s.iconWrap, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={18} color={icon.color} />
        </View>
        <View style={s.itemBody}>
          <Text style={s.itemText}>{item.message}</Text>
          <Text style={s.itemTime}>{formatTime(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={s.unreadDot} />}
      </TouchableOpacity>
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
          <TouchableOpacity onPress={() => markAllAsRead(userId)}>
            <Text style={s.allRead}>모두 읽음</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 56 }} />
        )}
      </View>

      {/* 미읽음 뱃지 */}
      {unreadCount > 0 && (
        <View style={s.unreadBanner}>
          <Text style={s.unreadBannerText}>읽지 않은 알림 {unreadCount}개</Text>
        </View>
      )}

      <FlatList
        data={myNotifications}
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

  unreadBanner: {
    backgroundColor: BLUE_L,
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  unreadBannerText: { fontSize: 12, color: BLUE, fontWeight: '700' },

  list: { padding: 12, paddingBottom: 60 },

  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  itemUnread: { borderColor: BLUE, backgroundColor: '#F8FBFF' },

  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  itemBody: { flex: 1 },
  itemText: { fontSize: 13, color: T1, lineHeight: 18, fontWeight: '500' },
  itemTime: { fontSize: 11, color: T2, marginTop: 4 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: ORANGE, flexShrink: 0,
  },

  sep: { height: 8 },

  empty: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T2 },
});

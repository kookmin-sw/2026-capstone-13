// 채팅 목록 화면
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';

const MOCK_ROOMS = [
  {
    id: 1,
    partnerName: '김민준',
    partnerInitial: '김',
    avatarColor: '#059669',
    requestTitle: '은행 계좌 개설 도와주실 분 구해요',
    lastMessage: '네, 내일 오전 10시에 신한은행 앞에서 만나요!',
    time: '오후 2:34',
    unread: 2,
    online: true,
  },
];

export default function ChatScreen() {
  const router = useRouter();

  const renderRoom = ({ item }: { item: typeof MOCK_ROOMS[0] }) => (
    <TouchableOpacity
      style={styles.roomCard}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/chatroom', params: { id: item.id } })}
    >
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
          <Text style={styles.avatarText}>{item.partnerInitial}</Text>
        </View>
        {item.online && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.roomBody}>
        <View style={styles.roomTop}>
          <Text style={styles.partnerName}>{item.partnerName}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.requestLabel} numberOfLines={1}>{item.requestTitle}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
      {item.unread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_ROOMS}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  list: { paddingTop: 8 },
  separator: { height: 1, backgroundColor: 'rgba(79,70,229,0.06)', marginLeft: 80 },

  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF',
  },
  roomBody: { flex: 1, gap: 3 },
  roomTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partnerName: { fontSize: 15, fontWeight: '700', color: '#1E1B4B' },
  time: { fontSize: 12, color: '#9CA3AF' },
  requestLabel: {
    fontSize: 11, color: PRIMARY, fontWeight: '600',
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5,
    alignSelf: 'flex-start',
  },
  lastMessage: { fontSize: 13, color: '#6B7280' },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
});

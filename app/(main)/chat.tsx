// 채팅 목록 화면
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatRoom } from '../../types';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';

const MOCK_CHATS: ChatRoom[] = [];

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_CHATS}
        renderItem={() => null}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubbles-outline" size={36} color={PRIMARY} />
            </View>
            <Text style={styles.emptyText}>아직 채팅이 없어요</Text>
            <Text style={styles.emptySubtext}>
              도움 요청이 매칭되면{'\n'}여기서 대화할 수 있어요
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  list: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#1E1B4B' },
  emptySubtext: {
    fontSize: 14, color: '#9CA3AF',
    textAlign: 'center', lineHeight: 21,
  },
});

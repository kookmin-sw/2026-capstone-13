// 채팅 목록 화면
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';

// TODO: 실제 채팅 데이터 연동
const MOCK_CHATS: never[] = [];

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_CHATS}
        renderItem={() => null}
        keyExtractor={() => ''}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>채팅이 없습니다</Text>
            <Text style={styles.emptySubtext}>
              도움 요청이 매칭되면 여기서 대화할 수 있습니다
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

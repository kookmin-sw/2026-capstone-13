// 홈 화면
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Colors, CategoryLabels } from '../../constants/colors';
import type { HelpCategory } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const categories: { key: HelpCategory; color: string }[] = [
    { key: 'BANK', color: Colors.categoryBank },
    { key: 'HOSPITAL', color: Colors.categoryHospital },
    { key: 'SCHOOL', color: Colors.categorySchool },
    { key: 'DAILY', color: Colors.categoryDaily },
    { key: 'OTHER', color: Colors.categoryOther },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* 환영 메시지 */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeText}>
          안녕하세요, {user?.nickname ?? '사용자'}님! 👋
        </Text>
        <Text style={styles.welcomeSubtext}>
          {user?.userType === 'INTERNATIONAL'
            ? '도움이 필요하신가요? 요청을 등록해보세요.'
            : '도움을 기다리는 유학생이 있어요!'}
        </Text>
      </View>

      {/* 유학생: 도움 요청하기 버튼 */}
      {user?.userType === 'INTERNATIONAL' && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            // TODO: 도움 요청 작성 화면으로 이동
          }}
        >
          <Text style={styles.createButtonText}>✍️ 도움 요청하기</Text>
        </TouchableOpacity>
      )}

      {/* 카테고리 목록 */}
      <Text style={styles.sectionTitle}>카테고리</Text>
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryCard, { borderLeftColor: cat.color }]}
            onPress={() => {
              // TODO: 해당 카테고리 필터링
            }}
          >
            <Text style={styles.categoryText}>{CategoryLabels[cat.key]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 최근 도움 요청 */}
      <Text style={styles.sectionTitle}>최근 도움 요청</Text>
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>아직 도움 요청이 없습니다.</Text>
        <Text style={styles.emptySubtext}>첫 번째 요청을 등록해보세요!</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  welcomeCard: {
    backgroundColor: Colors.primary,
    margin: 16,
    padding: 24,
    borderRadius: 16,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textWhite,
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  createButton: {
    backgroundColor: Colors.success,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  createButtonText: {
    color: Colors.textWhite,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  categoryGrid: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
  },
});

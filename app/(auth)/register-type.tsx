// 회원가입 - 사용자 유형 선택 첫 화면
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { s } from '../../utils/scale';

const BLUE = '#3B6FE8';
const BLUE_L = '#EEF4FF';

export default function RegisterTypeScreen() {
  const router = useRouter();

  const handleSelect = (isForeigner: boolean) => {
    router.push({ pathname: '/(auth)/register', params: { isForeigner: isForeigner ? '1' : '0' } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* 뒤로가기 */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>

        {/* 상단 텍스트 */}
        <View style={styles.topSection}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>어떤 분이신가요?</Text>
          <Text style={styles.subtitle}>도와줘코리안에 가입하기 위해{'\n'}먼저 유형을 선택해주세요</Text>
        </View>

        {/* 선택 버튼 */}
        <View style={styles.cardSection}>
          <TouchableOpacity style={styles.card} onPress={() => handleSelect(true)} activeOpacity={0.85}>
            <View style={[styles.iconWrap, { backgroundColor: BLUE_L }]}>
              <Text style={styles.cardEmoji}>🌍</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>외국인 유학생</Text>
              <Text style={styles.cardDesc}>한국 생활에서 도움이 필요해요</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => handleSelect(false)} activeOpacity={0.85}>
            <View style={[styles.iconWrap, { backgroundColor: BLUE_L }]}>
              <Text style={styles.cardEmoji}>🇰🇷</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>한국인 학생</Text>
              <Text style={styles.cardDesc}>외국인 친구들에게 도움을 줄게요</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 하단 로그인 링크 */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>이미 계정이 있으신가요? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginLink}>로그인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inner: {
    flex: 1,
    paddingHorizontal: s(28),
    paddingTop: s(20),
  },
  backBtn: {
    marginBottom: s(24),
  },
  backText: {
    fontSize: s(16),
    color: BLUE,
    fontWeight: '600',
  },
  topSection: {
    alignItems: 'center',
    marginTop: s(32),
    marginBottom: s(52),
  },
  emoji: {
    fontSize: s(56),
    marginBottom: s(20),
  },
  title: {
    fontSize: s(28),
    fontWeight: '800',
    color: '#0C1C3C',
    marginBottom: s(12),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: s(15),
    color: '#6B7FA3',
    textAlign: 'center',
    lineHeight: s(22),
  },
  cardSection: {
    gap: s(16),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: s(16),
    paddingVertical: s(20),
    paddingHorizontal: s(20),
    borderWidth: s(1.5),
    borderColor: '#D4E4FF',
    gap: s(16),
    shadowColor: '#3B6FE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: s(52),
    height: s(52),
    borderRadius: s(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: s(28),
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: s(17),
    fontWeight: '700',
    color: '#0C1C3C',
    marginBottom: s(4),
  },
  cardDesc: {
    fontSize: s(13),
    color: '#6B7FA3',
  },
  arrow: {
    fontSize: s(22),
    color: BLUE,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: s(32),
  },
  loginText: {
    fontSize: s(14),
    color: '#6B7FA3',
  },
  loginLink: {
    fontSize: s(14),
    color: BLUE,
    fontWeight: '700',
  },
});

// 회원가입 - 사용자 유형 선택 첫 화면
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { s } from '../../utils/scale';

const BLUE = '#3B6FE8';
const BLUE_L = '#EEF4FF';

export default function RegisterTypeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<'foreigner' | 'korean' | null>(null);

  const handleNext = () => {
    if (!selected) return;
    router.push({ pathname: '/(auth)/register', params: { isForeigner: selected === 'foreigner' ? '1' : '0' } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* 선택 버튼 */}
        <View style={styles.cardSection}>
          <TouchableOpacity
            style={[styles.card, selected === 'foreigner' && styles.cardSelected]}
            onPress={() => setSelected(selected === 'foreigner' ? null : 'foreigner')}
            activeOpacity={0.85}
          >
            <View style={[styles.iconWrap, { backgroundColor: BLUE_L }]}>
              <Image source={require('../../logo/international.png')} style={styles.cardLogo} resizeMode="contain" />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, selected === 'foreigner' && styles.cardTitleSelected]}>외국인 유학생</Text>
              <Text style={[styles.cardDesc, selected === 'foreigner' && styles.cardDescSelected]}>한국 생활에서 도움이 필요해요</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, selected === 'korean' && styles.cardSelected]}
            onPress={() => setSelected(selected === 'korean' ? null : 'korean')}
            activeOpacity={0.85}
          >
            <View style={[styles.iconWrap, { backgroundColor: BLUE_L }]}>
              <Image source={require('../../logo/korean.png')} style={styles.cardLogo} resizeMode="contain" />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, selected === 'korean' && styles.cardTitleSelected]}>한국인 학생</Text>
              <Text style={[styles.cardDesc, selected === 'korean' && styles.cardDescSelected]}>외국인 친구들에게 도움을 줄게요</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 하단 영역 */}
        <View style={styles.bottomSection}>
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>이미 계정이 있으신가요? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>로그인</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, !selected && styles.nextBtnDisabled]}
            onPress={handleNext}
            activeOpacity={selected ? 0.85 : 1}
          >
            <Text style={[styles.nextBtnText, !selected && styles.nextBtnTextDisabled]}>다음 단계로</Text>
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

  cardSection: {
    flex: 1,
    gap: s(16),
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: s(16),
    paddingVertical: s(20),
    paddingHorizontal: s(20),
    borderWidth: s(1.5),
    borderColor: '#C8D4E8',
    gap: s(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: BLUE,
    borderWidth: s(2.5),
  },
  iconWrap: {
    width: s(64),
    height: s(64),
    borderRadius: s(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLogo: {
    width: s(46),
    height: s(46),
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: s(19),
    fontWeight: '700',
    color: '#0C1C3C',
    marginBottom: s(4),
  },
  cardTitleSelected: {
    color: BLUE,
  },
  cardDesc: {
    fontSize: s(14),
    color: '#6B7FA3',
  },
  cardDescSelected: {
    color: '#6B7FA3',
  },
  checkmark: {
    fontSize: s(20),
    color: BLUE,
    fontWeight: '700',
  },
  bottomSection: {
    marginTop: 'auto',
    paddingBottom: s(32),
    gap: s(20),
  },
  nextBtn: {
    backgroundColor: BLUE,
    borderRadius: s(14),
    paddingVertical: s(20),
    alignItems: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: '#9AAABF',
  },
  nextBtnText: {
    fontSize: s(18),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextBtnTextDisabled: {
    color: '#FFFFFF',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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

// 최초 설치 시 언어 선택 화면
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/authStore';
import { Colors } from '../constants/colors';
import { s } from '../utils/scale';

const BLUE = '#3B6FE8';
const BLUE_L = '#EEF4FF';

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', native: 'English',    title: 'Please select a language', confirm: 'Confirm' },
  { code: 'ko', flag: '🇰🇷', native: '한국어',      title: '언어를 선택해주세요',         confirm: '확인' },
  { code: 'zh', flag: '🇨🇳', native: '中文 (简体)', title: '请选择语言',                 confirm: '确认' },
  { code: 'ja', flag: '🇯🇵', native: '日本語',      title: '言語を選択してください',       confirm: '確認' },
  { code: 'vi', flag: '🇻🇳', native: 'Tiếng Việt', title: 'Vui lòng chọn ngôn ngữ',    confirm: 'Xác nhận' },
  { code: 'mn', flag: '🇲🇳', native: 'Монгол хэл', title: 'Хэлээ сонгоно уу',          confirm: 'Баталгаажуулах' },
  { code: 'uz', flag: '🇺🇿', native: 'Oʻzbek tili', title: 'Tilni tanlang',             confirm: 'Tasdiqlash' },
  { code: 'th', flag: '🇹🇭', native: 'ภาษาไทย',   title: 'กรุณาเลือกภาษา',            confirm: 'ยืนยัน' },
];

export default function LanguageSetupScreen() {
  const router = useRouter();
  const { setLanguageSelected } = useAuthStore();
  const [selected, setSelected] = useState<string>('en');

  const current = LANGUAGES.find((l) => l.code === selected) ?? LANGUAGES[0];

  const handleConfirm = async () => {
    await setLanguageSelected();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>{current.title}</Text>
      </View>

      <View style={styles.list}>
        {LANGUAGES.map((item) => {
          const isSelected = selected === item.code;
          return (
            <TouchableOpacity
              key={item.code}
              style={[styles.item, isSelected && styles.itemSelected]}
              onPress={() => setSelected(item.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{item.flag}</Text>
              <Text style={[styles.itemLabel, isSelected && styles.itemLabelSelected]}>
                {item.native}
              </Text>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmButtonText} numberOfLines={1} adjustsFontSizeToFit>{current.confirm}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: s(28),
    paddingTop: s(32),
    paddingBottom: s(16),
  },
  title: {
    fontSize: s(24),
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  list: {
    flex: 1,
    paddingHorizontal: s(20),
    gap: s(8),
    justifyContent: 'center',
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: s(12),
    paddingHorizontal: s(16),
    borderWidth: s(2),
    borderColor: Colors.border,
    height: s(56),
    maxHeight: s(56),
    minHeight: s(56),
  },
  itemSelected: {
    borderColor: BLUE,
    backgroundColor: BLUE_L,
  },
  flag: {
    fontSize: s(24),
    marginRight: s(12),
  },
  itemLabel: {
    flex: 1,
    fontSize: s(16),
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemLabelSelected: {
    color: BLUE,
  },
  radio: {
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    borderWidth: s(2),
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: BLUE,
  },
  radioDot: {
    width: s(10),
    height: s(10),
    borderRadius: s(5),
    backgroundColor: BLUE,
  },
  footer: {
    paddingHorizontal: s(20),
    paddingBottom: s(20),
    paddingTop: s(28),
  },
  confirmButton: {
    backgroundColor: BLUE,
    borderRadius: s(30),
    height: s(58),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.45,
    shadowRadius: s(12),
    elevation: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: s(19),
    fontWeight: '700',
  },
});

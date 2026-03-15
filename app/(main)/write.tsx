// 도움 요청 글쓰기 화면
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CategoryLabels, MethodLabels } from '../../constants/colors';
import { createHelpRequest } from '../../services/helpService';
import type { HelpCategory, HelpMethod } from '../../types';

const CATEGORIES: HelpCategory[] = ['BANK', 'HOSPITAL', 'SCHOOL', 'DAILY', 'OTHER'];
const METHODS: HelpMethod[] = ['CHAT', 'VIDEO_CALL', 'OFFLINE'];

const CATEGORY_EMOJI: Record<HelpCategory, string> = {
  BANK: '🏦',
  HOSPITAL: '🏥',
  SCHOOL: '🏫',
  DAILY: '🏠',
  OTHER: '📌',
};

const METHOD_ICON: Record<HelpMethod, string> = {
  CHAT: '💬',
  VIDEO_CALL: '📹',
  OFFLINE: '🤝',
};

export default function WriteScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<HelpMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('알림', '카테고리를 선택해주세요.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('알림', '자세한 설명을 입력해주세요.');
      return;
    }
    if (!selectedMethod) {
      Alert.alert('알림', '도움 방식을 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createHelpRequest({
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        helpMethod: selectedMethod,
      });
      if (response.success) {
        Alert.alert('완료', '도움 요청이 등록되었습니다!', [
          { text: '확인', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('오류', '등록에 실패했습니다. 다시 시도해주세요.');
      }
    } catch {
      Alert.alert('오류', '서버에 연결할 수 없습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>도움 요청하기</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 카테고리 선택 */}
        <View style={styles.section}>
          <Text style={styles.label}>카테고리</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={styles.categoryChipEmoji}>{CATEGORY_EMOJI[cat]}</Text>
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}>
                  {CategoryLabels[cat].replace(/^.{1,2}\s/, '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* 제목 */}
        <View style={styles.section}>
          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.input}
            placeholder="제목을 입력해주세요."
            placeholderTextColor={Colors.textLight}
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
          <Text style={styles.charCount}>{title.length}/50</Text>
        </View>

        <View style={styles.divider} />

        {/* 자세한 설명 */}
        <View style={styles.section}>
          <Text style={styles.label}>자세한 설명</Text>
          <TextInput
            style={styles.textarea}
            placeholder={'어떤 도움이 필요한지 자세히 적어주세요.\n\n상황을 자세히 설명할수록 더 빠르게 매칭됩니다.'}
            placeholderTextColor={Colors.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        <View style={styles.divider} />

        {/* 도움 방식 */}
        <View style={styles.section}>
          <Text style={styles.label}>도움 방식</Text>
          <View style={styles.methodRow}>
            {METHODS.map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.methodChip,
                  selectedMethod === method && styles.methodChipActive,
                ]}
                onPress={() => setSelectedMethod(method)}
              >
                <Text style={styles.methodChipEmoji}>{METHOD_ICON[method]}</Text>
                <Text style={[
                  styles.methodChipText,
                  selectedMethod === method && styles.methodChipTextActive,
                ]}>
                  {MethodLabels[method].replace(/^.{1,2}\s/, '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* 작성 완료 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.textWhite} />
          ) : (
            <Text style={styles.submitBtnText}>작성 완료</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerBtn: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  scroll: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  divider: {
    height: 8,
    backgroundColor: Colors.background,
  },

  // 카테고리
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EBF4FF',
  },
  categoryChipEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.primary,
  },

  // 입력
  input: {
    fontSize: 16,
    color: Colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  textarea: {
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.background,
    height: 160,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: 6,
  },

  // 도움 방식
  methodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 6,
  },
  methodChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EBF4FF',
  },
  methodChipEmoji: {
    fontSize: 22,
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  methodChipTextActive: {
    color: Colors.primary,
  },

  bottomPadding: {
    height: 20,
  },

  // 하단 버튼
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: Colors.textWhite,
    fontSize: 17,
    fontWeight: '700',
  },
});

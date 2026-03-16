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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CategoryLabels, MethodLabels } from '../../constants/colors';
import { createHelpRequest, updateHelpRequest } from '../../services/helpService';
import { useAuthStore } from '../../stores/authStore';
import type { HelpCategory, HelpMethod } from '../../types';

const CATEGORIES: HelpCategory[] = ['BANK', 'HOSPITAL', 'SCHOOL', 'DAILY', 'OTHER'];
const METHODS: HelpMethod[] = ['CHAT', 'VIDEO_CALL', 'OFFLINE'];

const CATEGORY_EMOJI: Record<HelpCategory, string> = {
  BANK: '🏦', HOSPITAL: '🏥', SCHOOL: '🏫', DAILY: '🏠', OTHER: '📌',
};

const METHOD_ICON: Record<HelpMethod, string> = {
  CHAT: '💬', VIDEO_CALL: '📹', OFFLINE: '🤝',
};

const SCHEDULE_OPTIONS = ['오늘', '이번 주 내', '이번 달 내', '협의 가능'];
const DURATION_OPTIONS = ['30분 이내', '1시간 이내', '2시간 이내', '협의 가능'];
const LANGUAGE_OPTIONS = ['한국어', '영어', '한국어·영어'];

export default function WriteScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{
    editId?: string;
    editTitle?: string;
    editDescription?: string;
    editCategory?: HelpCategory;
    editMethod?: HelpMethod;
    editSchedule?: string;
    editDuration?: string;
    editLanguage?: string;
    editLocation?: string;
  }>();

  const isEditMode = !!params.editId;

  const [title, setTitle] = useState(params.editTitle ?? '');
  const [description, setDescription] = useState(params.editDescription ?? '');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(params.editCategory ?? null);
  const [selectedMethod, setSelectedMethod] = useState<HelpMethod | null>(params.editMethod ?? null);
  const [schedule, setSchedule] = useState<string | null>(params.editSchedule || null);
  const [duration, setDuration] = useState<string | null>(params.editDuration || null);
  const [language, setLanguage] = useState<string | null>(params.editLanguage || null);
  const [location, setLocation] = useState(params.editLocation ?? '');
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

    // 추가 정보를 description에 구조화해서 저장
    const metaLines: string[] = [];
    if (schedule) metaLines.push(`희망일정:${schedule}`);
    if (duration) metaLines.push(`소요시간:${duration}`);
    if (language) metaLines.push(`언어:${language}`);
    if (selectedMethod === 'OFFLINE' && location.trim()) metaLines.push(`장소:${location.trim()}`);
    const fullDescription = metaLines.length > 0
      ? `${description.trim()}\n\n[정보]\n${metaLines.join('\n')}`
      : description.trim();

    try {
      const payload = {
        title: title.trim(),
        description: fullDescription,
        category: selectedCategory,
        helpMethod: selectedMethod,
      };

      const response = isEditMode && params.editId
        ? await updateHelpRequest(Number(params.editId), payload)
        : await createHelpRequest(payload);

      if (response.success) {
        Alert.alert('완료', isEditMode ? '수정이 완료됐습니다!' : '도움 요청이 등록되었습니다!', [
          { text: '확인', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('실패', response.message ?? '등록에 실패했습니다.');
      }
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        Alert.alert('로그인 필요', '실제 계정으로 로그인해야 요청을 올릴 수 있습니다.');
      } else {
        Alert.alert('오류', '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
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
        <Text style={styles.headerTitle}>{isEditMode ? '도움 요청 수정' : '도움 요청하기'}</Text>
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

        <View style={styles.divider} />

        {/* 희망 일정 */}
        <View style={styles.section}>
          <Text style={styles.label}>📅 희망 일정 <Text style={styles.optional}>(선택)</Text></Text>
          <View style={styles.chipRow}>
            {SCHEDULE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionChip, schedule === opt && styles.optionChipActive]}
                onPress={() => setSchedule(schedule === opt ? null : opt)}
              >
                <Text style={[styles.optionChipText, schedule === opt && styles.optionChipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* 소요 시간 */}
        <View style={styles.section}>
          <Text style={styles.label}>⏱ 소요 시간 <Text style={styles.optional}>(선택)</Text></Text>
          <View style={styles.chipRow}>
            {DURATION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionChip, duration === opt && styles.optionChipActive]}
                onPress={() => setDuration(duration === opt ? null : opt)}
              >
                <Text style={[styles.optionChipText, duration === opt && styles.optionChipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* 언어 */}
        <View style={styles.section}>
          <Text style={styles.label}>🌐 언어 <Text style={styles.optional}>(선택)</Text></Text>
          <View style={styles.chipRow}>
            {LANGUAGE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionChip, language === opt && styles.optionChipActive]}
                onPress={() => setLanguage(language === opt ? null : opt)}
              >
                <Text style={[styles.optionChipText, language === opt && styles.optionChipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 장소 (오프라인 선택 시만 표시) */}
        {selectedMethod === 'OFFLINE' && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.label}>📍 만날 장소 <Text style={styles.optional}>(선택)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="예: 국민대 도서관, 정문 카페"
                placeholderTextColor={Colors.textLight}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </>
        )}

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
            <Text style={styles.submitBtnText}>{isEditMode ? '수정 완료' : '작성 완료'}</Text>
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

  optional: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textLight,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EBF4FF',
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  optionChipTextActive: {
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

import { useState } from 'react';
import { s } from '../utils/scale';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { createHelpRequest } from '../services/helpService';
import { useHelpRequestStore } from '../stores/helpRequestStore';
import type { HelpCategory, HelpMethod } from '../types';

const CATEGORIES: HelpCategory[] = ['BANK', 'SCHOOL', 'DAILY', 'OTHER'];
const METHODS: HelpMethod[] = ['CHAT', 'OFFLINE'];

const CATEGORY_LABEL: Record<HelpCategory, string> = {
  BANK: '행정', HOSPITAL: '병원', SCHOOL: '학업', DAILY: '생활', OTHER: '기타',
};

const CATEGORY_EMOJI: Record<HelpCategory, string> = {
  BANK: '🏛️', HOSPITAL: '🏥', SCHOOL: '📚', DAILY: '🏠', OTHER: '📌',
};

const METHOD_LABEL: Record<string, string> = {
  CHAT: '온라인', OFFLINE: '오프라인',
};

const METHOD_ICON: Record<string, string> = {
  CHAT: '💻', OFFLINE: '🤝',
};

const SCHEDULE_OPTIONS = ['오늘', '이번 주', '아무때나'];

interface WriteFormProps {
  onSuccess: () => void;
}

export default function WriteForm({ onSuccess }: WriteFormProps) {
  const { addRequest } = useHelpRequestStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<HelpMethod | null>(null);
  const [schedule, setSchedule] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) { Alert.alert('알림', '카테고리를 선택해주세요.'); return; }
    if (!title.trim())       { Alert.alert('알림', '제목을 입력해주세요.'); return; }
    if (!description.trim()) { Alert.alert('알림', '자세한 설명을 입력해주세요.'); return; }
    if (!selectedMethod)     { Alert.alert('알림', '도움 방식을 선택해주세요.'); return; }

    setIsSubmitting(true);

    const metaLines: string[] = [];
    if (schedule) metaLines.push(`희망일정:${schedule}`);
    if (selectedMethod === 'OFFLINE' && location.trim()) metaLines.push(`장소:${location.trim()}`);
    const fullDescription = metaLines.length > 0
      ? `${description.trim()}\n\n[정보]\n${metaLines.join('\n')}`
      : description.trim();

    try {
      const response = await createHelpRequest({
        title: title.trim(),
        description: fullDescription,
        category: selectedCategory,
        helpMethod: selectedMethod,
      });

      if (response.success) {
        addRequest(response.data);
        Alert.alert('완료', '도움 요청이 등록되었습니다!', [
          { text: '확인', onPress: onSuccess },
        ]);
      } else {
        Alert.alert('실패', response.message ?? '등록에 실패했습니다.');
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      if (status === 401 || status === 403) {
        Alert.alert('로그인 필요', '실제 계정으로 로그인해야 요청을 올릴 수 있습니다.');
      } else {
        Alert.alert('오류', `서버 오류 (${status ?? '?'}): ${serverMsg ?? '잠시 후 다시 시도해주세요.'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={s.wrap}>

      {/* 카테고리 */}
      <View style={s.section}>
        <Text style={s.label}>카테고리</Text>
        <View style={s.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[s.categoryChip, selectedCategory === cat && s.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={s.categoryChipEmoji}>{CATEGORY_EMOJI[cat]}</Text>
              <Text style={[s.categoryChipText, selectedCategory === cat && s.categoryChipTextActive]}>
                {CATEGORY_LABEL[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 제목 */}
      <View style={s.section}>
        <Text style={s.label}>제목</Text>
        <TextInput
          style={s.input}
          placeholder="제목을 입력해주세요."
          placeholderTextColor={Colors.textLight}
          value={title}
          onChangeText={setTitle}
          maxLength={50}
        />
        <Text style={s.charCount}>{title.length}/50</Text>
      </View>

      {/* 설명 */}
      <View style={[s.section, { paddingTop: 4 }]}>
        <Text style={s.label}>자세한 설명</Text>
        <TextInput
          style={s.textarea}
          placeholder={'어떤 도움이 필요한지 자세히 적어주세요.\n\n상황을 자세히 설명할수록 더 빠르게 매칭됩니다.'}
          placeholderTextColor={Colors.textLight}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={s.charCount}>{description.length}/500</Text>
      </View>

      {/* 도움 방식 */}
      <View style={[s.section, { paddingTop: 4 }]}>
        <Text style={s.label}>도움 방식</Text>
        <View style={s.methodRow}>
          {METHODS.map((method) => (
            <TouchableOpacity
              key={method}
              style={[s.methodChip, selectedMethod === method && s.methodChipActive]}
              onPress={() => setSelectedMethod(method)}
            >
              <Text style={s.methodChipEmoji}>{METHOD_ICON[method]}</Text>
              <Text style={[s.methodChipText, selectedMethod === method && s.methodChipTextActive]}>
                {METHOD_LABEL[method]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 장소 (오프라인) */}
      {selectedMethod === 'OFFLINE' && (
        <View style={s.section}>
          <Text style={s.label}>만날 장소 <Text style={s.optional}>(선택)</Text></Text>
          <TextInput
            style={s.input}
            placeholder="예: 국민대 도서관, 정문 카페"
            placeholderTextColor={Colors.textLight}
            value={location}
            onChangeText={setLocation}
          />
        </View>
      )}

      {/* 희망 일정 */}
      <View style={s.section}>
        <Text style={s.label}>희망 일정 <Text style={s.optional}>(선택)</Text></Text>
        <View style={s.chipRow}>
          {SCHEDULE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[s.optionChip, schedule === opt && s.optionChipActive]}
              onPress={() => setSchedule(schedule === opt ? null : opt)}
            >
              <Text style={[s.optionChipText, schedule === opt && s.optionChipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 제출 버튼 */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.submitBtn, isSubmitting && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting
            ? <ActivityIndicator color={Colors.textWhite} />
            : <Text style={s.submitBtnText}>작성 완료</Text>
          }
        </TouchableOpacity>
      </View>

    </View>
    </TouchableWithoutFeedback>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: s(16),
    marginVertical: s(12),
    backgroundColor: Colors.surface,
    borderRadius: s(20),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.08,
    shadowRadius: s(10),
    elevation: 3,
  },
  section: {
    paddingHorizontal: s(16),
    paddingTop: s(16),
    paddingBottom: s(4),
  },
  label: {
    fontSize: s(15),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: s(12),
  },
  divider: {
    height: s(8),
    backgroundColor: Colors.background,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(10),
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    paddingHorizontal: s(14),
    paddingVertical: s(10),
    borderRadius: s(10),
    borderWidth: s(1.5),
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EBF4FF',
  },
  categoryChipEmoji: { fontSize: s(16) },
  categoryChipText: {
    fontSize: s(14),
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryChipTextActive: { color: Colors.primary },
  input: {
    fontSize: s(16),
    color: Colors.textPrimary,
    paddingVertical: s(12),
    paddingHorizontal: s(14),
    borderWidth: s(1),
    borderColor: Colors.border,
    borderRadius: s(10),
    backgroundColor: Colors.background,
  },
  textarea: {
    fontSize: s(15),
    color: Colors.textPrimary,
    paddingVertical: s(14),
    paddingHorizontal: s(14),
    borderWidth: s(1),
    borderColor: Colors.border,
    borderRadius: s(10),
    backgroundColor: Colors.background,
    height: s(100),
    lineHeight: s(22),
  },
  charCount: {
    fontSize: s(12),
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: s(6),
  },
  methodRow: {
    flexDirection: 'row',
    gap: s(10),
  },
  methodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: s(14),
    borderRadius: s(12),
    borderWidth: s(1.5),
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: s(6),
  },
  methodChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EBF4FF',
  },
  methodChipEmoji: { fontSize: s(22) },
  methodChipText: {
    fontSize: s(13),
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  methodChipTextActive: { color: Colors.primary },
  optional: {
    fontSize: s(12),
    fontWeight: '400',
    color: Colors.textLight,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(8),
  },
  optionChip: {
    paddingHorizontal: s(14),
    paddingVertical: s(8),
    borderRadius: s(20),
    borderWidth: s(1.5),
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EBF4FF',
  },
  optionChipText: {
    fontSize: s(13),
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  optionChipTextActive: { color: Colors.primary },
  footer: {
    padding: s(16),
    paddingBottom: Platform.OS === 'ios' ? s(32) : s(16),
    marginTop: s(48),
  },
  submitBtn: {
    backgroundColor: '#3B6FE8',
    paddingVertical: s(16),
    borderRadius: s(12),
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: Colors.textWhite,
    fontSize: s(17),
    fontWeight: '700',
  },
});

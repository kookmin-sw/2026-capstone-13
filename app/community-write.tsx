// 커뮤니티 글쓰기 화면
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
  Image, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import { createCommunityPost } from '../services/communityService';
import { useAuthStore } from '../stores/authStore';
import type { PostCategory } from '../types';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';
const MAX_IMAGES = 4;

const CATEGORIES: { key: PostCategory; label: string; emoji: string; color: string }[] = [
  { key: 'INFO',     label: '정보공유', emoji: '📢', color: '#3B82F6' },
  { key: 'QUESTION', label: '질문',    emoji: '❓', color: '#F59E0B' },
  { key: 'CHAT',     label: '잡담',    emoji: '💬', color: '#10B981' },
  { key: 'CULTURE',  label: '문화교류', emoji: '🌏', color: '#8B5CF6' },
];

export default function CommunityWriteScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [selectedCategory, setSelectedCategory] = useState<PostCategory | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const isSubmitEnabled = selectedCategory !== null && title.trim().length > 0 && content.trim().length > 0;

  const handleAddImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('알림', `사진은 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`);
      return;
    }

    Alert.alert('사진 첨부', '방법을 선택해주세요', [
      {
        text: '카메라',
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
          if (!result.canceled && result.assets[0]) {
            setImages((prev) => [...prev, result.assets[0].uri]);
          }
        },
      },
      {
        text: '갤러리',
        onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            setImages((prev) => [...prev, result.assets[0].uri]);
          }
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!isSubmitEnabled || !selectedCategory) return;

    try {
      await createCommunityPost({
        category: selectedCategory,
        title: title.trim(),
        content: content.trim(),
        images,
      });
      router.back();
    } catch {
      Alert.alert('오류', '게시글 등록에 실패했습니다.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>커뮤니티 글쓰기</Text>
        <TouchableOpacity
          style={[styles.submitBtn, !isSubmitEnabled && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isSubmitEnabled}
        >
          <Text style={[styles.submitBtnText, !isSubmitEnabled && styles.submitBtnTextDisabled]}>등록</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* 카테고리 */}
        <View style={styles.section}>
          <Text style={styles.label}>카테고리 <Text style={styles.required}>*</Text></Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryChip,
                    isActive && { borderColor: cat.color, backgroundColor: cat.color + '18' },
                  ]}
                  onPress={() => setSelectedCategory(cat.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryLabel, isActive && { color: cat.color, fontWeight: '700' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* 제목 */}
        <View style={styles.section}>
          <Text style={styles.label}>제목 <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="제목을 입력해주세요"
            placeholderTextColor={Colors.textLight}
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
          <Text style={styles.charCount}>{title.length} / 50</Text>
        </View>

        <View style={styles.divider} />

        {/* 내용 */}
        <View style={styles.section}>
          <Text style={styles.label}>내용 <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.textarea}
            placeholder={'자유롭게 내용을 작성해주세요.\n\n정보, 질문, 잡담 모두 환영합니다 😊'}
            placeholderTextColor={Colors.textLight}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{content.length} / 1000</Text>
        </View>

        <View style={styles.divider} />

        {/* 사진 첨부 */}
        <View style={styles.section}>
          <View style={styles.photoHeader}>
            <Text style={styles.label}>사진 첨부</Text>
            <Text style={styles.photoCount}>{images.length} / {MAX_IMAGES}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoScroll}>
            {/* 추가 버튼 */}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.photoAddBtn} onPress={handleAddImage} activeOpacity={0.7}>
                <View style={styles.photoAddIconWrap}>
                  <Ionicons name="camera-outline" size={22} color={PRIMARY} />
                </View>
                <Text style={styles.photoAddText}>사진 추가</Text>
              </TouchableOpacity>
            )}

            {/* 첨부된 사진 목록 */}
            {images.map((uri, index) => (
              <View key={index} style={styles.photoThumbWrap}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => handleRemoveImage(index)}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  submitBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: PRIMARY, borderRadius: 20,
  },
  submitBtnDisabled: { backgroundColor: '#E5E7EB' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  submitBtnTextDisabled: { color: '#9CA3AF' },

  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, paddingVertical: 20 },
  label: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  required: { color: '#EF4444' },
  divider: { height: 8, backgroundColor: Colors.background },

  // 카테고리
  categoryRow: { flexDirection: 'row', gap: 10 },
  categoryChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12, gap: 6,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryEmoji: { fontSize: 20 },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  // 입력
  input: {
    fontSize: 15, color: Colors.textPrimary,
    paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, backgroundColor: Colors.background,
  },
  textarea: {
    fontSize: 15, color: Colors.textPrimary,
    paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, backgroundColor: Colors.background,
    height: 180, lineHeight: 22,
  },
  charCount: { fontSize: 12, color: Colors.textLight, textAlign: 'right', marginTop: 6 },

  // 사진 첨부
  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  photoCount: { fontSize: 13, color: Colors.textLight },
  photoScroll: { gap: 10, paddingBottom: 4 },
  photoAddBtn: {
    width: 90, height: 90, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 6,
    backgroundColor: Colors.background,
  },
  photoAddIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  photoAddText: { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  photoThumbWrap: { position: 'relative' },
  photoThumb: { width: 90, height: 90, borderRadius: 12 },
  photoRemoveBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#FFFFFF', borderRadius: 10,
  },

  bottomPadding: { height: 40 },
});

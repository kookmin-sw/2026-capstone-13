// 커뮤니티 글쓰기 화면
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
  Image, FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { s } from '../utils/scale';
import { Colors } from '../constants/colors';
import { createCommunityPost, updateCommunityPost, uploadCommunityImage } from '../services/communityService';
import { useAuthStore } from '../stores/authStore';
import type { PostCategory } from '../types';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';
const MAX_IMAGES = 4;

export default function CommunityWriteScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const localEmoji = user?.userType === 'KOREAN' ? '🇰🇷' : user?.userType === 'EXCHANGE' ? '✈️' : '🌍';

  const CATEGORIES: { key: PostCategory; label: string; icon: string; color: string; bg: string }[] = [
    { key: 'INFO',     label: '일반', icon: 'chatbubbles-outline', color: '#3B6FE8', bg: '#EEF4FF' },
    { key: 'QUESTION', label: '로컬', icon: 'location-outline',    color: '#F97316', bg: '#FFF3E8' },
    { key: 'CHAT',     label: '모임', icon: 'people-outline',      color: '#16A34A', bg: '#F0FDF4' },
    { key: 'CULTURE',  label: '장터', icon: 'storefront-outline',  color: '#8B5CF6', bg: '#F5F3FF' },
  ];
  const params = useLocalSearchParams<{ id?: string; category?: string; title?: string; content?: string }>();

  const editId = params.id ? Number(params.id) : null;
  const isEditMode = editId !== null;

  const [selectedCategory, setSelectedCategory] = useState<PostCategory | null>(
    (params.category as PostCategory) ?? null
  );
  const [title, setTitle] = useState(params.title ?? '');
  const [content, setContent] = useState(params.content ?? '');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isSubmitEnabled = selectedCategory !== null && title.trim().length > 0 && content.trim().length > 0 && !uploadingImage;

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
            try {
              setUploadingImage(true);
              const url = await uploadCommunityImage(result.assets[0].uri);
              setImages((prev) => [...prev, url]);
            } catch {
              Alert.alert('오류', '이미지 업로드에 실패했습니다.');
            } finally {
              setUploadingImage(false);
            }
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
            try {
              setUploadingImage(true);
              const url = await uploadCommunityImage(result.assets[0].uri);
              setImages((prev) => [...prev, url]);
            } catch {
              Alert.alert('오류', '이미지 업로드에 실패했습니다.');
            } finally {
              setUploadingImage(false);
            }
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
      if (isEditMode && editId !== null) {
        await updateCommunityPost(editId, { category: selectedCategory, title: title.trim(), content: content.trim(), images });
      } else {
        await createCommunityPost({ category: selectedCategory, title: title.trim(), content: content.trim(), images });
      }
      router.back();
    } catch {
      Alert.alert('오류', isEditMode ? '수정에 실패했습니다.' : '게시글 등록에 실패했습니다.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? '게시글 수정' : '커뮤니티 글쓰기'}</Text>
        <TouchableOpacity
          style={[styles.submitBtn, !isSubmitEnabled && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isSubmitEnabled}
        >
          <Text style={[styles.submitBtnText, !isSubmitEnabled && styles.submitBtnTextDisabled]}>{isEditMode ? '수정' : '등록'}</Text>
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
                  <View style={[styles.categoryIconWrap, { backgroundColor: isActive ? cat.color + '28' : cat.bg }]}>
                    <Ionicons name={cat.icon as never} size={30} color={cat.color} />
                  </View>
                  <Text style={[styles.categoryLabel, isActive && { color: cat.color, fontWeight: '700' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.fieldDivider} />

        {/* 제목 + 내용 */}
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
          <View style={styles.fieldDivider} />
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
          <View style={styles.fieldDivider} />

        {/* 사진 첨부 */}
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
    paddingHorizontal: s(16),
    paddingTop: Platform.OS === 'ios' ? 56 : s(16),
    paddingBottom: s(12),
    borderBottomWidth: s(1), borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerBtn: { width: s(40), alignItems: 'center' },
  headerTitle: { fontSize: s(17), fontWeight: '700', color: Colors.textPrimary },
  submitBtn: {
    paddingHorizontal: s(16), paddingVertical: s(8),
    backgroundColor: PRIMARY, borderRadius: s(20),
  },
  submitBtnDisabled: { backgroundColor: '#E5E7EB' },
  submitBtnText: { fontSize: s(14), fontWeight: '700', color: '#FFFFFF' },
  submitBtnTextDisabled: { color: '#9CA3AF' },

  scroll: { flex: 1 },
  section: { paddingHorizontal: s(16), paddingVertical: s(20) },
  label: { fontSize: s(15), fontWeight: '700', color: Colors.textPrimary, marginBottom: s(12) },
  required: { color: '#EF4444' },
  divider: { height: s(8), backgroundColor: Colors.background },
  fieldDivider: { height: s(1), backgroundColor: Colors.border, marginVertical: s(16) },

  // 카테고리
  categoryRow: { flexDirection: 'row', gap: s(10) },
  categoryChip: {
    flex: 1, alignItems: 'center', paddingVertical: s(12), gap: s(6),
    borderRadius: s(12),
    backgroundColor: Colors.surface,
  },
  categoryIconWrap: { width: s(56), height: s(56), borderRadius: s(14), justifyContent: 'center', alignItems: 'center' },
  categoryLabel: { fontSize: s(12), fontWeight: '600', color: Colors.textSecondary },

  // 입력
  input: {
    fontSize: s(15), color: Colors.textPrimary,
    paddingVertical: s(12), paddingHorizontal: s(14),
    borderWidth: s(1), borderColor: Colors.border,
    borderRadius: s(10), backgroundColor: Colors.background,
  },
  textarea: {
    fontSize: s(15), color: Colors.textPrimary,
    paddingVertical: s(14), paddingHorizontal: s(14),
    borderWidth: s(1), borderColor: Colors.border,
    borderRadius: s(10), backgroundColor: Colors.background,
    height: s(180), lineHeight: s(22),
  },
  charCount: { fontSize: s(12), color: Colors.textLight, textAlign: 'right', marginTop: s(6) },

  // 사진 첨부
  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s(12) },
  photoCount: { fontSize: s(13), color: Colors.textLight },
  photoScroll: { gap: s(10), paddingBottom: s(4) },
  photoAddBtn: {
    width: s(90), height: s(90), borderRadius: s(12),
    borderWidth: s(1.5), borderColor: Colors.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: s(6),
    backgroundColor: Colors.background,
  },
  photoAddIconWrap: {
    width: s(36), height: s(36), borderRadius: s(18),
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  photoAddText: { fontSize: s(11), color: PRIMARY, fontWeight: '600' },
  photoThumbWrap: { position: 'relative' },
  photoThumb: { width: s(90), height: s(90), borderRadius: s(12) },
  photoRemoveBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#FFFFFF', borderRadius: s(10),
  },

  bottomPadding: { height: s(40) },
});

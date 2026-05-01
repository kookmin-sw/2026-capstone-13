// 게시판 글쓰기 화면
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
  Image, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { s } from '../utils/scale';
import { Colors } from '../constants/colors';
import { createCommunityPost, updateCommunityPost, uploadCommunityImage } from '../services/communityService';
import { useAuthStore } from '../stores/authStore';
import type { PostCategory } from '../types';

const PRIMARY = '#3B6FE8';
const MAX_IMAGES = 4;

const BOARD_TITLE: Record<PostCategory, string> = {
  INFO: '자유게시판', QUESTION: '로컬게시판', CHAT: '모임게시판', CULTURE: '장터게시판',
};

const BOARD_PLACEHOLDER: Record<PostCategory, string> = {
  INFO: '자유롭게 이야기해보세요 😊',
  QUESTION: '우리 지역 이야기를 나눠보세요 📍',
  CHAT: '같이 만날 사람을 모아보세요 🤝',
  CULTURE: '사고 팔고 나눠요 🛍️',
};

export default function CommunityWriteScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ id?: string; category?: string; title?: string; content?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const isEditMode = editId !== null;

  const [selectedCategory] = useState<PostCategory | null>(
    (params.category as PostCategory) ?? null
  );
  const [content, setContent] = useState(params.content ?? '');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isSubmitEnabled = content.trim().length > 0 && !uploadingImage;

  const boardTitle = selectedCategory ? BOARD_TITLE[selectedCategory] : '게시판';
  const placeholder = selectedCategory ? BOARD_PLACEHOLDER[selectedCategory] : '내용을 입력해주세요';

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('알림', `사진은 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`);
      return;
    }
    Alert.alert('사진 첨부', '방법을 선택해주세요', [
      {
        text: '카메라',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.'); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
          if (!result.canceled && result.assets[0]) await uploadAndAdd(result.assets[0].uri);
        },
      },
      {
        text: '갤러리',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) await uploadAndAdd(result.assets[0].uri);
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const uploadAndAdd = async (uri: string) => {
    try {
      setUploadingImage(true);
      const url = await uploadCommunityImage(uri);
      setImages((prev) => [...prev, url]);
    } catch {
      Alert.alert('오류', '이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!isSubmitEnabled || !selectedCategory) return;
    const trimmed = content.trim();
    const autoTitle = trimmed.slice(0, 20);
    try {
      if (isEditMode && editId !== null) {
        await updateCommunityPost(editId, { category: selectedCategory, title: autoTitle, content: trimmed, images });
      } else {
        await createCommunityPost({ category: selectedCategory, title: autoTitle, content: trimmed, images });
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
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? '게시글 수정' : `${boardTitle} 글쓰기`}
        </Text>
        <TouchableOpacity
          style={[styles.submitBtn, !isSubmitEnabled && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isSubmitEnabled}
        >
          <Text style={[styles.submitBtnText, !isSubmitEnabled && styles.submitBtnTextDisabled]}>
            {isEditMode ? '수정' : '게시'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 본문 입력 */}
        <TextInput
          style={styles.contentInput}
          placeholder={placeholder}
          placeholderTextColor={Colors.textLight}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          maxLength={1000}
          autoFocus
        />

        {/* 이미지 슬롯: 본문 바로 아래 */}
        <View style={styles.imageBar}>
          {images.map((uri, index) => (
            <View key={index} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveImage(index)}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < MAX_IMAGES && (
            <TouchableOpacity style={styles.addThumb} onPress={pickImage} disabled={uploadingImage}>
              {uploadingImage
                ? <ActivityIndicator size="small" color={PRIMARY} />
                : <Ionicons name="add" size={28} color={Colors.textLight} />}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>


    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingTop: Platform.OS === 'ios' ? 70 : s(28),
    paddingBottom: s(12),
    backgroundColor: '#fff',
  },
  closeBtn: {
    width: s(36), height: s(36), alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: s(18),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  headerTitle: { fontSize: s(19), fontWeight: '700', color: Colors.textPrimary },
  submitBtn: {
    paddingHorizontal: s(18), paddingVertical: s(8),
    backgroundColor: PRIMARY, borderRadius: s(20),
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: '#E5E7EB', shadowOpacity: 0, elevation: 0 },
  submitBtnText: { fontSize: s(14), fontWeight: '700', color: '#fff' },
  submitBtnTextDisabled: { color: '#9CA3AF' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: s(18), paddingTop: s(16), paddingBottom: s(20) },

  contentInput: {
    fontSize: s(17), color: Colors.textPrimary,
    lineHeight: s(26),
  },

  imageBar: {
    flexDirection: 'row', gap: s(10),
    paddingTop: s(16),
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: s(100), height: s(100), borderRadius: s(10) },
  removeBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#fff', borderRadius: s(10),
  },
  addThumb: {
    width: s(100), height: s(100), borderRadius: s(10),
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.background,
  },

});

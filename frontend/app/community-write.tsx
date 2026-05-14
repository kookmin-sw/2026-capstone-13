// 게시판 글쓰기 화면
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
  Image, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { s } from '../utils/scale';
import { Colors } from '../constants/colors';
import { createCommunityPost, updateCommunityPost, uploadCommunityImage } from '../services/communityService';
import type { PostCategory } from '../types';

const PRIMARY = '#3B6FE8';
const MAX_IMAGES = 4;

export default function CommunityWriteScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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

  const boardTitle = selectedCategory ? t(`community.board_${selectedCategory}`) : t('community.title');
  const placeholder = selectedCategory ? t(`community.boardPlaceholder_${selectedCategory}`) : t('community.postPlaceholder');

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert(t('common.confirm'), t('community.maxImagesReached', { count: MAX_IMAGES }));
      return;
    }
    Alert.alert(t('community.attachPhoto'), t('community.choosePhotoMethod'), [
      {
        text: t('profile.takePhoto'),
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert(t('profile.permissionNeeded'), t('profile.cameraPermission')); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
          if (!result.canceled && result.assets[0]) await uploadAndAdd(result.assets[0].uri);
        },
      },
      {
        text: t('profile.selectFromGallery'),
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert(t('profile.permissionNeeded'), t('profile.galleryPermission')); return; }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) await uploadAndAdd(result.assets[0].uri);
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const uploadAndAdd = async (uri: string) => {
    try {
      setUploadingImage(true);
      const url = await uploadCommunityImage(uri);
      setImages((prev) => [...prev, url]);
    } catch {
      Alert.alert(t('common.error'), t('errors.imageUploadFailed'));
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
      Alert.alert(t('common.error'), isEditMode ? t('community.updateFailed') : t('community.createFailed'));
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
          {isEditMode ? t('community.editPost') : `${boardTitle} ${t('community.write')}`}
        </Text>
        <TouchableOpacity
          style={[styles.submitBtn, !isSubmitEnabled && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isSubmitEnabled}
        >
          <Text style={[styles.submitBtnText, !isSubmitEnabled && styles.submitBtnTextDisabled]}>
            {isEditMode ? t('common.edit') : t('community.publish')}
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

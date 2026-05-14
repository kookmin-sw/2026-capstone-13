// 도움 요청 글쓰기 / 수정 화면
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { createHelpRequest, updateHelpRequest } from '../../services/helpService';
import { useHelpRequestStore } from '../../stores/helpRequestStore';
import type { HelpCategory, HelpMethod } from '../../types';
import { s } from '../../utils/scale';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-0a6f.up.railway.app/api';

const uploadImage = async (uri: string): Promise<string> => {
  const token = await SecureStore.getItemAsync('accessToken');
  const rawName = uri.split('/').pop() ?? 'image.jpg';
  const match = /\.(\w+)$/.exec(rawName);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const filename = match ? rawName : `image_${Date.now()}.jpg`;
  const formData = new FormData();
  formData.append('file', { uri, name: filename, type } as unknown as Blob);
  const response = await fetch(`${BASE_URL}/community/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) throw new Error('이미지 업로드 실패');
  const json = await response.json();
  return json.data.url;
};

const BLUE   = '#3B6FE8';
const BLUE_L = '#EEF4FF';
const ORANGE = '#F97316';
const T1     = '#0C1C3C';
const T2     = '#AABBCC';
const BG     = '#F0F4FA';
const DIV    = '#D4E4FF';

const CATEGORIES: HelpCategory[] = ['BANK', 'SCHOOL', 'DAILY', 'OTHER'];
const METHODS = ['CHAT', 'OFFLINE'] as const satisfies readonly HelpMethod[];

const CATEGORY_ICON: Record<HelpCategory, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  BANK:     { name: 'business-outline',                   color: '#3B6FE8' },
  HOSPITAL: { name: 'medkit-outline',                     color: '#EF4444' },
  SCHOOL:   { name: 'book-outline',                       color: '#8B5CF6' },
  DAILY:    { name: 'home-outline',                       color: '#F97316' },
  OTHER:    { name: 'ellipsis-horizontal-circle-outline', color: '#6B7280' },
};
const SCHEDULE_OPTIONS = ['오늘', '이번 주', '아무때나'] as const;

export default function WriteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { addRequest } = useHelpRequestStore();
  const params = useLocalSearchParams<{
    editId?: string;
    editTitle?: string;
    editDescription?: string;
    editCategory?: HelpCategory;
    editMethod?: HelpMethod;
    editSchedule?: string;
    editLanguage?: string;
    editLocation?: string;
    editImages?: string;
  }>();

  const isEditMode = !!params.editId;

  const [title, setTitle]                       = useState(params.editTitle ?? '');
  const [description, setDescription]           = useState(params.editDescription ?? '');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(params.editCategory ?? null);
  const [selectedMethod, setSelectedMethod]     = useState<HelpMethod | null>(params.editMethod ?? null);
  const [schedule, setSchedule]                 = useState<string | null>(params.editSchedule || null);
  const [language, setLanguage]                 = useState(params.editLanguage ?? '');
  const [location, setLocation]                 = useState(params.editLocation ?? '');
  const [images, setImages]                     = useState<string[]>(params.editImages ? params.editImages.split(',').filter(Boolean) : []);
  const [isUploading, setIsUploading]           = useState(false);
  const [isSubmitting, setIsSubmitting]         = useState(false);

  const categoryLabel: Record<HelpCategory, string> = {
    BANK: t('write.categoryAdmin'),
    HOSPITAL: t('requests.category.hospital'),
    SCHOOL: t('write.categoryAcademic'),
    DAILY: t('write.categoryLife'),
    OTHER: t('requests.category.other'),
  };

  const methodLabel: Record<(typeof METHODS)[number], string> = {
    CHAT: t('write.methodOnline'),
    OFFLINE: t('write.methodOffline'),
  };

  const scheduleLabel: Record<(typeof SCHEDULE_OPTIONS)[number], string> = {
    오늘: t('write.scheduleToday'),
    '이번 주': t('write.scheduleThisWeek'),
    아무때나: t('write.scheduleAnytime'),
  };

  const handlePickImage = async () => {
    if (images.length >= 3) { Alert.alert(t('changePassword.notice'), t('write.maxImages', { count: 3 })); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(t('profile.permissionNeeded'), t('profile.galleryPermission')); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setIsUploading(true);
    try {
      const url = await uploadImage(result.assets[0].uri);
      setImages(prev => [...prev, url]);
    } catch {
      Alert.alert(t('common.error'), t('errors.imageUploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const isValid = !!selectedCategory && title.trim().length > 0 && description.trim().length > 0 && !!selectedMethod && language.trim().length > 0 && !!schedule;

  const handleSubmit = async () => {
    if (!selectedCategory)    { Alert.alert(t('changePassword.notice'), t('write.selectCategory')); return; }
    if (!title.trim())        { Alert.alert(t('changePassword.notice'), t('write.enterTitle')); return; }
    if (!description.trim())  { Alert.alert(t('changePassword.notice'), t('write.enterDescription')); return; }
    if (!selectedMethod)      { Alert.alert(t('changePassword.notice'), t('write.selectMethod')); return; }
    if (!language.trim())     { Alert.alert(t('changePassword.notice'), t('write.enterLanguage')); return; }
    if (!schedule)            { Alert.alert(t('changePassword.notice'), t('write.selectSchedule')); return; }

    setIsSubmitting(true);

    const metaLines: string[] = [];
    if (schedule) metaLines.push(`희망일정:${schedule}`);
    if (language.trim()) metaLines.push(`언어:${language.trim()}`);
    if (selectedMethod === 'OFFLINE' && location.trim()) metaLines.push(`장소:${location.trim()}`);
    if (images.length > 0) metaLines.push(`사진:${images.join(',')}`);
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
        if (!isEditMode) addRequest(response.data);
        Alert.alert(t('common.done'), isEditMode ? t('write.requestUpdated') : t('write.requestCreated'), [
          { text: t('common.confirm'), onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(t('chat.failed'), response.message ?? t('write.registerFailed'));
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      if (status === 401 || status === 403) {
        Alert.alert(t('write.loginRequired'), t('write.loginRequiredDesc'));
      } else {
        Alert.alert(t('common.error'), t('write.serverErrorWithStatus', { status: status ?? '?', message: serverMsg ?? t('write.tryLater') }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={T1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? t('write.editTitle') : t('write.createTitle')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} automaticallyAdjustKeyboardInsets>

          <View style={styles.section}>

            {/* 1. 도움 종류 */}
            <Text style={styles.sectionTitle}>{t('write.category')}</Text>
            <View style={styles.divider} />
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                  onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  <Ionicons
                    name={CATEGORY_ICON[cat].name}
                    size={s(18)}
                    color={selectedCategory === cat ? CATEGORY_ICON[cat].color : T2}
                  />
                  <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>
                    {categoryLabel[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 2. 제목 + 설명 */}
            <Text style={[styles.sectionTitle, { marginTop: s(20) }]}>{t('write.post')}</Text>
            <View style={styles.divider} />
            <TextInput
              style={styles.input}
              placeholder={t('write.titlePlaceholder')}
              placeholderTextColor={T2}
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />
            <View style={styles.divider} />
            <TextInput
              style={styles.textarea}
              placeholder={t('write.descriptionPlaceholder')}
              placeholderTextColor={T2}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>

            <View style={styles.sectionDivider} />

            {/* 3. 사진 첨부 */}
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>{t('write.photo')} <Text style={styles.optional}>({t('write.optional')})</Text></Text>
              <TouchableOpacity
                style={styles.photoAddBtn}
                onPress={handlePickImage}
                disabled={isUploading || images.length >= 3}
                activeOpacity={0.8}
              >
                {isUploading
                  ? <ActivityIndicator size="small" color={BLUE} />
                  : <Ionicons name="camera-outline" size={s(18)} color={BLUE} />
                }
                <Text style={styles.photoAddBtnText}>{images.length}/3</Text>
              </TouchableOpacity>
            </View>
            {images.length > 0 && (
              <View style={styles.photoRow}>
                {images.map((uri, idx) => (
                  <View key={idx} style={styles.photoWrap}>
                    <Image source={{ uri }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <Ionicons name="close" size={s(12)} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.sectionDivider} />

            {/* 4. 도움 방식 */}
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>{t('write.helpMethod')}</Text>
              <View style={styles.methodRow}>
                {METHODS.map((method) => {
                  const isSelected = selectedMethod === method;
                  const color = method === 'OFFLINE' ? ORANGE : BLUE;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodChip,
                        isSelected
                          ? { borderColor: color, backgroundColor: method === 'OFFLINE' ? '#FFF3E0' : BLUE_L }
                          : styles.methodChipUnselected,
                      ]}
                      onPress={() => setSelectedMethod(selectedMethod === method ? null : method)}
                    >
                      <View style={[styles.methodDot, { backgroundColor: isSelected ? color : '#D1D5DB' }]} />
                      <Text style={[styles.methodChipText, isSelected ? { color } : styles.methodChipTextOff]}>
                        {methodLabel[method]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionDivider} />

            {/* 5. 희망 언어 */}
            <Text style={styles.sectionTitle}>{t('write.desiredLanguage')}</Text>
            <TextInput
              style={[styles.input, { marginTop: s(12) }]}
              placeholder={t('write.languageExample')}
              placeholderTextColor={T2}
              value={language}
              onChangeText={setLanguage}
            />

            {/* 6. 장소 (오프라인) */}
            {selectedMethod === 'OFFLINE' && (
              <>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>{t('write.meetPlace')}</Text>
                <TextInput
                  style={[styles.input, { marginTop: s(12) }]}
                  placeholder={t('write.placeExample')}
                  placeholderTextColor={T2}
                  value={location}
                  onChangeText={setLocation}
                />
              </>
            )}

            <View style={styles.sectionDivider} />

            {/* 7. 희망 일정 */}
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>{t('write.schedule')}</Text>
              <View style={styles.chipRow}>
                {SCHEDULE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.optionChip, schedule === opt && styles.optionChipActive]}
                    onPress={() => setSchedule(schedule === opt ? null : opt)}
                  >
                    <Text style={[styles.optionChipText, schedule === opt && styles.optionChipTextActive]}>{scheduleLabel[opt]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>

        </ScrollView>
      </TouchableWithoutFeedback>

    {/* 하단 고정 버튼 */}
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.submitBtn, !isValid && styles.submitBtnInactive, isSubmitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.85}
      >
        {isSubmitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnText}>{isEditMode ? t('write.editDone') : t('write.submitDone')}</Text>
        }
      </TouchableOpacity>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingTop: Platform.OS === 'ios' ? s(56) : s(16),
    paddingBottom: s(12),
    borderBottomWidth: 1, borderBottomColor: DIV,
    backgroundColor: '#fff',
  },
  headerBtn:   { width: s(40), alignItems: 'center' },
  headerTitle: { fontSize: s(17), fontWeight: '700', color: T1 },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: s(16), paddingVertical: s(12), paddingBottom: s(40) },

  section: {
    backgroundColor: '#fff', borderRadius: s(20), padding: s(16),
    shadowColor: '#000', shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.12, shadowRadius: s(12), elevation: 6,
  },

  sectionTitle: { fontSize: s(18), fontWeight: '800', color: T1 },
  divider:      { height: 1, backgroundColor: DIV, marginTop: s(10), marginBottom: s(12) },
  sectionDivider: { height: 1, backgroundColor: DIV, marginVertical: s(20) },
  optional:     { fontSize: s(13), fontWeight: '500', color: T2 },
  charCount:    { fontSize: s(12), color: T2, textAlign: 'right', marginTop: s(6) },
  rowBetween:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  categoryGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: s(8) },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: s(6),
    paddingHorizontal: s(14), paddingVertical: s(10),
    borderRadius: s(12), borderWidth: s(1.5), borderColor: DIV, backgroundColor: BG,
  },
  catChipActive:     { borderColor: BLUE, backgroundColor: BLUE_L },
  catChipText:       { fontSize: s(14), fontWeight: '600', color: T2 },
  catChipTextActive: { color: BLUE, fontWeight: '700' },

  input: {
    fontSize: s(15), color: T1,
    paddingVertical: s(12), paddingHorizontal: s(14),
    borderWidth: 1, borderColor: DIV, borderRadius: s(12), backgroundColor: BG,
  },
  inlineInput: {
    fontSize: s(14), color: T1,
    paddingVertical: s(8), paddingHorizontal: s(12),
    borderWidth: 1, borderColor: DIV, borderRadius: s(12), backgroundColor: BG,
    width: s(110), textAlign: 'left',
  },
  textarea: {
    fontSize: s(15), color: T1,
    paddingVertical: s(14), paddingHorizontal: s(14),
    borderWidth: 1, borderColor: DIV, borderRadius: s(12), backgroundColor: BG,
    height: s(110), lineHeight: s(22),
  },

  methodRow:            { flexDirection: 'row', gap: s(8) },
  methodChip: {
    flexDirection: 'row', alignItems: 'center', gap: s(6),
    paddingHorizontal: s(14), paddingVertical: s(8),
    borderRadius: s(20), borderWidth: s(1.5),
  },
  methodChipUnselected: { backgroundColor: BG, borderColor: DIV },
  methodDot:            { width: s(7), height: s(7), borderRadius: s(4) },
  methodChipText:       { fontSize: s(13), fontWeight: '700' },
  methodChipTextOff:    { color: T2 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8) },
  optionChip: {
    paddingHorizontal: s(18), paddingVertical: s(10),
    borderRadius: s(20), borderWidth: s(1.5), borderColor: DIV, backgroundColor: BG,
  },
  optionChipActive:     { borderColor: BLUE, backgroundColor: BLUE_L },
  optionChipText:       { fontSize: s(13), fontWeight: '600', color: T2 },
  optionChipTextActive: { color: BLUE, fontWeight: '700' },

  photoAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    backgroundColor: BLUE_L, borderRadius: s(20),
    paddingHorizontal: s(12), paddingVertical: s(6),
  },
  photoAddBtnText: { fontSize: s(13), fontWeight: '700', color: BLUE },
  photoRow:        { flexDirection: 'row', gap: s(10), marginTop: s(12), flexWrap: 'wrap' },
  photoWrap:       { position: 'relative' },
  photoThumb:      { width: s(80), height: s(80), borderRadius: s(12), backgroundColor: BG },
  photoRemove: {
    position: 'absolute', top: -s(6), right: -s(6),
    width: s(20), height: s(20), borderRadius: s(10),
    backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center',
  },

  footer: {
    paddingHorizontal: s(32),
    paddingTop: s(12),
    paddingBottom: Platform.OS === 'ios' ? s(32) : s(16),
    backgroundColor: BG,
  },
  submitBtn: {
    backgroundColor: BLUE, paddingVertical: s(16), borderRadius: s(30), alignItems: 'center',
    shadowColor: BLUE, shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.35, shadowRadius: s(20), elevation: 8,
  },
  submitBtnInactive: { backgroundColor: '#D1D5DB', shadowOpacity: 0 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText:     { color: '#fff', fontSize: s(18), fontWeight: '800', letterSpacing: -0.3 },
});

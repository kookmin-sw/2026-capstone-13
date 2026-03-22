// 마이페이지 화면
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../stores/authStore';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';
const COLOR_MALE = '#0EA5E9';
const COLOR_FEMALE = '#DB2777';

interface ProfileDetail {
  bio: string;
  gender: string;
  age: string;
  major: string;
  mbti: string;
  hobbies: string[];
}

const EMPTY_DETAIL: ProfileDetail = { bio: '', gender: '', age: '', major: '', mbti: '', hobbies: [] };

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfileImage, updateProfileDetail } = useAuthStore();
  const [imageMenuVisible, setImageMenuVisible] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileInput, setProfileInput] = useState<ProfileDetail>(EMPTY_DETAIL);
  const [hobbyInput, setHobbyInput] = useState('');

  const userHobbies = user?.hobbies ? user.hobbies.split(',').filter(Boolean) : [];

  const filledCount = [user?.bio, user?.gender, user?.age, user?.major, user?.mbti]
    .filter((v) => v && v.trim() !== '').length + (userHobbies.length > 0 ? 1 : 0);

  const nicknameColor =
    user?.gender === '남자' ? COLOR_MALE :
    user?.gender === '여자' ? COLOR_FEMALE :
    '#1E1B4B';

  const handleOpenProfileModal = () => {
    setProfileInput({
      bio: user?.bio ?? '',
      gender: user?.gender ?? '',
      age: user?.age ?? '',
      major: user?.major ?? '',
      mbti: user?.mbti ?? '',
      hobbies: userHobbies,
    });
    setHobbyInput('');
    setProfileModalVisible(true);
  };

  const handleAddHobby = () => {
    const tag = hobbyInput.trim();
    if (!tag || profileInput.hobbies.length >= 5) return;
    if (profileInput.hobbies.includes(tag)) return;
    setProfileInput((prev) => ({ ...prev, hobbies: [...prev.hobbies, tag] }));
    setHobbyInput('');
  };

  const handleRemoveHobby = (index: number) => {
    setProfileInput((prev) => ({
      ...prev,
      hobbies: prev.hobbies.filter((_, i) => i !== index),
    }));
  };

  const handleSaveProfile = async () => {
    await updateProfileDetail({
      bio: profileInput.bio,
      gender: profileInput.gender,
      age: profileInput.age,
      major: profileInput.major,
      mbti: profileInput.mbti,
      hobbies: profileInput.hobbies.join(','),
    });
    setProfileModalVisible(false);
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃', style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    setImageMenuVisible(false);

    let permissionResult;
    if (source === 'camera') {
      permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    } else {
      permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    if (!permissionResult.granted) {
      Alert.alert('권한 필요', source === 'camera' ? '카메라 접근 권한이 필요합니다.' : '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });

    if (!result.canceled && result.assets[0]) {
      setImageLoadError(false);
      await updateProfileImage(result.assets[0].uri);
    }
  };

  const isKorean = user?.userType === 'KOREAN';

  const MENU_ITEMS = [
    isKorean
      ? { icon: 'heart-outline' as const, label: '내 도움 내역', route: '/my-help-history' }
      : { icon: 'document-text-outline' as const, label: '내 도움 요청', route: '/my-requests' },
    { icon: 'star-outline' as const, label: '후기 관리', route: null },
    { icon: 'settings-outline' as const, label: '설정', route: null },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        {/* 프로필 이미지 */}
        <TouchableOpacity style={styles.avatarWrapper} onPress={() => setImageMenuVisible(true)} activeOpacity={0.8}>
          {/* 파란 기본 아바타는 항상 렌더링 */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.nickname?.charAt(0) ?? '?'}</Text>
          </View>
          {/* 프로필 이미지가 있으면 위에 덮어씌움 */}
          {user?.profileImage?.trim() && !imageLoadError && (
            <Image
              source={{ uri: user.profileImage }}
              style={styles.avatarImageOverlay}
              onError={() => setImageLoadError(true)}
            />
          )}
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <Text style={[styles.nickname, { color: nicknameColor }]}>
          {user?.nickname ?? '사용자'}{user?.age ? `(${user.age})` : ''}
        </Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {user?.userType === 'INTERNATIONAL' ? '🌍 유학생' : '🇰🇷 한국인 학생'}
          </Text>
        </View>
        <Text style={styles.university}>
          {user?.university ?? '국민대학교'}{user?.major ? `(${user.major})` : ''}
        </Text>

        {/* 자기소개 */}
        {user?.bio ? (
          <Text style={styles.detailBio}>{user.bio}</Text>
        ) : null}

        {/* MBTI */}
        {user?.mbti ? (
          <View style={styles.mbtiBlock}>
            <Text style={styles.detailLabel}>MBTI</Text>
            <Text style={styles.detailValue}>{user.mbti}</Text>
          </View>
        ) : null}

        {/* 취미 태그 */}
        {userHobbies.length > 0 && (
          <View style={styles.hobbyBlock}>
            <Text style={styles.detailLabel}>취미</Text>
            <View style={styles.hobbyRow}>
              {userHobbies.map((h) => (
                <View key={h} style={styles.hobbyTag}>
                  <Text style={styles.hobbyTagText}>#{h}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {filledCount < 6 && (
          <TouchableOpacity style={styles.profileCompleteButton} onPress={handleOpenProfileModal} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={15} color={PRIMARY} />
            <Text style={styles.profileCompleteText}>프로필 완성하기 ({filledCount}/6)</Text>
          </TouchableOpacity>
        )}

        {/* 통계 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.rating?.toFixed(1) ?? '0.0'}</Text>
            <Text style={styles.statLabel}>평점</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user?.helpCount ?? 0}</Text>
            <Text style={styles.statLabel}>도움 횟수</Text>
          </View>
        </View>
      </View>

      {/* 메뉴 */}
      <View style={styles.menuCard}>
        {MENU_ITEMS.map((item, idx) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, idx < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
            onPress={() => item.route && router.push(item.route as never)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrap}>
              <Ionicons name={item.icon} size={18} color={PRIMARY} />
            </View>
            <Text style={styles.menuText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>
        ))}
      </View>

      {/* 로그아웃 */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      {/* 프로필 사진 변경 모달 */}
      <Modal transparent animationType="fade" visible={imageMenuVisible} onRequestClose={() => setImageMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setImageMenuVisible(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>프로필 사진 변경</Text>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => handlePickImage('camera')} activeOpacity={0.7}>
              <View style={styles.bottomSheetIconWrap}>
                <Ionicons name="camera-outline" size={20} color={PRIMARY} />
              </View>
              <Text style={styles.bottomSheetItemText}>카메라로 촬영</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetItem} onPress={() => handlePickImage('gallery')} activeOpacity={0.7}>
              <View style={styles.bottomSheetIconWrap}>
                <Ionicons name="image-outline" size={20} color={PRIMARY} />
              </View>
              <Text style={styles.bottomSheetItemText}>갤러리에서 선택</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.bottomSheetCancel} onPress={() => setImageMenuVisible(false)} activeOpacity={0.7}>
              <Text style={styles.bottomSheetCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 프로필 상세 편집 모달 */}
      <Modal transparent animationType="slide" visible={profileModalVisible} onRequestClose={() => setProfileModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.profileSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>프로필 완성하기</Text>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* 자기소개 */}
              <View style={styles.profileFieldWrap}>
                <View style={styles.hobbyLabelRow}>
                  <Text style={styles.profileFieldLabel}>자기소개</Text>
                  <Text style={styles.hobbyCount}>{profileInput.bio.length}/100</Text>
                </View>
                <TextInput
                  style={styles.bioInput}
                  value={profileInput.bio}
                  onChangeText={(text) => setProfileInput((prev) => ({ ...prev, bio: text }))}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={100}
                  textAlignVertical="top"
                />
              </View>

              {/* 성별 */}
              <View style={styles.profileFieldWrap}>
                <Text style={styles.profileFieldLabel}>성별</Text>
                <View style={styles.genderRow}>
                  {['남자', '여자'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderButton, profileInput.gender === g && styles.genderButtonActive]}
                      onPress={() => setProfileInput((prev) => ({ ...prev, gender: g }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.genderButtonText, profileInput.gender === g && styles.genderButtonTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 나이 */}
              <View style={styles.profileFieldWrap}>
                <Text style={styles.profileFieldLabel}>나이</Text>
                <TextInput
                  style={styles.profileFieldInput}
                  value={profileInput.age}
                  onChangeText={(text) => setProfileInput((prev) => ({ ...prev, age: text.replace(/[^0-9]/g, '') }))}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                  maxLength={3}
                />
              </View>

              {/* 학과 */}
              <View style={styles.profileFieldWrap}>
                <Text style={styles.profileFieldLabel}>학과</Text>
                <TextInput
                  style={styles.profileFieldInput}
                  value={profileInput.major}
                  onChangeText={(text) => setProfileInput((prev) => ({ ...prev, major: text }))}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* MBTI */}
              <View style={styles.profileFieldWrap}>
                <Text style={styles.profileFieldLabel}>MBTI</Text>
                <TextInput
                  style={styles.profileFieldInput}
                  value={profileInput.mbti}
                  onChangeText={(text) => setProfileInput((prev) => ({ ...prev, mbti: text.toUpperCase() }))}
                  placeholderTextColor="#9CA3AF"
                  maxLength={4}
                  autoCapitalize="characters"
                />
              </View>

              {/* 취미 */}
              <View style={styles.profileFieldWrap}>
                <View style={styles.hobbyLabelRow}>
                  <Text style={styles.profileFieldLabel}>취미</Text>
                  <Text style={styles.hobbyCount}>({profileInput.hobbies.length}/5)</Text>
                </View>
                {/* 태그 목록 */}
                {profileInput.hobbies.length > 0 && (
                  <View style={styles.hobbyTagList}>
                    {profileInput.hobbies.map((h, i) => (
                      <View key={h} style={styles.hobbyTagEdit}>
                        <Text style={styles.hobbyTagEditText}>#{h}</Text>
                        <TouchableOpacity onPress={() => handleRemoveHobby(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <Ionicons name="close" size={13} color={PRIMARY} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                {/* 입력 */}
                {profileInput.hobbies.length < 5 && (
                  <View style={styles.hobbyInputRow}>
                    <TextInput
                      style={styles.hobbyInputField}
                      value={hobbyInput}
                      onChangeText={setHobbyInput}
                      onSubmitEditing={handleAddHobby}
                      returnKeyType="done"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity style={styles.hobbyAddButton} onPress={handleAddHobby} activeOpacity={0.8}>
                      <Text style={styles.hobbyAddButtonText}>추가</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

            </ScrollView>
            <View style={styles.bioButtonRow}>
              <TouchableOpacity style={styles.bioCancelButton} onPress={() => setProfileModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.bioCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bioSaveButton} onPress={handleSaveProfile} activeOpacity={0.8}>
                <Text style={styles.bioSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F8' },
  scrollContent: { paddingBottom: 32 },

  profileCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.06)',
  },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarImageOverlay: {
    width: 80, height: 80, borderRadius: 40,
    position: 'absolute', top: 0, left: 0,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  nickname: { fontSize: 22, fontWeight: '800', color: '#1E1B4B', marginBottom: 6 },
  typeBadge: {
    backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, marginBottom: 6,
  },
  typeBadgeText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  university: { fontSize: 13, color: '#9CA3AF', marginBottom: 10 },

  detailBio: {
    fontSize: 13, color: '#374151', lineHeight: 18,
    marginBottom: 10, textAlign: 'center',
  },

  profileCompleteButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(79,70,229,0.2)',
    paddingHorizontal: 16, paddingVertical: 10,
    marginBottom: 18,
  },
  profileCompleteText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },

  detailContainer: {
    width: '100%', marginTop: 6, marginBottom: 6,
    backgroundColor: '#F9FAFB', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { flex: 1, alignItems: 'center' },
  detailLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 3, fontWeight: '500' },
  detailValue: { fontSize: 13, color: '#374151', fontWeight: '700' },
  mbtiBlock: {
    alignItems: 'center', marginBottom: 8,
  },
  hobbyBlock: {
    alignItems: 'center', marginBottom: 12,
  },
  hobbyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 },
  hobbyTag: {
    backgroundColor: PRIMARY_LIGHT, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  hobbyTagText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#1E1B4B' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(79,70,229,0.1)' },

  menuCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.06)',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15, gap: 12,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(79,70,229,0.08)' },
  menuIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  menuText: { flex: 1, fontSize: 15, color: '#1E1B4B', fontWeight: '500' },

  logoutButton: {
    marginHorizontal: 16, marginTop: 16,
    padding: 15, borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12,
  },
  bottomSheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 16, fontWeight: '700', color: '#1E1B4B',
    textAlign: 'center', marginBottom: 20,
  },
  bottomSheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  bottomSheetIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  bottomSheetItemText: { fontSize: 15, color: '#1E1B4B', fontWeight: '500' },
  bottomSheetCancel: {
    marginTop: 12, paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 12,
  },
  bottomSheetCancelText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },

  bioInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, fontSize: 14, color: '#1E1B4B',
    minHeight: 100, textAlignVertical: 'top', lineHeight: 20,
    marginBottom: 6,
  },
  bioButtonRow: { flexDirection: 'row', gap: 10 },
  bioCancelButton: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#F3F4F6',
  },
  bioCancelText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  bioSaveButton: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', backgroundColor: PRIMARY,
  },
  bioSaveText: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },

  profileSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12,
    maxHeight: '85%',
  },
  profileFieldWrap: { marginBottom: 18 },
  profileFieldLabel: { fontSize: 13, color: '#374151', fontWeight: '700', marginBottom: 8 },
  profileFieldInput: {
    backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1,
    borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1E1B4B',
  },

  genderRow: { flexDirection: 'row', gap: 10 },
  genderButton: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#F9FAFB',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  genderButtonActive: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  genderButtonText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  genderButtonTextActive: { color: PRIMARY },

  hobbyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  hobbyCount: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  hobbyTagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  hobbyTagEdit: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: PRIMARY_LIGHT, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  hobbyTagEditText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  hobbyInputRow: { flexDirection: 'row', gap: 8 },
  hobbyInputField: {
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1E1B4B',
  },
  hobbyAddButton: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    backgroundColor: PRIMARY, justifyContent: 'center',
  },
  hobbyAddButtonText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
});

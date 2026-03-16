// 마이페이지 화면
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../stores/authStore';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfileImage, updateBio } = useAuthStore();
  const [imageMenuVisible, setImageMenuVisible] = useState(false);
  const [bioModalVisible, setBioModalVisible] = useState(false);
  const [bioInput, setBioInput] = useState(user?.bio ?? '');

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
      await updateProfileImage(result.assets[0].uri);
    }
  };

  const handleOpenBioModal = () => {
    setBioInput(user?.bio ?? '');
    setBioModalVisible(true);
  };

  const handleSaveBio = async () => {
    await updateBio(bioInput.trim());
    setBioModalVisible(false);
  };

  const MENU_ITEMS = [
    { icon: 'document-text-outline', label: '내 도움 요청', route: '/my-requests' },
    { icon: 'star-outline', label: '후기 관리', route: null },
    { icon: 'settings-outline', label: '설정', route: null },
  ] as const;

  return (
    <View style={styles.container}>
      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        {/* 프로필 이미지 */}
        <TouchableOpacity style={styles.avatarWrapper} onPress={() => setImageMenuVisible(true)} activeOpacity={0.8}>
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.nickname?.charAt(0) ?? '?'}</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <Text style={styles.nickname}>{user?.nickname ?? '사용자'}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {user?.userType === 'INTERNATIONAL' ? '🌍 유학생' : '🇰🇷 한국인 학생'}
          </Text>
        </View>
        <Text style={styles.university}>{user?.university ?? '국민대학교'}</Text>

        {/* 자기소개 */}
        <TouchableOpacity style={styles.bioBox} onPress={handleOpenBioModal} activeOpacity={0.7}>
          <Text style={user?.bio ? styles.bioText : styles.bioPlaceholder} numberOfLines={2}>
            {user?.bio ?? '자기소개를 입력해보세요 ✏️'}
          </Text>
          <Ionicons name="pencil-outline" size={14} color="#9CA3AF" style={styles.bioEditIcon} />
        </TouchableOpacity>

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

      {/* 자기소개 편집 모달 */}
      <Modal transparent animationType="fade" visible={bioModalVisible} onRequestClose={() => setBioModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBioModalVisible(false)}>
            <View style={styles.bioSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.bottomSheetHandle} />
              <Text style={styles.bottomSheetTitle}>자기소개</Text>

              <TextInput
                style={styles.bioInput}
                value={bioInput}
                onChangeText={setBioInput}
                placeholder="자신을 소개해주세요 (최대 100자)"
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={100}
                autoFocus
              />
              <Text style={styles.bioCharCount}>{bioInput.length} / 100</Text>

              <View style={styles.bioButtonRow}>
                <TouchableOpacity style={styles.bioCancelButton} onPress={() => setBioModalVisible(false)} activeOpacity={0.7}>
                  <Text style={styles.bioCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bioSaveButton} onPress={handleSaveBio} activeOpacity={0.8}>
                  <Text style={styles.bioSaveText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F8' },

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

  bioBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 18, width: '100%', gap: 8,
  },
  bioText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
  bioPlaceholder: { flex: 1, fontSize: 13, color: '#9CA3AF', lineHeight: 18 },
  bioEditIcon: { flexShrink: 0 },

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

  bioSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12,
  },
  bioInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, fontSize: 14, color: '#1E1B4B',
    minHeight: 100, textAlignVertical: 'top', lineHeight: 20,
    marginBottom: 6,
  },
  bioCharCount: {
    fontSize: 12, color: '#9CA3AF',
    textAlign: 'right', marginBottom: 16,
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
});

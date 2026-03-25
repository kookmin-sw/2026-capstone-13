// 검색 화면
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_REQUESTS } from '../constants/mockData';
import type { HelpRequest, HelpCategory, HelpMethod } from '../types';

const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';

type SearchMode = 'TITLE' | 'TITLE_CONTENT';

const CATEGORY_EMOJI: Record<HelpCategory, string> = {
  BANK: '🏦', HOSPITAL: '🏥', SCHOOL: '🏫', DAILY: '🏠', OTHER: '📌',
};
const CATEGORY_BG: Record<HelpCategory, string> = {
  BANK: '#FEF3C7', HOSPITAL: '#FEE2E2', SCHOOL: '#EDE9FE', DAILY: '#D1FAE5', OTHER: '#F3F4F6',
};
const METHOD_BADGE: Record<HelpMethod, { bg: string; color: string; dot: string; label: string }> = {
  CHAT:       { bg: '#EEF2FF', color: PRIMARY,   dot: PRIMARY,   label: '채팅' },
  VIDEO_CALL: { bg: '#F5F3FF', color: '#7C3AED', dot: '#7C3AED', label: '영상통화' },
  OFFLINE:    { bg: '#FFFBEB', color: '#D97706', dot: '#D97706', label: '오프라인' },
};

function formatTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

// 검색어를 하이라이트 처리해서 렌더링
function HighlightText({ text, keyword, style, numberOfLines }: {
  text: string; keyword: string; style: object; numberOfLines?: number;
}) {
  if (!keyword.trim()) return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;

  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase()
          ? <Text key={i} style={[style, styles.highlight]}>{part}</Text>
          : part
      )}
    </Text>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('TITLE');
  const [results, setResults] = useState<HelpRequest[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    // 화면 진입 시 자동 포커스
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    const keyword = text.trim().toLowerCase();
    if (!keyword) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setHasSearched(true);

    // TODO: 백엔드 연동 시 API 호출로 교체
    const filtered = MOCK_REQUESTS.filter((item) => {
      const inTitle = item.title.toLowerCase().includes(keyword);
      if (searchMode === 'TITLE') return inTitle;
      return inTitle || item.description.toLowerCase().includes(keyword);
    });
    setResults(filtered);
  }, [searchMode]);

  // 검색 모드 변경 시 결과 재필터링
  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    const keyword = query.trim().toLowerCase();
    if (!keyword) return;
    setHasSearched(true);
    const filtered = MOCK_REQUESTS.filter((item) => {
      const inTitle = item.title.toLowerCase().includes(keyword);
      if (mode === 'TITLE') return inTitle;
      return inTitle || item.description.toLowerCase().includes(keyword);
    });
    setResults(filtered);
  };

  const renderItem = useCallback(({ item }: { item: HelpRequest }) => {
    const method = METHOD_BADGE[item.helpMethod];
    const isMatched = item.status === 'MATCHED';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/request-detail', params: { id: item.id } })}
        activeOpacity={0.85}
      >
        <View style={[styles.cardIcon, { backgroundColor: CATEGORY_BG[item.category] }]}>
          <Text style={styles.cardIconEmoji}>{CATEGORY_EMOJI[item.category]}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <HighlightText
              text={item.title}
              keyword={query}
              style={styles.cardTitle}
              numberOfLines={2}
            />
            <View style={[styles.statusBadge, isMatched ? styles.statusMatched : styles.statusOpen]}>
              <Text style={[styles.statusText, isMatched ? styles.statusMatchedText : styles.statusOpenText]}>
                {isMatched ? '대기중' : '모집중'}
              </Text>
            </View>
          </View>
          <HighlightText
            text={item.description}
            keyword={searchMode === 'TITLE_CONTENT' ? query : ''}
            style={styles.cardDesc}
            numberOfLines={2}
          />
          <View style={styles.cardMeta}>
            <View style={styles.cardInfo}>
              <View style={styles.schoolTag}><Text style={styles.schoolTagText}>국민대</Text></View>
              <Text style={styles.timeTag}>{formatTime(item.createdAt)}</Text>
            </View>
            <View style={[styles.methodBadge, { backgroundColor: method.bg }]}>
              <View style={[styles.methodDot, { backgroundColor: method.dot }]} />
              <Text style={[styles.methodText, { color: method.color }]}>{method.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [query, searchMode]);

  return (
    <View style={styles.container}>
      {/* 검색 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1E1B4B" />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <Ionicons name="search-outline" size={16} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="도움 요청 검색"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setHasSearched(false); }}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 검색 범위 토글 */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, searchMode === 'TITLE' && styles.modeBtnActive]}
          onPress={() => handleModeChange('TITLE')}
        >
          <Text style={[styles.modeBtnText, searchMode === 'TITLE' && styles.modeBtnTextActive]}>
            제목
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, searchMode === 'TITLE_CONTENT' && styles.modeBtnActive]}
          onPress={() => handleModeChange('TITLE_CONTENT')}
        >
          <Text style={[styles.modeBtnText, searchMode === 'TITLE_CONTENT' && styles.modeBtnTextActive]}>
            제목 + 내용
          </Text>
        </TouchableOpacity>
      </View>

      {/* 결과 */}
      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          hasSearched ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
              <Text style={styles.emptySubtext}>다른 키워드로 검색해보세요</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💡</Text>
              <Text style={styles.emptyText}>어떤 도움이 필요하신가요?</Text>
              <Text style={styles.emptySubtext}>키워드를 입력하면 도움 요청을 찾아드려요</Text>
            </View>
          )
        }
      />

      {/* 결과 수 표시 */}
      {hasSearched && (
        <View style={styles.resultCount}>
          <Text style={styles.resultCountText}>
            검색 결과 <Text style={styles.resultCountNum}>{results.length}건</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: 'rgba(79,70,229,0.1)',
  },
  backBtn: { padding: 4 },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontSize: 15, color: '#1E1B4B', padding: 0 },

  modeRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(79,70,229,0.08)',
  },
  modeBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(79,70,229,0.15)',
    backgroundColor: '#FFFFFF',
  },
  modeBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  modeBtnTextActive: { color: '#FFFFFF' },

  list: { padding: 14, paddingBottom: 60, gap: 10 },

  // 카드 (home.tsx와 동일 스타일)
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(79,70,229,0.06)',
  },
  cardIcon: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardIconEmoji: { fontSize: 26 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E1B4B', letterSpacing: -0.3, lineHeight: 20, flex: 1 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, flexShrink: 0, marginTop: 1 },
  statusOpen: { backgroundColor: '#D1FAE5' },
  statusMatched: { backgroundColor: PRIMARY_LIGHT },
  statusText: { fontSize: 10, fontWeight: '600' },
  statusOpenText: { color: '#065F46' },
  statusMatchedText: { color: '#3730A3' },
  cardDesc: { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  schoolTag: { backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  schoolTagText: { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  timeTag: { fontSize: 11, color: '#9CA3AF' },
  methodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  methodDot: { width: 6, height: 6, borderRadius: 3 },
  methodText: { fontSize: 11, fontWeight: '600' },

  // 하이라이트
  highlight: { color: PRIMARY, fontWeight: '800', backgroundColor: PRIMARY_LIGHT },

  // 빈 상태
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },

  // 결과 수
  resultCount: {
    position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center',
  },
  resultCountText: { fontSize: 12, color: '#9CA3AF' },
  resultCountNum: { color: PRIMARY, fontWeight: '700' },
});

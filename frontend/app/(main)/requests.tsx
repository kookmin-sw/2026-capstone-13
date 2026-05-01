// 도움 요청 목록 화면
import { useState, useEffect, useCallback } from 'react';
import { s as sc } from '../../utils/scale';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, CategoryLabels, MethodLabels, StatusLabels } from '../../constants/colors';
import { getHelpRequests } from '../../services/helpService';
import type { HelpRequest, RequestStatus } from '../../types';

const STATUS_COLORS: Record<RequestStatus, string> = {
  WAITING: Colors.warning,
  MATCHED: Colors.info,
  IN_PROGRESS: Colors.primary,
  COMPLETED: Colors.success,
  CANCELLED: Colors.error,
};

export default function RequestsScreen() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await getHelpRequests();
      if (response.success) {
        setRequests(response.data);
      }
    } catch {
      // TODO: 에러 처리
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const renderRequest = useCallback(({ item }: { item: HelpRequest }) => (
    <TouchableOpacity style={styles.requestCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.category}>{CategoryLabels[item.category]}</Text>
        <Text style={[styles.status, { color: STATUS_COLORS[item.status] }]}>
          {StatusLabels[item.status]}
        </Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.method}>{MethodLabels[item.helpMethod]}</Text>
        <Text style={styles.requester}>{item.requester.nickname}</Text>
      </View>
    </TouchableOpacity>
  ), []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>{t('requests.noRequests')}</Text>
            <Text style={styles.emptySubtext}>{t('requests.noRequestsDesc')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  list: {
    padding: sc(16),
    gap: sc(12),
  },
  requestCard: {
    backgroundColor: Colors.surface,
    borderRadius: sc(12),
    padding: sc(16),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sc(8),
  },
  category: {
    fontSize: sc(13),
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  status: {
    fontSize: sc(13),
    fontWeight: '700',
  },
  title: {
    fontSize: sc(18),
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: sc(4),
  },
  description: {
    fontSize: sc(14),
    color: Colors.textSecondary,
    lineHeight: sc(20),
    marginBottom: sc(12),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  method: {
    fontSize: sc(13),
    color: Colors.primary,
    fontWeight: '600',
  },
  requester: {
    fontSize: sc(13),
    color: Colors.textLight,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: sc(48),
  },
  emptyEmoji: {
    fontSize: sc(48),
    marginBottom: sc(16),
  },
  emptyText: {
    fontSize: sc(18),
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: sc(4),
  },
  emptySubtext: {
    fontSize: sc(14),
    color: Colors.textLight,
  },
});

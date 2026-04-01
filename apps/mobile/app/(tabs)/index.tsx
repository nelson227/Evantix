import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { Heart, MessageCircle, Bookmark } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_LABELS: Record<string, string> = {
  activity_report: 'Rapport',
  testimony: 'Témoignage',
  prayer_request: 'Prière',
  announcement: 'Annonce',
  event: 'Événement',
  encouragement: 'Encouragement',
};

export default function FeedScreen() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { limit: '15' };
      if (pageParam) params.cursor = pageParam;
      const { data } = await api.get('/publications', { params });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const publications = data?.pages.flatMap((p) => p.data) ?? [];
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = ({ item }: { item: Record<string, unknown> }) => {
    const author = item.author as { displayName: string };
    const count = item._count as { comments: number; likes: number };
    const viewer = item.viewerState as { liked: boolean; saved: boolean } | undefined;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.authorName}>{author.displayName}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{TYPE_LABELS[item.type as string] ?? item.type}</Text>
          </View>
        </View>
        <Text style={styles.content}>{item.content as string}</Text>
        <Text style={styles.time}>
          {formatDistanceToNow(new Date(item.createdAt as string), { addSuffix: true, locale: fr })}
        </Text>
        <View style={styles.actions}>
          <View style={styles.actionItem}>
            <Heart
              size={18}
              color={viewer?.liked ? '#ef4444' : Colors.gray[400]}
              fill={viewer?.liked ? '#ef4444' : 'none'}
            />
            {count.likes > 0 && <Text style={styles.actionCount}>{count.likes}</Text>}
          </View>
          <View style={styles.actionItem}>
            <MessageCircle size={18} color={Colors.gray[400]} />
            {count.comments > 0 && <Text style={styles.actionCount}>{count.comments}</Text>}
          </View>
          <View style={styles.actionItem}>
            <Bookmark
              size={18}
              color={viewer?.saved ? Colors.warning : Colors.gray[400]}
              fill={viewer?.saved ? Colors.warning : 'none'}
            />
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </View>
    );
  }

  return (
    <FlatList
      data={publications}
      keyExtractor={(item) => item.id as string}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary[600]} />}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={Colors.primary[600]} /> : null
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Aucune publication</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.gray[500], fontSize: 15 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  authorName: { fontWeight: '600', fontSize: 15, color: Colors.gray[900] },
  typeBadge: { backgroundColor: Colors.primary[50], borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontSize: 11, fontWeight: '500', color: Colors.primary[700] },
  content: { fontSize: 14, color: Colors.gray[700], lineHeight: 20 },
  time: { fontSize: 11, color: Colors.gray[400], marginTop: 8 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.gray[100] },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 12, color: Colors.gray[500] },
});

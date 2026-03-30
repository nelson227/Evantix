import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/lib/colors';
import { Heart, MessageCircle, Share2, Bookmark, Plus, MapPin, User as UserIcon } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';

const { width: SCREEN_W } = Dimensions.get('window');

const TYPE_LABELS: Record<string, string> = {
  past_outreach: 'Rapport',
  future_event: 'Événement',
  testimony: 'Témoignage',
  prayer_request: 'Prière',
};

const TYPE_COLORS: Record<string, string> = {
  past_outreach: Colors.primary[600],
  future_event: Colors.accent[600],
  testimony: Colors.success,
  prayer_request: Colors.warning,
};

export default function FeedScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
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

  const publications = data?.pages.flatMap((p) => p.items ?? []).filter(Boolean) ?? [];
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const likeMutation = useMutation({
    mutationFn: async ({ id, liked }: { id: string; liked: boolean }) => {
      if (liked) {
        await api.delete(`/publications/${id}/like`);
      } else {
        await api.post(`/publications/${id}/like`);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, saved }: { id: string; saved: boolean }) => {
      if (saved) {
        await api.delete(`/publications/${id}/save`);
      } else {
        await api.post(`/publications/${id}/save`);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const shareMutation = useMutation({
    mutationFn: (id: string) => api.post(`/publications/${id}/share`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const renderItem = ({ item }: { item: Record<string, unknown> }) => {
    const author = item.author as { id: string; displayName: string; avatarUrl?: string } | undefined;
    const counters = item.counters as { likesCount: number; commentsCount: number; savesCount: number; sharesCount: number } | undefined;
    const viewerState = item.viewerState as { liked?: boolean; saved?: boolean } | undefined;
    const media = item.media as { id: string; url: string; width: number; height: number }[] | undefined;
    const stats = item.stats as Record<string, number> | undefined;
    const typeColor = TYPE_COLORS[item.type as string] ?? Colors.primary[600];
    const isLiked = viewerState?.liked ?? false;
    const isSaved = viewerState?.saved ?? false;

    return (
      <View style={styles.card}>
        {/* Author header */}
        <View style={styles.cardHeader}>
          <View style={styles.authorRow}>
            <View style={[styles.avatarCircle, { backgroundColor: typeColor + '20' }]}>
              {author?.avatarUrl ? (
                <Image source={{ uri: author.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <UserIcon size={20} color={typeColor} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>{author?.displayName ?? 'Anonyme'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.time}>
                  {item.createdAt ? formatDistanceToNow(new Date(item.createdAt as string), { addSuffix: true, locale: fr }) : ''}
                </Text>
                {item.locationName && (
                  <>
                    <Text style={styles.dot}>·</Text>
                    <MapPin size={11} color={Colors.gray[400]} />
                    <Text style={styles.locationText}>{item.locationName as string}</Text>
                  </>
                )}
              </View>
            </View>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '15' }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>
              {TYPE_LABELS[item.type as string] ?? item.type}
            </Text>
          </View>
        </View>

        {/* Content */}
        <Text style={styles.content}>{(item.narrativeText ?? '') as string}</Text>

        {/* Stats summary if outreach */}
        {stats && Object.values(stats).some(v => typeof v === 'number' && v > 0) && (
          <View style={styles.statsRow}>
            {(stats.peoplePreached ?? 0) > 0 && (
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{stats.peoplePreached} évangélisés</Text>
              </View>
            )}
            {(stats.peoplePrayedFor ?? 0) > 0 && (
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{stats.peoplePrayedFor} priés</Text>
              </View>
            )}
            {(stats.booksDistributedTotal ?? 0) > 0 && (
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>{stats.booksDistributedTotal} livres</Text>
              </View>
            )}
          </View>
        )}

        {/* Media images */}
        {media && media.length > 0 && (
          <View style={styles.mediaContainer}>
            {media.slice(0, 4).map((m, i) => (
              <Image key={m.id || i} source={{ uri: m.url }} style={styles.mediaImage} resizeMode="cover" />
            ))}
          </View>
        )}

        {/* Counters summary */}
        <View style={styles.countersSummary}>
          {(counters?.likesCount ?? 0) > 0 && (
            <Text style={styles.counterText}>{counters!.likesCount} J'aime</Text>
          )}
          <View style={{ flex: 1 }} />
          {(counters?.commentsCount ?? 0) > 0 && (
            <Text style={styles.counterText}>{counters!.commentsCount} commentaire{counters!.commentsCount > 1 ? 's' : ''}</Text>
          )}
          {(counters?.sharesCount ?? 0) > 0 && (
            <Text style={[styles.counterText, { marginLeft: 12 }]}>{counters!.sharesCount} partage{counters!.sharesCount > 1 ? 's' : ''}</Text>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => likeMutation.mutate({ id: item.id as string, liked: isLiked })}
          >
            <Heart size={20} color={isLiked ? '#ef4444' : Colors.gray[500]} fill={isLiked ? '#ef4444' : 'none'} />
            <Text style={[styles.actionLabel, isLiked && { color: '#ef4444' }]}>J'aime</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/comments/${item.id}`)}
          >
            <MessageCircle size={20} color={Colors.gray[500]} />
            <Text style={styles.actionLabel}>Commenter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => shareMutation.mutate(item.id as string)}
          >
            <Share2 size={20} color={Colors.gray[500]} />
            <Text style={styles.actionLabel}>Partager</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => saveMutation.mutate({ id: item.id as string, saved: isSaved })}
          >
            <Bookmark size={20} color={isSaved ? Colors.warning : Colors.gray[500]} fill={isSaved ? Colors.warning : 'none'} />
          </TouchableOpacity>
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
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <FlatList
        data={publications}
        keyExtractor={(item, index) => (item?.id as string) ?? String(index)}
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
            <Text style={styles.emptyText}>Aucune publication pour le moment</Text>
            <Text style={{ color: Colors.gray[400], fontSize: 13, marginTop: 4 }}>
              Appuyez sur + pour créer votre première publication
            </Text>
          </View>
        }
      />

      {/* FAB button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/new-publication')}
        activeOpacity={0.8}
      >
        <Plus size={28} color={Colors.white} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.gray[500], fontSize: 15, fontWeight: '500' },
  card: {
    backgroundColor: Colors.white,
    marginBottom: 8,
    paddingVertical: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },
  authorName: { fontWeight: '700', fontSize: 15, color: Colors.gray[900] },
  time: { fontSize: 12, color: Colors.gray[400] },
  dot: { color: Colors.gray[400], fontSize: 12 },
  locationText: { fontSize: 11, color: Colors.gray[400] },
  typeBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  content: { fontSize: 15, color: Colors.gray[800], lineHeight: 22, paddingHorizontal: 16, marginBottom: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  statChip: { backgroundColor: Colors.primary[50], borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statChipText: { fontSize: 12, color: Colors.primary[700], fontWeight: '500' },
  mediaContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  mediaImage: { width: SCREEN_W / 2, height: 200 },
  countersSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  counterText: { fontSize: 13, color: Colors.gray[500] },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  actionLabel: { fontSize: 13, color: Colors.gray[500], fontWeight: '500' },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});

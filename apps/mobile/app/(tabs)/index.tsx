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
  Alert,
} from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/lib/colors';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Plus,
  MapPin,
  User as UserIcon,
  MoreHorizontal,
  ThumbsUp,
  Globe,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';

const { width: SCREEN_W } = Dimensions.get('window');
const API_ROOT = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace('/api/v1', '');

function mediaUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_ROOT}${url}`;
}

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
      if (liked) await api.delete(`/publications/${id}/like`);
      else await api.post(`/publications/${id}/like`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, saved }: { id: string; saved: boolean }) => {
      if (saved) await api.delete(`/publications/${id}/save`);
      else await api.post(`/publications/${id}/save`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const shareMutation = useMutation({
    mutationFn: (id: string) => api.post(`/publications/${id}/share`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/publications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleMenu = (item: Record<string, unknown>) => {
    Alert.alert('Options', '', [
      {
        text: 'Modifier',
        onPress: () => {/* TODO: edit */},
      },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Supprimer', 'Supprimer cette publication ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(item.id as string) },
          ]);
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const openGallery = (pubId: string, index: number) => {
    router.push({ pathname: '/gallery/[id]', params: { id: pubId, index: String(index) } });
  };

  const renderMediaGrid = (media: { id: string; url: string }[], pubId: string) => {
    const count = media.length;
    if (count === 0) return null;

    if (count === 1) {
      return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => openGallery(pubId, 0)}>
          <Image source={{ uri: mediaUrl(media[0].url) }} style={{ width: SCREEN_W, height: SCREEN_W * 0.75 }} resizeMode="cover" />
        </TouchableOpacity>
      );
    }
    if (count === 2) {
      return (
        <View style={{ flexDirection: 'row' }}>
          {media.map((m, i) => (
            <TouchableOpacity key={m.id} activeOpacity={0.9} onPress={() => openGallery(pubId, i)}>
              <Image source={{ uri: mediaUrl(m.url) }} style={{ width: SCREEN_W / 2, height: SCREEN_W * 0.6 }} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (count === 3) {
      return (
        <View>
          <TouchableOpacity activeOpacity={0.9} onPress={() => openGallery(pubId, 0)}>
            <Image source={{ uri: mediaUrl(media[0].url) }} style={{ width: SCREEN_W, height: SCREEN_W * 0.55 }} resizeMode="cover" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row' }}>
            {media.slice(1, 3).map((m, i) => (
              <TouchableOpacity key={m.id} activeOpacity={0.9} onPress={() => openGallery(pubId, i + 1)}>
                <Image source={{ uri: mediaUrl(m.url) }} style={{ width: SCREEN_W / 2, height: SCREEN_W * 0.38 }} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    const shown = media.slice(0, 4);
    const extra = count - 4;
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {shown.map((m, i) => (
          <TouchableOpacity key={m.id} activeOpacity={0.9} onPress={() => openGallery(pubId, i)} style={{ width: SCREEN_W / 2, height: SCREEN_W * 0.38 }}>
            <Image source={{ uri: mediaUrl(m.url) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            {i === 3 && extra > 0 && (
              <View style={styles.mediaOverlay}>
                <Text style={styles.mediaOverlayText}>+{extra}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Record<string, unknown> }) => {
    const author = item.author as { id: string; displayName: string; avatarUrl?: string } | undefined;
    const counters = item.counters as { likesCount: number; commentsCount: number; savesCount: number; sharesCount: number } | undefined;
    const viewerState = item.viewerState as { liked?: boolean; saved?: boolean; canEdit?: boolean } | undefined;
    const media = (item.media as { id: string; url: string }[] | undefined) ?? [];
    const stats = item.stats as Record<string, number> | undefined;
    const isLiked = viewerState?.liked ?? false;
    const isSaved = viewerState?.saved ?? false;
    const canEdit = viewerState?.canEdit ?? false;

    return (
      <View style={styles.card}>
        {/* ===== HEADER (like Facebook) ===== */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              {author?.avatarUrl ? (
                <Image source={{ uri: mediaUrl(author.avatarUrl) }} style={styles.avatarImg} />
              ) : (
                <UserIcon size={22} color={Colors.gray[400]} />
              )}
            </View>
            <View>
              <Text style={styles.authorName}>{author?.displayName ?? 'Anonyme'}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.time}>
                  {item.createdAt ? formatDistanceToNow(new Date(item.createdAt as string), { addSuffix: true, locale: fr }) : ''}
                </Text>
                <Text style={styles.metaDot}>·</Text>
                <Globe size={11} color={Colors.gray[400]} />
                {item.locationName && (
                  <>
                    <Text style={styles.metaDot}>·</Text>
                    <MapPin size={11} color={Colors.gray[400]} />
                    <Text style={styles.metaText}>{item.locationName as string}</Text>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
          {canEdit && (
            <TouchableOpacity style={styles.menuBtn} onPress={() => handleMenu(item)}>
              <MoreHorizontal size={22} color={Colors.gray[500]} />
            </TouchableOpacity>
          )}
        </View>

        {/* ===== TEXT CONTENT ===== */}
        {item.narrativeText && (
          <Text style={styles.content}>{(item.narrativeText ?? '') as string}</Text>
        )}

        {/* ===== STATS CHIPS (for outreach) ===== */}
        {stats && Object.values(stats).some(v => typeof v === 'number' && v > 0) && (
          <View style={styles.statsRow}>
            {(stats.peoplePreached ?? 0) > 0 && (
              <View style={styles.statChip}><Text style={styles.statChipText}>🗣 {stats.peoplePreached} évangélisés</Text></View>
            )}
            {(stats.peoplePrayedFor ?? 0) > 0 && (
              <View style={styles.statChip}><Text style={styles.statChipText}>🙏 {stats.peoplePrayedFor} priés</Text></View>
            )}
            {(stats.booksDistributedTotal ?? 0) > 0 && (
              <View style={styles.statChip}><Text style={styles.statChipText}>📖 {stats.booksDistributedTotal} livres</Text></View>
            )}
            {(stats.tractsDistributedTotal ?? 0) > 0 && (
              <View style={styles.statChip}><Text style={styles.statChipText}>📄 {stats.tractsDistributedTotal} tracts</Text></View>
            )}
          </View>
        )}

        {/* ===== MEDIA GRID (Facebook style) ===== */}
        {media.length > 0 && renderMediaGrid(media, item.id as string)}

        {/* ===== COUNTERS (like Facebook: "128  15 comments  19 shares") ===== */}
        {((counters?.likesCount ?? 0) > 0 || (counters?.commentsCount ?? 0) > 0 || (counters?.sharesCount ?? 0) > 0) && (
          <View style={styles.countersBar}>
            {(counters?.likesCount ?? 0) > 0 && (
              <View style={styles.likesCounter}>
                <View style={styles.likeIcon}><ThumbsUp size={11} color={Colors.white} /></View>
                <Text style={styles.counterText}>{counters!.likesCount}</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            {(counters?.commentsCount ?? 0) > 0 && (
              <Text style={styles.counterText}>{counters!.commentsCount} commentaire{counters!.commentsCount > 1 ? 's' : ''}</Text>
            )}
            {(counters?.sharesCount ?? 0) > 0 && (
              <Text style={[styles.counterText, { marginLeft: 10 }]}>{counters!.sharesCount} partage{counters!.sharesCount > 1 ? 's' : ''}</Text>
            )}
          </View>
        )}

        {/* ===== ACTION BAR (like Facebook) ===== */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => likeMutation.mutate({ id: item.id as string, liked: isLiked })}
          >
            <ThumbsUp size={20} color={isLiked ? Colors.primary[600] : Colors.gray[500]} fill={isLiked ? Colors.primary[600] : 'none'} />
            <Text style={[styles.actionLabel, isLiked && { color: Colors.primary[600] }]}>J'aime</Text>
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
    <View style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(tabs)/new-publication')} activeOpacity={0.8}>
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
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  authorName: { fontWeight: '700', fontSize: 15, color: Colors.gray[900] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  metaDot: { color: Colors.gray[400], fontSize: 10 },
  metaText: { fontSize: 12, color: Colors.gray[500] },
  time: { fontSize: 12, color: Colors.gray[500] },
  menuBtn: { padding: 6 },

  // Content
  content: {
    fontSize: 15,
    color: Colors.gray[900],
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },

  // Stats
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  statChip: { backgroundColor: '#e7f3ff', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  statChipText: { fontSize: 12, color: Colors.primary[700], fontWeight: '500' },

  // Media
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaOverlayText: { color: Colors.white, fontSize: 28, fontWeight: '700' },

  // Counters
  countersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  likesCounter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: { fontSize: 13, color: Colors.gray[500] },

  // Actions
  actionsBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    paddingVertical: 4,
    marginHorizontal: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  actionLabel: { fontSize: 13, color: Colors.gray[500], fontWeight: '600' },

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

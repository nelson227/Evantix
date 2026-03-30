import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { ThumbsUp, MessageCircle, Share2, ArrowLeft, User as UserIcon } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width: SCREEN_W } = Dimensions.get('window');
const API_ROOT = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace('/api/v1', '');

function mediaUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_ROOT}${url}`;
}

export default function GalleryScreen() {
  const { id, index: initialIndex } = useLocalSearchParams<{ id: string; index: string }>();
  const qc = useQueryClient();
  const startIndex = parseInt(initialIndex ?? '0', 10);

  const { data: publication, isLoading } = useQuery({
    queryKey: ['publication', id],
    queryFn: async () => {
      const { data } = await api.get(`/publications/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: async ({ pubId, liked }: { pubId: string; liked: boolean }) => {
      if (liked) await api.delete(`/publications/${pubId}/like`);
      else await api.post(`/publications/${pubId}/like`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publication', id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: (pubId: string) => api.post(`/publications/${pubId}/share`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publication', id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  if (isLoading || !publication) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </View>
    );
  }

  const author = publication.author as { id: string; displayName: string; avatarUrl?: string };
  const media = (publication.media as { id: string; url: string }[]) ?? [];
  const counters = publication.counters as { likesCount: number; commentsCount: number; sharesCount: number };
  const viewerState = publication.viewerState as { liked?: boolean; saved?: boolean };
  const isLiked = viewerState?.liked ?? false;

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.authorRow}>
        <View style={styles.avatarCircle}>
          {author?.avatarUrl ? (
            <Image source={{ uri: mediaUrl(author.avatarUrl) }} style={styles.avatarImg} />
          ) : (
            <UserIcon size={18} color={Colors.gray[400]} />
          )}
        </View>
        <View>
          <Text style={styles.authorName}>{author?.displayName ?? 'Anonyme'}</Text>
          <Text style={styles.time}>
            {publication.createdAt
              ? formatDistanceToNow(new Date(publication.createdAt as string), { addSuffix: true, locale: fr })
              : ''}
          </Text>
        </View>
      </View>
      {publication.narrativeText ? (
        <Text style={styles.narText}>{publication.narrativeText as string}</Text>
      ) : null}
    </View>
  );

  const renderPhoto = ({ item: m, index: idx }: { item: { id: string; url: string }; index: number }) => (
    <View style={styles.photoCard}>
      <Image
        source={{ uri: mediaUrl(m.url) }}
        style={{ width: SCREEN_W, height: SCREEN_W }}
        resizeMode="contain"
      />
      {/* Counters + actions below each photo */}
      <View style={styles.photoActions}>
        <View style={styles.photoCounters}>
          {(counters?.likesCount ?? 0) > 0 && (
            <View style={styles.likesRow}>
              <View style={styles.likeIcon}>
                <ThumbsUp size={10} color={Colors.white} />
              </View>
              <Text style={styles.counterText}>{counters.likesCount}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {(counters?.commentsCount ?? 0) > 0 && (
            <Text style={styles.counterText}>{counters.commentsCount} commentaire{counters.commentsCount > 1 ? 's' : ''}</Text>
          )}
          {(counters?.sharesCount ?? 0) > 0 && (
            <Text style={[styles.counterText, { marginLeft: 8 }]}>{counters.sharesCount} partage{counters.sharesCount > 1 ? 's' : ''}</Text>
          )}
        </View>
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => likeMutation.mutate({ pubId: id!, liked: isLiked })}
          >
            <ThumbsUp size={18} color={isLiked ? Colors.primary[600] : Colors.gray[500]} fill={isLiked ? Colors.primary[600] : 'none'} />
            <Text style={[styles.actionLabel, isLiked && { color: Colors.primary[600] }]}>J'aime</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/comments/${id}`)}
          >
            <MessageCircle size={18} color={Colors.gray[500]} />
            <Text style={styles.actionLabel}>Commenter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => shareMutation.mutate(id!)}
          >
            <Share2 size={18} color={Colors.gray[500]} />
            <Text style={styles.actionLabel}>Partager</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          Publication de {author?.displayName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={media}
        keyExtractor={(m) => m.id}
        renderItem={renderPhoto}
        ListHeaderComponent={renderHeader}
        initialScrollIndex={startIndex < media.length ? startIndex : 0}
        getItemLayout={(_data, index) => ({
          length: SCREEN_W + 90,
          offset: (SCREEN_W + 90) * index,
          index,
        })}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backBtn: { width: 40 },
  topTitle: { flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 16, color: Colors.gray[900] },

  headerSection: { padding: 14, gap: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  authorName: { fontWeight: '700', fontSize: 14, color: Colors.gray[900] },
  time: { fontSize: 12, color: Colors.gray[500] },
  narText: { fontSize: 15, color: Colors.gray[800], lineHeight: 21 },

  photoCard: { backgroundColor: Colors.white },
  photoActions: { paddingHorizontal: 12 },
  photoCounters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  likesRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: { fontSize: 13, color: Colors.gray[500] },
  actionsBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.gray[200],
    paddingVertical: 4,
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
});

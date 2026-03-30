import { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/lib/colors';
import {
  Send,
  User as UserIcon,
  ThumbsUp,
  MessageCircle,
  Share2,
  MapPin,
  Globe,
  ArrowLeft,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width: SCREEN_W } = Dimensions.get('window');
const API_ROOT = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace('/api/v1', '');

function mediaUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_ROOT}${url}`;
}

export default function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Fetch publication
  const { data: publication, isLoading: pubLoading } = useQuery({
    queryKey: ['publication', id],
    queryFn: async () => {
      const { data } = await api.get(`/publications/${id}`);
      return data;
    },
    enabled: !!id,
  });

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const { data } = await api.get(`/publications/${id}/comments`);
      return data;
    },
    enabled: !!id,
  });

  const comments = Array.isArray(commentsData) ? commentsData : commentsData?.items ?? [];

  // Like publication
  const likeMutation = useMutation({
    mutationFn: async ({ liked }: { liked: boolean }) => {
      if (liked) await api.delete(`/publications/${id}/like`);
      else await api.post(`/publications/${id}/like`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publication', id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: (text: string) => api.post(`/publications/${id}/comments`, { body: text }),
    onSuccess: () => {
      setBody('');
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ['comments', id] });
      qc.invalidateQueries({ queryKey: ['publication', id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  // Share
  const shareMutation = useMutation({
    mutationFn: () => api.post(`/publications/${id}/share`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publication', id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const handleSend = () => {
    const text = replyTo ? `@${replyTo.name} ${body.trim()}` : body.trim();
    if (!text) return;
    addComment.mutate(text);
  };

  const handleReply = (authorName: string, commentId: string) => {
    setReplyTo({ id: commentId, name: authorName });
    inputRef.current?.focus();
  };

  const isLoading = pubLoading || commentsLoading;

  const author = publication?.author as { id: string; displayName: string; avatarUrl?: string } | undefined;
  const counters = publication?.counters as { likesCount: number; commentsCount: number; sharesCount: number } | undefined;
  const viewerState = publication?.viewerState as { liked?: boolean } | undefined;
  const media = (publication?.media as { id: string; url: string }[]) ?? [];
  const isLiked = viewerState?.liked ?? false;

  const renderPublicationHeader = () => {
    if (!publication) return null;
    return (
      <View style={styles.pubSection}>
        {/* Author header */}
        <View style={styles.pubHeader}>
          <View style={styles.avatarCircle}>
            {author?.avatarUrl ? (
              <Image source={{ uri: mediaUrl(author.avatarUrl) }} style={styles.avatarImg} />
            ) : (
              <UserIcon size={20} color={Colors.gray[400]} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{author?.displayName ?? 'Anonyme'}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.time}>
                {publication.createdAt
                  ? formatDistanceToNow(new Date(publication.createdAt as string), { addSuffix: true, locale: fr })
                  : ''}
              </Text>
              <Text style={styles.metaDot}>·</Text>
              <Globe size={11} color={Colors.gray[400]} />
              {publication.locationName && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <MapPin size={11} color={Colors.gray[400]} />
                  <Text style={styles.metaText}>{publication.locationName as string}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Text */}
        {publication.narrativeText ? (
          <Text style={styles.pubText}>{publication.narrativeText as string}</Text>
        ) : null}

        {/* Media (first image only as preview) */}
        {media.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: '/gallery/[id]', params: { id: id!, index: '0' } })}
          >
            <Image
              source={{ uri: mediaUrl(media[0].url) }}
              style={{ width: SCREEN_W, height: SCREEN_W * 0.6 }}
              resizeMode="cover"
            />
            {media.length > 1 && (
              <View style={styles.moreMediaBadge}>
                <Text style={styles.moreMediaText}>+{media.length - 1} photo{media.length > 2 ? 's' : ''}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Counters */}
        <View style={styles.countersBar}>
          {(counters?.likesCount ?? 0) > 0 && (
            <View style={styles.likesRow}>
              <View style={styles.likeIcon}>
                <ThumbsUp size={10} color={Colors.white} />
              </View>
              <Text style={styles.counterText}>{counters!.likesCount}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {(counters?.commentsCount ?? 0) > 0 && (
            <Text style={styles.counterText}>{counters!.commentsCount} commentaire{counters!.commentsCount > 1 ? 's' : ''}</Text>
          )}
          {(counters?.sharesCount ?? 0) > 0 && (
            <Text style={[styles.counterText, { marginLeft: 8 }]}>{counters!.sharesCount} partage{counters!.sharesCount > 1 ? 's' : ''}</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => likeMutation.mutate({ liked: isLiked })}
          >
            <ThumbsUp size={18} color={isLiked ? Colors.primary[600] : Colors.gray[500]} fill={isLiked ? Colors.primary[600] : 'none'} />
            <Text style={[styles.actionLabel, isLiked && { color: Colors.primary[600] }]}>J'aime</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => inputRef.current?.focus()}>
            <MessageCircle size={18} color={Colors.gray[500]} />
            <Text style={styles.actionLabel}>Commenter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => shareMutation.mutate()}>
            <Share2 size={18} color={Colors.gray[500]} />
            <Text style={styles.actionLabel}>Partager</Text>
          </TouchableOpacity>
        </View>

        {/* Comments divider */}
        <View style={styles.commentsDivider}>
          <Text style={styles.commentsTitle}>Commentaires</Text>
        </View>
      </View>
    );
  };

  const renderComment = ({ item }: { item: Record<string, unknown> }) => {
    const cAuthor = item.author as { id?: string; displayName?: string; avatarUrl?: string } | undefined;
    return (
      <View style={styles.commentCard}>
        <View style={styles.commentAvatar}>
          {cAuthor?.avatarUrl ? (
            <Image source={{ uri: mediaUrl(cAuthor.avatarUrl) }} style={{ width: 32, height: 32, borderRadius: 16 }} />
          ) : (
            <UserIcon size={14} color={Colors.gray[400]} />
          )}
        </View>
        <View style={styles.commentBody}>
          <View style={styles.commentBubble}>
            <Text style={styles.commentAuthorName}>{cAuthor?.displayName ?? 'Anonyme'}</Text>
            <Text style={styles.commentText}>{item.body as string}</Text>
          </View>
          <View style={styles.commentMeta}>
            <Text style={styles.commentTime}>
              {item.createdAt ? formatDistanceToNow(new Date(item.createdAt as string), { addSuffix: true, locale: fr }) : ''}
            </Text>
            <TouchableOpacity>
              <Text style={styles.commentAction}>J'aime</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleReply(cAuthor?.displayName ?? 'Anonyme', item.id as string)}>
              <Text style={styles.commentAction}>Répondre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={Colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          Publication de {author?.displayName ?? '...'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item, i) => (item?.id as string) ?? String(i)}
          renderItem={renderComment}
          ListHeaderComponent={renderPublicationHeader}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ color: Colors.gray[400] }}>Aucun commentaire</Text>
              <Text style={{ color: Colors.gray[400], fontSize: 13 }}>Soyez le premier à commenter !</Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        {replyTo && (
          <View style={styles.replyBar}>
            <Text style={styles.replyText}>Répondre à {replyTo.name}</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={styles.replyCancelText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={body}
            onChangeText={setBody}
            placeholder="Écrire un commentaire…"
            placeholderTextColor={Colors.gray[400]}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!body.trim() || addComment.isPending) && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!body.trim() || addComment.isPending}
          >
            <Send size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 8 },

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

  // Publication header
  pubSection: { backgroundColor: Colors.white },
  pubHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingBottom: 6 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.gray[200],
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
  authorName: { fontWeight: '700', fontSize: 15, color: Colors.gray[900] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  metaDot: { color: Colors.gray[400], fontSize: 10 },
  metaText: { fontSize: 12, color: Colors.gray[500] },
  time: { fontSize: 12, color: Colors.gray[500] },
  pubText: { fontSize: 15, color: Colors.gray[900], lineHeight: 22, paddingHorizontal: 12, paddingBottom: 8 },

  moreMediaBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  moreMediaText: { color: Colors.white, fontSize: 12, fontWeight: '600' },

  countersBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  likesRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeIcon: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center', alignItems: 'center',
  },
  counterText: { fontSize: 13, color: Colors.gray[500] },

  actionsBar: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: Colors.gray[200],
    paddingVertical: 4, marginHorizontal: 12,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8,
  },
  actionLabel: { fontSize: 13, color: Colors.gray[500], fontWeight: '600' },

  commentsDivider: {
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8,
    borderTopWidth: 6, borderTopColor: '#f0f2f5',
  },
  commentsTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray[900] },

  // Comments
  commentCard: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 12 },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', marginTop: 2,
  },
  commentBody: { flex: 1, gap: 2 },
  commentBubble: {
    backgroundColor: '#f0f2f5',
    borderRadius: 16, padding: 10,
    paddingHorizontal: 12,
  },
  commentAuthorName: { fontWeight: '700', fontSize: 13, color: Colors.gray[900], marginBottom: 1 },
  commentText: { fontSize: 14, color: Colors.gray[800], lineHeight: 20 },
  commentMeta: { flexDirection: 'row', gap: 14, paddingLeft: 8, marginTop: 2 },
  commentTime: { fontSize: 11, color: Colors.gray[400] },
  commentAction: { fontSize: 12, fontWeight: '700', color: Colors.gray[500] },

  // Input bar
  inputBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.gray[200],
  },
  replyBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8,
  },
  replyText: { fontSize: 12, color: Colors.primary[600] },
  replyCancelText: { fontSize: 14, color: Colors.gray[400], paddingLeft: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    gap: 10,
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: Colors.gray[200],
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    maxHeight: 100, fontSize: 14, color: Colors.gray[900],
    backgroundColor: '#f0f2f5',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center', alignItems: 'center',
  },
});

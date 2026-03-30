import { useState } from 'react';
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
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { Send, User } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [body, setBody] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const { data } = await api.get(`/publications/${id}/comments`);
      return data;
    },
    enabled: !!id,
  });

  const comments = Array.isArray(data) ? data : data?.items ?? [];

  const addComment = useMutation({
    mutationFn: (text: string) => api.post(`/publications/${id}/comments`, { body: text }),
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['comments', id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    addComment.mutate(trimmed);
  };

  const renderComment = ({ item }: { item: Record<string, unknown> }) => {
    const author = item.author as { displayName?: string } | undefined;
    return (
      <View style={styles.commentCard}>
        <View style={styles.commentAvatar}>
          <User size={16} color={Colors.primary[600]} />
        </View>
        <View style={styles.commentBody}>
          <View style={styles.commentBubble}>
            <Text style={styles.commentAuthor}>{author?.displayName ?? 'Anonyme'}</Text>
            <Text style={styles.commentText}>{item.body as string}</Text>
          </View>
          <Text style={styles.commentTime}>
            {item.createdAt ? formatDistanceToNow(new Date(item.createdAt as string), { addSuffix: true, locale: fr }) : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item, i) => (item?.id as string) ?? String(i)}
          renderItem={renderComment}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: Colors.gray[400] }}>Aucun commentaire</Text>
              <Text style={{ color: Colors.gray[400], fontSize: 13 }}>Soyez le premier à commenter !</Text>
            </View>
          }
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.gray[50] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48, gap: 6 },
  list: { padding: 16, gap: 12, paddingBottom: 8 },
  commentCard: { flexDirection: 'row', gap: 10 },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  commentBody: { flex: 1, gap: 4 },
  commentBubble: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderTopLeftRadius: 4,
  },
  commentAuthor: { fontWeight: '600', fontSize: 13, color: Colors.gray[900], marginBottom: 2 },
  commentText: { fontSize: 14, color: Colors.gray[700], lineHeight: 20 },
  commentTime: { fontSize: 11, color: Colors.gray[400], marginLeft: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    color: Colors.gray[900],
    backgroundColor: Colors.gray[50],
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/lib/colors';
import { Send } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Stack } from 'expo-router';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const { data } = useQuery({
    queryKey: ['messages', id],
    queryFn: async () => {
      const { data } = await api.get(`/conversations/${id}/messages`, {
        params: { limit: 50 },
      });
      return data;
    },
    refetchInterval: 3000,
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      api.post(`/conversations/${id}/messages`, { body: content }),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', id] });
    },
  });

  const messages = [...(data?.items ?? [])].reverse();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const renderMessage = ({ item }: { item: Record<string, unknown> }) => {
    const isMine = (item.senderId as string) === user?.id;

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.msgText, isMine && { color: Colors.white }]}>
            {(item.body ?? item.content ?? '') as string}
          </Text>
          {item.createdAt && (
            <Text style={[styles.msgTime, isMine && { color: 'rgba(255,255,255,0.6)' }]}>
              {formatDistanceToNow(new Date(item.createdAt as string), { addSuffix: true, locale: fr })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Conversation', headerBackTitle: 'Retour' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.gray[50] }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, index) => (item?.id as string) ?? String(index)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Écrire un message…"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sendMessage.isPending) && { opacity: 0.5 }]}
            onPress={() => text.trim() && sendMessage.mutate(text.trim())}
            disabled={!text.trim() || sendMessage.isPending}
          >
            <Send size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  messagesList: { padding: 16, gap: 8, paddingBottom: 8 },
  msgRow: { marginBottom: 4 },
  msgRowRight: { alignItems: 'flex-end' },
  msgRowLeft: { alignItems: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: Colors.primary[600], borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: Colors.white, borderBottomLeftRadius: 4 },
  senderName: { fontSize: 11, fontWeight: '600', color: Colors.gray[500], marginBottom: 2 },
  msgText: { fontSize: 14, color: Colors.gray[900], lineHeight: 20 },
  msgTime: { fontSize: 10, color: Colors.gray[400], marginTop: 4, alignSelf: 'flex-end' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.primary[600],
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

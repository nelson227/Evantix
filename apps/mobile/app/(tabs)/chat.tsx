import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { MessageCircle } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';

export default function ChatScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/chat/conversations');
      return data;
    },
  });

  const conversations = data?.data ?? [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Record<string, unknown> }) => {
    const participants = item.participants as { user: { displayName: string } }[];
    const lastMessage = item.lastMessage as { content: string; createdAt: string } | undefined;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/conversation/${item.id}`)}
      >
        <View style={styles.avatar}>
          <MessageCircle size={22} color={Colors.primary[600]} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <Text style={styles.name} numberOfLines={1}>
              {participants?.map((p) => p.user.displayName).join(', ')}
            </Text>
            <Text style={styles.time}>
              {formatDistanceToNow(new Date(item.updatedAt as string), { addSuffix: true, locale: fr })}
            </Text>
          </View>
          {lastMessage && (
            <Text style={styles.preview} numberOfLines={1}>{lastMessage.content}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id as string}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.center}>
          <MessageCircle size={48} color={Colors.gray[300]} />
          <Text style={{ color: Colors.gray[500], marginTop: 12 }}>Aucune conversation</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '600', fontSize: 14, color: Colors.gray[900], flex: 1 },
  time: { fontSize: 11, color: Colors.gray[400] },
  preview: { fontSize: 13, color: Colors.gray[500], marginTop: 2 },
});

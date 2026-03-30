import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { MessageCircle, Search, UserPlus, User, X } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';

export default function ChatScreen() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/conversations');
      return data;
    },
  });

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data } = await api.get('/members');
      return data;
    },
    enabled: searchMode,
  });

  const createConversation = useMutation({
    mutationFn: (participantId: string) => api.post('/conversations', { participantId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setSearchMode(false);
      setSearchText('');
      const convId = res.data?.id;
      if (convId) router.push(`/conversation/${convId}`);
    },
    onError: () => Alert.alert('Erreur', 'Impossible de créer la conversation'),
  });

  const conversations = Array.isArray(data) ? data : [];
  const members = (Array.isArray(membersData) ? membersData : membersData?.items ?? [])
    .filter((m: Record<string, unknown>) => m.id !== me?.id);

  const filteredMembers = useMemo(() => {
    if (!searchText.trim()) return members;
    const q = searchText.toLowerCase();
    return members.filter((m: Record<string, unknown>) =>
      ((m.displayName as string) ?? '').toLowerCase().includes(q) ||
      ((m.email as string) ?? '').toLowerCase().includes(q)
    );
  }, [members, searchText]);

  if (isLoading && !searchMode) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </View>
    );
  }

  const renderConversation = ({ item }: { item: Record<string, unknown> }) => {
    const participant = item.participant as { id: string; displayName: string } | undefined;
    const lastMessage = item.lastMessage as { body: string; createdAt: string } | undefined;

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
              {participant?.displayName ?? 'Inconnu'}
            </Text>
            {item.updatedAt && (
              <Text style={styles.time}>
                {formatDistanceToNow(new Date(item.updatedAt as string), { addSuffix: true, locale: fr })}
              </Text>
            )}
          </View>
          {lastMessage && (
            <Text style={styles.preview} numberOfLines={1}>{lastMessage.body}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMember = ({ item }: { item: Record<string, unknown> }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => createConversation.mutate(item.id as string)}
    >
      <View style={[styles.avatar, { backgroundColor: Colors.accent[50] }]}>
        <User size={22} color={Colors.accent[600]} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.name}>{(item.displayName as string) ?? 'Utilisateur'}</Text>
        {item.email && <Text style={styles.preview}>{item.email as string}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        {searchMode ? (
          <View style={styles.searchRow}>
            <Search size={18} color={Colors.gray[400]} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Rechercher un contact…"
              placeholderTextColor={Colors.gray[400]}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setSearchMode(false); setSearchText(''); }}>
              <X size={20} color={Colors.gray[500]} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.searchRow}>
            <TouchableOpacity style={styles.searchTrigger} onPress={() => setSearchMode(true)}>
              <Search size={18} color={Colors.gray[400]} />
              <Text style={styles.searchPlaceholder}>Rechercher un contact…</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.newChatBtn} onPress={() => setSearchMode(true)}>
              <UserPlus size={20} color={Colors.primary[600]} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {searchMode ? (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item, i) => (item?.id as string) ?? String(i)}
          renderItem={renderMember}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: Colors.gray[400] }}>Aucun contact trouvé</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item, index) => (item?.id as string) ?? String(index)}
          renderItem={renderConversation}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <MessageCircle size={48} color={Colors.gray[300]} />
              <Text style={{ color: Colors.gray[500], marginTop: 12 }}>Aucune conversation</Text>
              <Text style={{ color: Colors.gray[400], fontSize: 13, marginTop: 4 }}>
                Appuyez sur la loupe pour trouver des contacts
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
  searchBar: { padding: 12, paddingBottom: 4, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray[100] },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.gray[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchPlaceholder: { color: Colors.gray[400], fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.gray[900], paddingVertical: 8 },
  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
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

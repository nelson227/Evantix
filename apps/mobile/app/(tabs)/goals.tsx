import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { Target } from 'lucide-react-native';

const METRIC_LABELS: Record<string, string> = {
  people_preached: 'Personnes évangélisées',
  people_followup: 'Personnes suivies',
  bibles_given: 'Bibles données',
  books_distributed: 'Livres distribués',
  tracts_distributed: 'Tracts distribués',
  publications_count: 'Publications',
  events_held: 'Événements',
};

export default function GoalsScreen() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data } = await api.get('/goals');
      return data;
    },
  });

  const pauseGoal = useMutation({
    mutationFn: (id: string) => api.patch(`/goals/${id}/pause`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  const resumeGoal = useMutation({
    mutationFn: (id: string) => api.patch(`/goals/${id}/resume`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  const goals = data?.data ?? [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </View>
    );
  }

  const renderGoal = ({ item }: { item: Record<string, unknown> }) => {
    const progress = Math.min(((item.currentValue as number) / (item.targetValue as number)) * 100, 100);
    const isActive = item.status === 'active';
    const isPaused = item.status === 'paused';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Target size={20} color={Colors.primary[600]} />
          <Text style={styles.metricLabel}>
            {METRIC_LABELS[item.metricType as string] ?? item.metricType}
          </Text>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {item.currentValue as number} / {item.targetValue as number}
          </Text>
          <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
        </View>

        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progress}%`,
                backgroundColor: progress >= 100 ? Colors.success : Colors.primary[500],
              },
            ]}
          />
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.statusBadge, {
            backgroundColor: isActive ? '#dcfce7' : isPaused ? '#fef3c7' : Colors.gray[100],
            color: isActive ? Colors.success : isPaused ? Colors.warning : Colors.gray[500],
          }]}>
            {isActive ? 'Actif' : isPaused ? 'Pause' : item.status as string}
          </Text>

          {isActive && (
            <TouchableOpacity onPress={() => pauseGoal.mutate(item.id as string)}>
              <Text style={{ fontSize: 13, color: Colors.warning, fontWeight: '600' }}>Pause</Text>
            </TouchableOpacity>
          )}
          {isPaused && (
            <TouchableOpacity onPress={() => resumeGoal.mutate(item.id as string)}>
              <Text style={{ fontSize: 13, color: Colors.success, fontWeight: '600' }}>Reprendre</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={goals}
      keyExtractor={(item) => item.id as string}
      renderItem={renderGoal}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ color: Colors.gray[500] }}>Aucun objectif</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
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
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricLabel: { fontWeight: '600', fontSize: 15, color: Colors.gray[900] },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 13, color: Colors.gray[600] },
  progressPct: { fontSize: 13, fontWeight: '600', color: Colors.gray[900] },
  progressBarBg: { height: 8, backgroundColor: Colors.gray[100], borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { fontSize: 11, fontWeight: '500', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
});

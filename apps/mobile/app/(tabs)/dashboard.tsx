import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { Users, BookOpen, Target } from 'lucide-react-native';

export default function DashboardScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/personal');
      return data;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </View>
    );
  }

  const d = data ?? {} as Record<string, unknown>;
  const summary = (d as Record<string, unknown>).summary as Record<string, number> | undefined;
  const goalsInfo = (d as Record<string, unknown>).goals as { activeCount: number; completedCount: number } | undefined;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Stats cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: Colors.primary[500] }]}>
          <BookOpen size={22} color={Colors.primary[600]} />
          <Text style={styles.statValue}>{summary?.publicationsCount ?? 0}</Text>
          <Text style={styles.statLabel}>Publications</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.success }]}>
          <Users size={22} color={Colors.success} />
          <Text style={styles.statValue}>{summary?.peoplePreachedTotal ?? summary?.peoplePrachedTotal ?? 0}</Text>
          <Text style={styles.statLabel}>Évangélisés</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
          <BookOpen size={22} color={Colors.warning} />
          <Text style={styles.statValue}>{summary?.booksDistributedTotal ?? 0}</Text>
          <Text style={styles.statLabel}>Livres distribués</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.accent[500] }]}>
          <Target size={22} color={Colors.accent[500]} />
          <Text style={styles.statValue}>{goalsInfo?.activeCount ?? 0}</Text>
          <Text style={styles.statLabel}>Objectifs actifs</Text>
        </View>
      </View>

      {/* Goals summary */}
      {goalsInfo && (goalsInfo.activeCount > 0 || goalsInfo.completedCount > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Objectifs</Text>
          <View style={styles.goalRow}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>Actifs</Text>
              <Text style={styles.goalPct}>{goalsInfo.activeCount}</Text>
            </View>
          </View>
          <View style={styles.goalRow}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>Complétés</Text>
              <Text style={styles.goalPct}>{goalsInfo.completedCount}</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: Colors.gray[900] },
  statLabel: { fontSize: 12, color: Colors.gray[500] },
  section: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.gray[900] },
  goalRow: { gap: 6 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  goalLabel: { fontSize: 13, color: Colors.gray[700], textTransform: 'capitalize' },
  goalPct: { fontSize: 13, fontWeight: '600', color: Colors.gray[900] },
  progressBg: { height: 6, backgroundColor: Colors.gray[100], borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary[500], borderRadius: 3 },
});

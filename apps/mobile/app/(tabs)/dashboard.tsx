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

  const d = data ?? {};

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Stats cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: Colors.primary[500] }]}>
          <BookOpen size={22} color={Colors.primary[600]} />
          <Text style={styles.statValue}>{d.publicationsCount ?? 0}</Text>
          <Text style={styles.statLabel}>Publications</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.success }]}>
          <Users size={22} color={Colors.success} />
          <Text style={styles.statValue}>{d.totalStats?.people_preached ?? 0}</Text>
          <Text style={styles.statLabel}>Évangélisés</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
          <BookOpen size={22} color={Colors.warning} />
          <Text style={styles.statValue}>{d.totalStats?.bibles_given ?? 0}</Text>
          <Text style={styles.statLabel}>Bibles</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.accent[500] }]}>
          <Target size={22} color={Colors.accent[500]} />
          <Text style={styles.statValue}>{d.activeGoalsCount ?? 0}</Text>
          <Text style={styles.statLabel}>Objectifs actifs</Text>
        </View>
      </View>

      {/* Goals progress */}
      {d.goals && d.goals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Objectifs en cours</Text>
          {d.goals.map((g: { id: string; metricType: string; currentValue: number; targetValue: number }) => {
            const pct = Math.min(Math.round((g.currentValue / g.targetValue) * 100), 100);
            return (
              <View key={g.id} style={styles.goalRow}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalLabel}>{g.metricType.replace(/_/g, ' ')}</Text>
                  <Text style={styles.goalPct}>{pct}%</Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
              </View>
            );
          })}
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

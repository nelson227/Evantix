import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { Target, Plus, X } from 'lucide-react-native';

const METRIC_LABELS: Record<string, string> = {
  people_preached: 'Personnes évangélisées',
  people_met: 'Personnes rencontrées',
  people_prayed_for: 'Personnes priées pour',
  books_distributed_total: 'Livres distribués',
  tracts_distributed_total: 'Tracts distribués',
  outings_completed: 'Sorties effectuées',
  events_created: 'Événements créés',
};

const METRIC_OPTIONS = Object.entries(METRIC_LABELS).map(([value, label]) => ({ value, label }));

export default function GoalsScreen() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    metricType: 'people_preached',
    targetValue: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data } = await api.get('/goals');
      return data;
    },
  });

  const pauseGoal = useMutation({
    mutationFn: (id: string) => api.post(`/goals/${id}/pause`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  const resumeGoal = useMutation({
    mutationFn: (id: string) => api.post(`/goals/${id}/resume`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  const createGoal = useMutation({
    mutationFn: () => {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);
      return api.post('/goals', {
        title: newGoal.title,
        metricType: newGoal.metricType,
        targetValue: parseInt(newGoal.targetValue) || 10,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      setShowModal(false);
      setNewGoal({ title: '', metricType: 'people_preached', targetValue: '' });
      Alert.alert('Succès', 'Objectif créé !');
    },
    onError: () => Alert.alert('Erreur', "Impossible de créer l'objectif"),
  });

  const goals = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </View>
    );
  }

  const renderGoal = ({ item }: { item: Record<string, unknown> }) => {
    const target = (item.targetValue as number) || 1;
    const progress = Math.min(((item.currentValue as number) / target) * 100, 100);
    const isActive = item.status === 'active';
    const isPaused = item.status === 'paused';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Target size={20} color={Colors.primary[600]} />
          <Text style={styles.metricLabel}>
            {(item.title as string) || (METRIC_LABELS[item.metricType as string] ?? (item.metricType as string))}
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
    <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
      <FlatList
        data={goals}
        keyExtractor={(item, index) => (item?.id as string) ?? String(index)}
        renderItem={renderGoal}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Target size={48} color={Colors.gray[300]} />
            <Text style={{ color: Colors.gray[500], marginTop: 12 }}>Aucun objectif</Text>
            <Text style={{ color: Colors.gray[400], fontSize: 13 }}>
              Appuyez sur + pour créer votre premier objectif
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Plus size={26} color={Colors.white} />
      </TouchableOpacity>

      {/* Create goal modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvel objectif</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={Colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ gap: 16 }} contentContainerStyle={{ gap: 16 }}>
              <View>
                <Text style={styles.fieldLabel}>Titre</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newGoal.title}
                  onChangeText={(v) => setNewGoal((p) => ({ ...p, title: v }))}
                  placeholder="ex: Évangéliser 50 personnes"
                  placeholderTextColor={Colors.gray[400]}
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Type de métrique</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {METRIC_OPTIONS.map((m) => (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.metricChip, newGoal.metricType === m.value && styles.metricChipActive]}
                      onPress={() => setNewGoal((p) => ({ ...p, metricType: m.value }))}
                    >
                      <Text style={[styles.metricChipText, newGoal.metricType === m.value && styles.metricChipTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View>
                <Text style={styles.fieldLabel}>Valeur cible</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newGoal.targetValue}
                  onChangeText={(v) => setNewGoal((p) => ({ ...p, targetValue: v }))}
                  placeholder="ex: 50"
                  keyboardType="number-pad"
                  placeholderTextColor={Colors.gray[400]}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.createBtn, (!newGoal.title || !newGoal.targetValue || createGoal.isPending) && { opacity: 0.5 }]}
              onPress={() => createGoal.mutate()}
              disabled={!newGoal.title || !newGoal.targetValue || createGoal.isPending}
            >
              <Text style={styles.createBtnText}>
                {createGoal.isPending ? 'Création…' : 'Créer l\'objectif'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, paddingBottom: 80 },
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
  metricLabel: { fontWeight: '600', fontSize: 15, color: Colors.gray[900], flex: 1 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 13, color: Colors.gray[600] },
  progressPct: { fontSize: 13, fontWeight: '600', color: Colors.gray[900] },
  progressBarBg: { height: 8, backgroundColor: Colors.gray[100], borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { fontSize: 11, fontWeight: '500', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.gray[900] },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.gray[700], marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.gray[900],
    backgroundColor: Colors.gray[50],
  },
  metricChip: {
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  metricChipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  metricChipText: { fontSize: 12, fontWeight: '500', color: Colors.gray[600] },
  metricChipTextActive: { color: Colors.white },
  createBtn: {
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  createBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

const TYPES = [
  { value: 'activity_report', label: 'Rapport' },
  { value: 'testimony', label: 'Témoignage' },
  { value: 'prayer_request', label: 'Prière' },
  { value: 'announcement', label: 'Annonce' },
  { value: 'event', label: 'Événement' },
  { value: 'encouragement', label: 'Encouragement' },
];

export default function NewPublicationScreen() {
  const qc = useQueryClient();
  const [type, setType] = useState('activity_report');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [stats, setStats] = useState({
    people_preached: '',
    people_followup: '',
    bibles_given: '',
    books_distributed: '',
    tracts_distributed: '',
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { type, content };
      if (location) payload.location = location;
      if (type === 'activity_report') {
        payload.stats = {
          people_preached: parseInt(stats.people_preached) || 0,
          people_followup: parseInt(stats.people_followup) || 0,
          bibles_given: parseInt(stats.bibles_given) || 0,
          books_distributed: parseInt(stats.books_distributed) || 0,
          tracts_distributed: parseInt(stats.tracts_distributed) || 0,
        };
      }
      return api.post('/publications', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      Alert.alert('Succès', 'Publication créée !');
      setContent('');
      setLocation('');
      setStats({ people_preached: '', people_followup: '', bibles_given: '', books_distributed: '', tracts_distributed: '' });
      router.navigate('/(tabs)');
    },
    onError: () => Alert.alert('Erreur', 'Impossible de créer la publication'),
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Type selector */}
        <Text style={styles.label}>Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeChip, type === t.value && styles.typeChipActive]}
              onPress={() => setType(t.value)}
            >
              <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Contenu *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={6}
          placeholder="Partagez votre activité…"
          textAlignVertical="top"
        />

        <Text style={styles.label}>Lieu</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="ex: Douala, Cameroun"
        />

        {type === 'activity_report' && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Statistiques</Text>
            {[
              { key: 'people_preached', label: 'Personnes évangélisées' },
              { key: 'people_followup', label: 'Personnes suivies' },
              { key: 'bibles_given', label: 'Bibles données' },
              { key: 'books_distributed', label: 'Livres distribués' },
              { key: 'tracts_distributed', label: 'Tracts distribués' },
            ].map((s) => (
              <View key={s.key} style={styles.statRow}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <TextInput
                  style={styles.statInput}
                  value={stats[s.key as keyof typeof stats]}
                  onChangeText={(v) => setStats((prev) => ({ ...prev, [s.key]: v }))}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, (!content || mutation.isPending) && styles.buttonDisabled]}
          onPress={() => mutation.mutate()}
          disabled={!content || mutation.isPending}
        >
          <Text style={styles.buttonText}>{mutation.isPending ? 'Publication…' : 'Publier'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.gray[700] },
  input: { borderWidth: 1, borderColor: Colors.gray[300], borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: Colors.white },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  typeScroll: { marginBottom: 4 },
  typeChip: { backgroundColor: Colors.gray[100], borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  typeChipActive: { backgroundColor: Colors.primary[600] },
  typeChipText: { fontSize: 13, fontWeight: '500', color: Colors.gray[600] },
  typeChipTextActive: { color: Colors.white },
  statsSection: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.gray[900], marginBottom: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { fontSize: 13, color: Colors.gray[600], flex: 1 },
  statInput: { borderWidth: 1, borderColor: Colors.gray[300], borderRadius: 8, padding: 8, width: 80, textAlign: 'center', fontSize: 15 },
  button: { backgroundColor: Colors.primary[600], borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
});

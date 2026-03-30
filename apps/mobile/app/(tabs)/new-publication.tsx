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
  Image,
} from 'react-native';
import { api } from '@/lib/api';
import { Colors } from '@/lib/colors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Camera, X, Image as ImageIcon, Video } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

const API_ROOT = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace('/api/v1', '');

const TYPES = [
  { value: 'past_outreach', label: 'Rapport' },
  { value: 'testimony', label: 'Témoignage' },
  { value: 'prayer_request', label: 'Prière' },
  { value: 'future_event', label: 'Événement' },
];

export default function NewPublicationScreen() {
  const qc = useQueryClient();
  const [type, setType] = useState('past_outreach');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [stats, setStats] = useState({
    peoplePreached: '',
    peoplePrayedFor: '',
    booksDistributedTotal: '',
    tractsDistributedTotal: '',
  });

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à vos photos pour ajouter des médias.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 20,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 20));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à la caméra.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, 20));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (uris: string[]): Promise<string[]> => {
    if (uris.length === 0) return [];
    const formData = new FormData();
    for (const uri of uris) {
      const name = uri.split('/').pop() || 'file';
      const ext = name.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4', mov: 'video/quicktime' };
      const type = mimeMap[ext] || 'image/jpeg';
      formData.append('files', { uri, name, type } as unknown as Blob);
    }
    const { data } = await api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return (data as { url: string }[]).map((f) => f.url);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      try {
        const mediaUrls = await uploadFiles(images);
        const payload: Record<string, unknown> = { type, narrativeText: content };
        if (location) payload.locationName = location;
        if (mediaUrls.length > 0) payload.mediaUrls = mediaUrls;
        if (type === 'past_outreach') {
          payload.stats = {
            peoplePreached: parseInt(stats.peoplePreached) || 0,
            peoplePrayedFor: parseInt(stats.peoplePrayedFor) || 0,
            booksDistributedTotal: parseInt(stats.booksDistributedTotal) || 0,
            tractsDistributedTotal: parseInt(stats.tractsDistributedTotal) || 0,
          };
        }
        return api.post('/publications', payload);
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('Succès', 'Publication créée !');
      setContent('');
      setLocation('');
      setImages([]);
      setStats({ peoplePreached: '', peoplePrayedFor: '', booksDistributedTotal: '', tractsDistributedTotal: '' });
      router.navigate('/(tabs)');
    },
    onError: () => Alert.alert('Erreur', 'Impossible de créer la publication'),
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.gray[50] }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Type de publication</Text>
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

        <Text style={styles.label}>Quoi de neuf ? *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={6}
          placeholder="Partagez votre activité, témoignage, prière…"
          textAlignVertical="top"
          placeholderTextColor={Colors.gray[400]}
        />

        <Text style={styles.label}>Photos & Vidéos</Text>
        <View style={styles.photoSection}>
          {images.map((uri, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image source={{ uri }} style={styles.photoImg} />
              <TouchableOpacity style={styles.photoRemove} onPress={() => removeImage(i)}>
                <X size={14} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 20 && (
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={pickMedia}>
                <ImageIcon size={22} color={Colors.primary[600]} />
                <Text style={styles.photoBtnText}>Galerie</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Camera size={22} color={Colors.primary[600]} />
                <Text style={styles.photoBtnText}>Caméra</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.label}>Lieu</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="ex: Douala, Cameroun"
          placeholderTextColor={Colors.gray[400]}
        />

        {type === 'past_outreach' && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Statistiques</Text>
            {[
              { key: 'peoplePreached', label: 'Personnes évangélisées' },
              { key: 'peoplePrayedFor', label: 'Personnes priées pour' },
              { key: 'booksDistributedTotal', label: 'Livres distribués' },
              { key: 'tractsDistributedTotal', label: 'Tracts distribués' },
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
          style={[styles.button, (!content || mutation.isPending || uploading) && styles.buttonDisabled]}
          onPress={() => mutation.mutate()}
          disabled={!content || mutation.isPending || uploading}
        >
          <Text style={styles.buttonText}>{uploading ? 'Upload des médias…' : mutation.isPending ? 'Publication…' : 'Publier'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.gray[700] },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: Colors.white,
    color: Colors.gray[900],
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  typeScroll: { marginBottom: 4 },
  typeChip: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  typeChipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  typeChipText: { fontSize: 13, fontWeight: '600', color: Colors.gray[600] },
  typeChipTextActive: { color: Colors.white },
  photoSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoActions: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary[200],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    gap: 4,
  },
  photoBtnText: { fontSize: 10, color: Colors.primary[600], fontWeight: '500' },
  statsSection: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.gray[900], marginBottom: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { fontSize: 13, color: Colors.gray[600], flex: 1 },
  statInput: {
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 15,
    backgroundColor: Colors.gray[50],
  },
  button: { backgroundColor: Colors.primary[600], borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});

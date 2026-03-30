import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/lib/colors';
import { User, LogOut, Save, MapPin, Book, Phone, Church, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

const API_ROOT = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace('/api/v1', '');

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/me');
      return data;
    },
  });

  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    city: '',
    country: '',
    ministryName: '',
    favoriteBibleVerse: '',
    phoneNumber: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName ?? '',
        bio: profile.bio ?? '',
        city: profile.city ?? '',
        country: profile.country ?? '',
        ministryName: profile.ministryName ?? '',
        favoriteBibleVerse: profile.favoriteBibleVerse ?? '',
        phoneNumber: profile.phoneNumber ?? '',
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) => api.patch('/me/profile', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      Alert.alert('Succès', 'Profil mis à jour !');
    },
    onError: () => Alert.alert('Erreur', 'Impossible de mettre à jour le profil'),
  });

  const avatarMutation = useMutation({
    mutationFn: async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', "Autorisez l'accès à vos photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      const name = uri.split('/').pop() || 'avatar.jpg';
      const ext = name.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      const formData = new FormData();
      formData.append('files', { uri, name, type: mimeMap[ext] || 'image/jpeg' } as unknown as Blob);
      const { data: uploaded } = await api.post('/uploads', formData, {
        headers: { 'Content-Type': undefined as unknown as string },
      });
      const avatarUrl = (uploaded as { url: string }[])[0].url;
      await api.patch('/me/profile', { avatarUrl });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => Alert.alert('Erreur', "Impossible de changer la photo de profil"),
  });

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Oui', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.gray[50] }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarCircle} onPress={() => avatarMutation.mutate()} disabled={avatarMutation.isPending}>
            {profile?.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl.startsWith('http') ? profile.avatarUrl : `${API_ROOT}${profile.avatarUrl}` }}
                style={styles.avatarImg}
              />
            ) : (
              <User size={40} color={Colors.primary[600]} />
            )}
            <View style={styles.cameraBadge}>
              <Camera size={14} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Form fields */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>

          <View style={styles.fieldRow}>
            <User size={18} color={Colors.gray[400]} />
            <TextInput
              style={styles.input}
              value={form.displayName}
              onChangeText={(v) => setForm((p) => ({ ...p, displayName: v }))}
              placeholder="Nom d'affichage"
              placeholderTextColor={Colors.gray[400]}
            />
          </View>

          <View style={styles.fieldRow}>
            <Phone size={18} color={Colors.gray[400]} />
            <TextInput
              style={styles.input}
              value={form.phoneNumber}
              onChangeText={(v) => setForm((p) => ({ ...p, phoneNumber: v }))}
              placeholder="Numéro de téléphone"
              keyboardType="phone-pad"
              placeholderTextColor={Colors.gray[400]}
            />
          </View>

          <TextInput
            style={[styles.inputFull, { minHeight: 80, textAlignVertical: 'top' }]}
            value={form.bio}
            onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))}
            placeholder="Bio - Parlez de vous…"
            multiline
            placeholderTextColor={Colors.gray[400]}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Ministère</Text>

          <View style={styles.fieldRow}>
            <Church size={18} color={Colors.gray[400]} />
            <TextInput
              style={styles.input}
              value={form.ministryName}
              onChangeText={(v) => setForm((p) => ({ ...p, ministryName: v }))}
              placeholder="Nom du ministère / église"
              placeholderTextColor={Colors.gray[400]}
            />
          </View>

          <View style={styles.fieldRow}>
            <Book size={18} color={Colors.gray[400]} />
            <TextInput
              style={styles.input}
              value={form.favoriteBibleVerse}
              onChangeText={(v) => setForm((p) => ({ ...p, favoriteBibleVerse: v }))}
              placeholder="Verset biblique favori"
              placeholderTextColor={Colors.gray[400]}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Localisation</Text>

          <View style={styles.fieldRow}>
            <MapPin size={18} color={Colors.gray[400]} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={form.city}
              onChangeText={(v) => setForm((p) => ({ ...p, city: v }))}
              placeholder="Ville"
              placeholderTextColor={Colors.gray[400]}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={form.country}
              onChangeText={(v) => setForm((p) => ({ ...p, country: v }))}
              placeholder="Pays"
              placeholderTextColor={Colors.gray[400]}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, updateMutation.isPending && { opacity: 0.5 }]}
          onPress={() => updateMutation.mutate(form)}
          disabled={updateMutation.isPending}
        >
          <Save size={18} color={Colors.white} />
          <Text style={styles.saveBtnText}>
            {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={Colors.danger} />
          <Text style={styles.logoutBtnText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary[200],
    overflow: 'hidden',
  },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  email: { fontSize: 14, color: Colors.gray[500] },
  formSection: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.gray[900] },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.gray[900],
    backgroundColor: Colors.gray[50],
  },
  inputFull: {
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.gray[900],
    backgroundColor: Colors.gray[50],
  },
  saveBtn: {
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  logoutBtnText: { color: Colors.danger, fontWeight: '600', fontSize: 15 },
});

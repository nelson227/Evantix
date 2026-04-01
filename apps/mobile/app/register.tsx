import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { Link, router } from 'expo-router';
import { Colors } from '@/lib/colors';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    ministryName: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleRegister = async () => {
    if (form.password !== form.confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (form.password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        displayName: form.displayName || undefined,
        ministryName: form.ministryName || undefined,
      });
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Erreur', msg || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Evantix</Text>
        <Text style={styles.subtitle}>Créez votre compte</Text>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Prénom *</Text>
              <TextInput style={styles.input} value={form.firstName} onChangeText={(v) => update('firstName', v)} autoComplete="given-name" />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput style={styles.input} value={form.lastName} onChangeText={(v) => update('lastName', v)} autoComplete="family-name" />
            </View>
          </View>

          <Text style={styles.label}>Email *</Text>
          <TextInput style={styles.input} value={form.email} onChangeText={(v) => update('email', v)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />

          <Text style={styles.label}>Nom d&apos;affichage</Text>
          <TextInput style={styles.input} value={form.displayName} onChangeText={(v) => update('displayName', v)} placeholder="Facultatif" />

          <Text style={styles.label}>Ministère</Text>
          <TextInput style={styles.input} value={form.ministryName} onChangeText={(v) => update('ministryName', v)} placeholder="Facultatif" />

          <Text style={styles.label}>Mot de passe * (min. 8)</Text>
          <TextInput style={styles.input} value={form.password} onChangeText={(v) => update('password', v)} secureTextEntry autoComplete="new-password" />

          <Text style={styles.label}>Confirmer *</Text>
          <TextInput style={styles.input} value={form.confirmPassword} onChangeText={(v) => update('confirmPassword', v)} secureTextEntry autoComplete="new-password" />

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Inscription…' : 'S\'inscrire'}</Text>
          </TouchableOpacity>

          <View style={styles.linkRow}>
            <Text style={styles.linkText}>Déjà un compte ? </Text>
            <Link href="/login"><Text style={styles.link}>Se connecter</Text></Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray[50] },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 48 },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.primary[600], textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.gray[500], textAlign: 'center', marginTop: 8, marginBottom: 24 },
  form: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, gap: 10 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.gray[700] },
  input: { borderWidth: 1, borderColor: Colors.gray[300], borderRadius: 10, padding: 12, fontSize: 15 },
  button: { backgroundColor: Colors.primary[600], borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  linkText: { fontSize: 13, color: Colors.gray[500] },
  link: { fontSize: 13, color: Colors.primary[600], fontWeight: '600' },
});

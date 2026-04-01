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

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Erreur', msg || 'Identifiants incorrects');
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
        <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="vous@exemple.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </Text>
          </TouchableOpacity>

          <View style={styles.linkRow}>
            <Text style={styles.linkText}>Pas encore de compte ? </Text>
            <Link href="/register">
              <Text style={styles.link}>S&apos;inscrire</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray[50] },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.primary[600], textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.gray[500], textAlign: 'center', marginTop: 8, marginBottom: 32 },
  form: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, gap: 12 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.gray[700] },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: Colors.white,
  },
  button: {
    backgroundColor: Colors.primary[600],
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  linkText: { fontSize: 13, color: Colors.gray[500] },
  link: { fontSize: 13, color: Colors.primary[600], fontWeight: '600' },
});

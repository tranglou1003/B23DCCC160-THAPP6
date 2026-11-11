import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  StatusBar,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../components/common';
import { login, authErrorMessage } from '../services/authService';
import { colors } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      Alert.alert('Đăng nhập thất bại', authErrorMessage(e));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>💬</Text>
          </View>
          <Text style={styles.title}>MyChat</Text>
          <Text style={styles.subtitle}>Đăng nhập để tiếp tục trò chuyện</Text>

          <Text style={styles.label}>Email</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text style={styles.label}>Mật khẩu</Text>
          <View>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="••••••"
              secureTextEntry={!showPw}
              style={{ paddingRight: 56 }}
            />
            <Pressable style={styles.eye} onPress={() => setShowPw(s => !s)}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{showPw ? 'Ẩn' : 'Hiện'}</Text>
            </Pressable>
          </View>

          <Button title="Đăng nhập" onPress={onLogin} loading={loading} style={{ marginTop: 24 }} />
          <Pressable onPress={() => navigation.navigate('Register')} style={styles.link}>
            <Text style={styles.linkText}>
              Chưa có tài khoản? <Text style={{ color: colors.primary, fontWeight: '700' }}>Đăng ký</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingTop: 48 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { fontSize: 38 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 14 },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 14 },
  eye: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  link: { alignItems: 'center', marginTop: 20, padding: 8 },
  linkText: { color: colors.textMuted, fontSize: 14.5 },
});

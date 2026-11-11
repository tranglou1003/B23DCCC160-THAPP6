import React, { useState } from 'react';
import { Alert, StatusBar, Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../components/common';
import { register, authErrorMessage } from '../services/authService';
import { colors } from '../theme';
import { styles } from './LoginScreen';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Mật khẩu yếu', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Không khớp', 'Mật khẩu nhập lại không khớp.');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (e) {
      Alert.alert('Đăng ký thất bại', authErrorMessage(e));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tạo tài khoản</Text>
        <Text style={styles.subtitle}>Tham gia MyChat chỉ trong vài giây</Text>
        <Text style={styles.label}>Họ tên</Text>
        <Input value={name} onChangeText={setName} placeholder="Nguyễn Văn A" />
        <Text style={styles.label}>Email</Text>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.label}>Mật khẩu</Text>
        <Input value={password} onChangeText={setPassword} placeholder="Ít nhất 6 ký tự" secureTextEntry />
        <Text style={styles.label}>Nhập lại mật khẩu</Text>
        <Input value={confirm} onChangeText={setConfirm} placeholder="••••••" secureTextEntry />
        <Button title="Đăng ký" onPress={onRegister} loading={loading} style={{ marginTop: 24 }} />
        <Pressable onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>
            Đã có tài khoản? <Text style={{ color: colors.primary, fontWeight: '700' }}>Đăng nhập</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

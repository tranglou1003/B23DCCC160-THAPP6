import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button, Input} from '../components/common';
import Icon from '../components/Icon';
import {useAuth} from '../context/AuthContext';
import {logout, updateMyProfile} from '../services/authService';
import {uploadImage, IMAGE_PICKER_OPTIONS} from '../services/uploadService';
import {initials} from '../utils/format';
import {colors} from '../theme';

export default function ProfileScreen() {
  const {me} = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(me.displayName);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => setName(me.displayName), [me.displayName]);

  const pickAvatar = async () => {
    const res = await launchImageLibrary({...IMAGE_PICKER_OPTIONS, maxWidth: 512, maxHeight: 512});
    if (res.didCancel || !res.assets?.length) {
      return;
    }
    if (res.errorCode) {
      Alert.alert('Lỗi', res.errorMessage || res.errorCode);
      return;
    }
    setUploading(true);
    try {
      const {url} = await uploadImage(res.assets[0], 'chat-app/avatars');
      await updateMyProfile({avatarUrl: url});
    } catch (e) {
      Alert.alert('Tải ảnh thất bại', e.message);
    } finally {
      setUploading(false);
    }
  };

  const saveName = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Họ tên không được để trống.');
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile({displayName: name});
      Alert.alert('Thành công', 'Đã cập nhật họ tên.');
    } catch (e) {
      Alert.alert('Lỗi', e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      {text: 'Hủy', style: 'cancel'},
      {text: 'Đăng xuất', style: 'destructive', onPress: () => logout()},
    ]);

  return (
    <View style={styles.container}>
      <View style={[styles.appBar, {paddingTop: insets.top + 10}]}>
        <Text style={styles.title}>Cá nhân</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={pickAvatar} disabled={uploading} style={styles.avatarWrap}>
          <View style={styles.avatarRing}>
            {me.avatarUrl ? (
              <Image source={{uri: me.avatarUrl}} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initials(me.displayName)}</Text>
              </View>
            )}
          </View>
          <View style={styles.cameraBadge}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="camera" size={16} color={colors.text2} strokeWidth={1.8} />
            )}
          </View>
        </Pressable>
        <Text style={styles.hint}>Nhấn vào ảnh để đổi ảnh đại diện</Text>
        <Text style={styles.email}>{me.email}</Text>

        <View style={styles.form}>
          <Text style={styles.label}>HỌ TÊN</Text>
          <Input value={name} onChangeText={setName} placeholder="Nhập họ tên của bạn" />
          <Button
            title="Lưu họ tên"
            onPress={saveName}
            loading={saving}
            disabled={name.trim() === me.displayName}
            style={{marginTop: 22}}
          />
          <Button title="Đăng xuất" variant="danger" onPress={confirmLogout} style={{marginTop: 12}} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  appBar: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {fontSize: 21, fontWeight: '700', color: colors.text, letterSpacing: -0.3},
  content: {paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, alignItems: 'center'},
  avatarWrap: {width: 104, height: 104},
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 4,
    backgroundColor: '#fff',
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  avatar: {width: 96, height: 96, borderRadius: 48},
  avatarFallback: {backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: '#fff', fontSize: 34, fontWeight: '600'},
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
  },
  hint: {marginTop: 14, fontSize: 12.5, color: colors.textMuted, fontWeight: '500'},
  email: {marginTop: 4, fontSize: 14, color: colors.text2, fontWeight: '600'},
  form: {alignSelf: 'stretch', marginTop: 32},
  label: {fontSize: 11.5, fontWeight: '700', color: colors.textSub, letterSpacing: 1, marginBottom: 7, marginLeft: 2},
});

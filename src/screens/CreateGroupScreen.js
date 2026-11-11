import React, {useMemo, useState} from 'react';
import {Alert, KeyboardAvoidingView, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button, Input} from '../components/common';
import Icon from '../components/Icon';
import MemberPicker from '../components/MemberPicker';
import {useAuth} from '../context/AuthContext';
import {createGroup} from '../services/groupService';
import {colors} from '../theme';

const MIN_MEMBERS = 2;

export default function CreateGroupScreen({navigation}) {
  const {me} = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const exclude = useMemo(() => [me.uid], [me.uid]);

  const toggle = uid =>
    setSelected(prev => (prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]));

  const canCreate = name.trim().length > 0 && selected.length >= MIN_MEMBERS;

  const onCreate = async () => {
    if (!canCreate) {
      Alert.alert('Chưa đủ thông tin', `Nhập tên nhóm và chọn tối thiểu ${MIN_MEMBERS} thành viên ngoài bạn.`);
      return;
    }
    setLoading(true);
    try {
      const convId = await createGroup({name, memberUids: selected, me});
      navigation.replace('Chat', {convId});
    } catch (e) {
      Alert.alert('Tạo nhóm thất bại', e.message);
      setLoading(false);
    }
  };

  const renderHeader = visibleUids => {
    const allSelected = visibleUids.length > 0 && visibleUids.every(u => selected.includes(u));
    return (
      <View>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Tên nhóm</Text>
          <Text style={styles.required}>Bắt buộc</Text>
        </View>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="VD: Nhóm bài tập Mobile"
          maxLength={50}
          style={styles.nameInput}
        />
        <View style={[styles.labelRow, {marginTop: 24}]}>
          <View style={styles.row}>
            <Text style={styles.label}>Chọn thành viên</Text>
            <View style={[styles.minPill, selected.length >= MIN_MEMBERS && styles.minPillOk]}>
              <Text style={[styles.minText, selected.length >= MIN_MEMBERS && {color: '#047857'}]}>
                (tối thiểu {MIN_MEMBERS} người)
              </Text>
            </View>
          </View>
          <Pressable
            hitSlop={8}
            onPress={() =>
              setSelected(prev =>
                allSelected
                  ? prev.filter(u => !visibleUids.includes(u))
                  : Array.from(new Set([...prev, ...visibleUids])),
              )
            }>
            <Text style={styles.selectAll}>{allSelected ? 'Bỏ chọn' : 'Chọn tất cả'}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.nav, {paddingTop: insets.top + 10}]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={({pressed}) => [styles.backBtn, pressed && {backgroundColor: colors.border}]}>
          <Icon name="arrowLeft" size={21} color={colors.text2} strokeWidth={2.3} />
        </Pressable>
        <View style={{flex: 1}}>
          <Text style={styles.title}>Tạo nhóm mới</Text>
          <Text style={styles.counter}>Đã chọn: {selected.length} thành viên</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{flex: 1}} behavior="padding">
        <MemberPicker excludeUids={exclude} selected={selected} onToggle={toggle} renderHeader={renderHeader} />
        <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 12) + 4}]}>
          <Button
            title={`Tạo nhóm (${selected.length + 1} thành viên)`}
            iconRight="chevronRight"
            onPress={onCreate}
            loading={loading}
            disabled={!canCreate}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 18, fontWeight: '700', color: colors.text},
  counter: {fontSize: 12.5, fontWeight: '500', color: colors.textSub, marginTop: 1},
  row: {flexDirection: 'row', alignItems: 'center'},
  labelRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8},
  label: {fontSize: 14, fontWeight: '600', color: colors.text2},
  required: {fontSize: 12, color: colors.textMuted},
  nameInput: {height: 52, borderRadius: 18, fontSize: 15},
  minPill: {marginLeft: 6, backgroundColor: colors.dangerLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2},
  minPillOk: {backgroundColor: '#ECFDF5'},
  minText: {fontSize: 11.5, color: colors.danger},
  selectAll: {fontSize: 12.5, color: colors.primary, fontWeight: '600'},
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#fff',
  },
});

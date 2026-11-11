import React, {useEffect, useMemo, useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button, Header} from '../components/common';
import MemberPicker from '../components/MemberPicker';
import {useAuth} from '../context/AuthContext';
import {useData} from '../context/DataContext';
import {listenConversation} from '../services/chatService';
import {addMembers} from '../services/groupService';
import {colors} from '../theme';

export default function AddMembersScreen({navigation, route}) {
  const {convId} = route.params;
  const {me} = useAuth();
  const {users} = useData();
  const insets = useSafeAreaInsets();
  const [conv, setConv] = useState(null);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => listenConversation(convId, setConv), [convId]);

  const exclude = useMemo(() => Object.keys(conv?.members || {}), [conv]);

  const toggle = uid =>
    setSelected(prev => (prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]));

  const onAdd = async () => {
    setLoading(true);
    try {
      await addMembers({convId, conv, me, uids: selected, users});
      navigation.goBack();
    } catch (e) {
      Alert.alert('Lỗi', e.message);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Thêm thành viên" subtitle={conv?.name} onBack={() => navigation.goBack()} />
      <MemberPicker excludeUids={exclude} selected={selected} onToggle={toggle} />
      <View style={[styles.footer, {paddingBottom: insets.bottom + 12}]}>
        <Button
          title={`Thêm ${selected.length} người`}
          onPress={onAdd}
          loading={loading}
          disabled={!selected.length || !conv}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});

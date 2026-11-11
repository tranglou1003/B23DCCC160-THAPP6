import React, {useEffect, useMemo, useState} from 'react';
import {Alert, FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {Avatar, Button, Header, Input} from '../components/common';
import {useAuth} from '../context/AuthContext';
import {useData} from '../context/DataContext';
import {listenConversation} from '../services/chatService';
import {leaveGroup, removeMember, renameGroup} from '../services/groupService';
import {formatLastSeen} from '../utils/format';
import {colors} from '../theme';

export default function GroupInfoScreen({navigation, route}) {
  const {convId} = route.params;
  const {me} = useAuth();
  const {users, statuses} = useData();
  const [conv, setConv] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      listenConversation(
        convId,
        val => {
          setConv(val);
          if (val?.name) {
            setName(n => n || val.name);
          }
        },
        () => setConv(null),
      ),
    [convId],
  );

  const isAdmin = conv?.createdBy === me.uid;
  const members = useMemo(
    () =>
      Object.keys(conv?.members || {})
        .map(uid => ({uid, ...users[uid], status: statuses[uid]}))
        .sort((a, b) => (a.uid === conv?.createdBy ? -1 : b.uid === conv?.createdBy ? 1 : 0)),
    [conv, users, statuses],
  );

  const run = async fn => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Lỗi', e.message);
    } finally {
      setBusy(false);
    }
  };

  const onRename = () =>
    run(async () => {
      await renameGroup({convId, conv, me, name});
      Alert.alert('Đã đổi tên nhóm');
    });

  const onRemove = m =>
    Alert.alert('Xóa thành viên', `Xóa ${m.displayName} khỏi nhóm?`, [
      {text: 'Hủy', style: 'cancel'},
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => run(() => removeMember({convId, conv, me, uid: m.uid, users})),
      },
    ]);

  const onLeave = () =>
    Alert.alert('Rời nhóm', 'Bạn sẽ không nhận được tin nhắn của nhóm này nữa.', [
      {text: 'Hủy', style: 'cancel'},
      {
        text: 'Rời nhóm',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await leaveGroup({convId, conv, me});
            navigation.popToTop();
          }),
      },
    ]);

  if (!conv) {
    return (
      <View style={styles.container}>
        <Header title="Thông tin nhóm" onBack={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Thông tin nhóm"
        subtitle={`${members.length} thành viên`}
        onBack={() => navigation.goBack()}
      />
      <FlatList
        data={members}
        keyExtractor={m => m.uid}
        ListHeaderComponent={
          <View style={styles.top}>
            <Avatar name={conv.name} colorKey={convId} isGroup size={80} />
            <Text style={styles.groupName}>{conv.name}</Text>
            <Text style={styles.label}>Đổi tên nhóm</Text>
            <View style={styles.renameRow}>
              <Input value={name} onChangeText={setName} style={{flex: 1}} maxLength={50} />
              <Button
                title="Lưu"
                onPress={onRename}
                disabled={busy || !name.trim() || name.trim() === conv.name}
                style={{marginLeft: 8}}
              />
            </View>
            <Button
              title="+ Thêm thành viên"
              variant="outline"
              onPress={() => navigation.navigate('AddMembers', {convId})}
              style={{marginTop: 16}}
            />
            <Text style={[styles.label, {marginTop: 20}]}>Thành viên</Text>
          </View>
        }
        renderItem={({item}) => {
          const online = item.status?.state === 'online';
          return (
            <View style={styles.row}>
              <Avatar uri={item.avatarUrl} name={item.displayName} colorKey={item.uid} online={online} size={44} />
              <View style={styles.body}>
                <Text style={styles.name}>
                  {item.displayName || 'Người dùng'}
                  {item.uid === me.uid ? ' (Bạn)' : ''}
                </Text>
                <Text style={styles.sub}>
                  {item.uid === conv.createdBy ? '👑 Trưởng nhóm · ' : ''}
                  {online ? 'Đang hoạt động' : formatLastSeen(item.status?.lastChanged)}
                </Text>
              </View>
              {isAdmin && item.uid !== me.uid ? (
                <Pressable onPress={() => onRemove(item)} disabled={busy} style={styles.removeBtn}>
                  <Text style={styles.removeText}>Xóa</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
        ListFooterComponent={
          <View style={{padding: 16}}>
            <Button title="Rời nhóm" variant="danger" onPress={onLeave} loading={busy} />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  top: {padding: 16, alignItems: 'stretch'},
  groupName: {fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 8},
  label: {fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 6},
  renameRow: {flexDirection: 'row', alignItems: 'center'},
  row: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9},
  body: {flex: 1, marginLeft: 12},
  name: {fontSize: 15.5, fontWeight: '600', color: colors.text},
  sub: {fontSize: 12.5, color: colors.textMuted, marginTop: 2},
  removeBtn: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#FEE2E2'},
  removeText: {color: colors.danger, fontWeight: '700', fontSize: 13},
});

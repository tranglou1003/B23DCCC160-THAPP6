import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {Avatar, EmptyState, Header, HeaderButton, SearchBox} from '../components/common';
import Icon from '../components/Icon';
import {useAuth} from '../context/AuthContext';
import {useData} from '../context/DataContext';
import {ensureDirectConversation} from '../services/chatService';
import {formatLastSeen, normalize} from '../utils/format';
import {colors} from '../theme';

export default function ContactsScreen({navigation}) {
  const {me} = useAuth();
  const {users, statuses} = useData();
  const [search, setSearch] = useState('');
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [opening, setOpening] = useState(null);

  const all = useMemo(
    () =>
      Object.entries(users)
        .filter(([uid]) => uid !== me.uid)
        .map(([uid, u]) => ({uid, ...u, status: statuses[uid]})),
    [users, statuses, me.uid],
  );
  const onlineCount = all.filter(c => c.status?.state === 'online').length;

  const contacts = useMemo(() => {
    const kw = normalize(search.trim());
    return all
      .filter(c => !onlyOnline || c.status?.state === 'online')
      .filter(c => !kw || normalize(c.displayName).includes(kw) || normalize(c.email).includes(kw))
      .sort((a, b) => {
        const ao = a.status?.state === 'online' ? 1 : 0;
        const bo = b.status?.state === 'online' ? 1 : 0;
        return bo - ao || (a.displayName || '').localeCompare(b.displayName || '');
      });
  }, [all, search, onlyOnline]);

  const openChat = async uid => {
    if (opening) {
      return;
    }
    setOpening(uid);
    try {
      const convId = await ensureDirectConversation(me.uid, uid);
      navigation.navigate('Chat', {convId});
    } catch (e) {
      Alert.alert('Lỗi', e.message);
    } finally {
      setOpening(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        large
        title="Danh bạ"
        subtitle={`${all.length} người liên hệ`}
        right={<HeaderButton icon="userGroupAdd" label="Tạo nhóm" onPress={() => navigation.navigate('CreateGroup')} />}
      />
      <View style={styles.searchArea}>
        <SearchBox value={search} onChangeText={setSearch} placeholder="Tìm theo tên hoặc email" variant="outlined" />
        <View style={{flexDirection: 'row'}}>
          <Pressable
            onPress={() => setOnlyOnline(v => !v)}
            style={({pressed}) => [styles.onlineChip, onlyOnline && styles.onlineChipOn, pressed && {opacity: 0.8}]}>
            <View style={styles.greenDot} />
            <Text style={[styles.onlineText, onlyOnline && {color: '#047857'}]}>Đang hoạt động</Text>
            <View style={styles.onlineCount}>
              <Text style={styles.onlineCountText}>{onlineCount}</Text>
            </View>
          </Pressable>
        </View>
      </View>
      <View style={styles.divider} />

      <FlatList
        data={contacts}
        keyExtractor={c => c.uid}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={<EmptyState icon="users" title="Không có liên hệ nào" />}
        renderItem={({item}) => {
          const online = item.status?.state === 'online';
          return (
            <Pressable
              style={({pressed}) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => openChat(item.uid)}>
              <Avatar
                uri={item.avatarUrl}
                name={item.displayName}
                colorKey={item.uid}
                online={online}
                shape="rounded"
                size={46}
              />
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.displayName}
                </Text>
                <Text style={[styles.sub, online && {color: colors.online}]} numberOfLines={1}>
                  {online ? 'Đang hoạt động' : formatLastSeen(item.status?.lastChanged)}
                </Text>
              </View>
              <Pressable
                onPress={() => openChat(item.uid)}
                style={({pressed}) => [styles.chatBtn, pressed && styles.chatBtnPressed]}>
                {opening === item.uid ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Icon name="chat" size={17} color={colors.textMuted} strokeWidth={1.8} />
                )}
              </Pressable>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function Separator() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  searchArea: {paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12, gap: 12},
  onlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.softBg,
    borderWidth: 1,
    borderColor: colors.border2,
  },
  onlineChipOn: {backgroundColor: '#ECFDF5', borderColor: '#A7F3D0'},
  greenDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.online},
  onlineText: {fontSize: 12.5, fontWeight: '500', color: colors.text2},
  onlineCount: {backgroundColor: '#D1FAE5', borderRadius: 9, paddingHorizontal: 7, paddingVertical: 1},
  onlineCountText: {fontSize: 10.5, fontWeight: '700', color: '#047857'},
  divider: {height: 1, backgroundColor: colors.border, marginHorizontal: 20},
  list: {paddingHorizontal: 8, paddingVertical: 6},
  row: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 18},
  rowPressed: {backgroundColor: colors.softBg},
  body: {flex: 1, marginLeft: 14},
  name: {fontSize: 15, fontWeight: '600', color: '#1E293B'},
  sub: {fontSize: 12, color: colors.textMuted, marginTop: 2},
  chatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.softBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtnPressed: {backgroundColor: colors.primaryLight},
  sep: {height: 1, backgroundColor: colors.softBg, marginHorizontal: 12},
});

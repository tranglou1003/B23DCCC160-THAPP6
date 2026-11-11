import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {Avatar, EmptyState, FilterChip, Header, IconButton, SearchBox} from '../components/common';
import Icon from '../components/Icon';
import {useAuth} from '../context/AuthContext';
import {useData} from '../context/DataContext';
import {chatDisplayInfo} from '../utils/chat';
import {formatShortDate, normalize, previewText} from '../utils/format';
import {colors} from '../theme';

const FILTERS = [
  {key: 'all', label: 'Tất cả'},
  {key: 'unread', label: 'Chưa đọc'},
  {key: 'group', label: 'Nhóm'},
];

/** Tin cuối: [tiền tố, icon (image/location), nội dung]. */
function lastLine(chat, info, myUid, users) {
  const type = chat.lastMessageType;
  let icon = null;
  let text = previewText(type, chat.lastMessage);
  if (type === 'image') {
    icon = 'camera';
    text = 'Hình ảnh';
  } else if (type === 'location') {
    icon = 'mapPin';
    text = 'Vị trí';
  }
  let prefix = '';
  if (type !== 'system' && chat.lastSenderId) {
    if (chat.lastSenderId === myUid) {
      prefix = 'Bạn: ';
    } else if (info.isGroup) {
      const name = users[chat.lastSenderId]?.displayName || chat.lastSenderName || '';
      prefix = name ? `${name.split(' ').pop()}: ` : '';
    }
  }
  return {prefix, icon, text};
}

export default function HomeScreen({navigation}) {
  const {me} = useAuth();
  const {chats, users, statuses, chatsLoaded, totalUnread} = useData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const items = useMemo(() => {
    const kw = normalize(search.trim());
    return chats
      .map(chat => ({
        chat,
        info: chatDisplayInfo({convId: chat.id, conv: chat.conv, users, statuses, myUid: me.uid}),
      }))
      .filter(({chat, info}) => {
        if (filter === 'unread' && !chat.unread) {
          return false;
        }
        if (filter === 'group' && !info.isGroup) {
          return false;
        }
        return !kw || normalize(info.title).includes(kw);
      });
  }, [chats, users, statuses, me.uid, search, filter]);

  const onCompose = () =>
    Alert.alert('Tạo cuộc hội thoại mới', undefined, [
      {text: 'Hủy', style: 'cancel'},
      {text: 'Nhóm mới', onPress: () => navigation.navigate('CreateGroup')},
      {text: 'Tin nhắn mới', onPress: () => navigation.navigate('Contacts')},
    ]);

  const renderItem = ({item: {chat, info}}) => {
    const unread = chat.unread || 0;
    const {prefix, icon, text} = lastLine(chat, info, me.uid, users);
    return (
      <Pressable
        style={({pressed}) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => navigation.navigate('Chat', {convId: chat.id})}>
        <View style={styles.avatarBox}>
          <Avatar
            uri={info.avatarUrl}
            name={info.title}
            colorKey={info.isGroup ? chat.id : info.otherUid}
            online={info.online}
            isGroup={info.isGroup}
            size={52}
          />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <View style={styles.nameBox}>
              {info.isGroup ? (
                <View style={{marginRight: 5}}>
                  <Icon name="users" size={13} color="#0284C7" strokeWidth={2} />
                </View>
              ) : null}
              <Text style={styles.name} numberOfLines={1}>
                {info.title}
              </Text>
            </View>
            <Text style={[styles.time, unread > 0 && styles.timeUnread]}>{formatShortDate(chat.updatedAt)}</Text>
          </View>
          <View style={styles.rowBottom}>
            <View style={styles.lastBox}>
              {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
              {icon ? (
                <View style={{marginRight: 4}}>
                  <Icon name={icon} size={13} color={colors.textSub} strokeWidth={2} />
                </View>
              ) : null}
              <Text
                style={[
                  styles.last,
                  unread > 0 && styles.lastUnread,
                  chat.lastMessageType === 'recalled' && styles.italic,
                ]}
                numberOfLines={1}>
                {text}
              </Text>
            </View>
            {unread > 0 ? (
              unread > 1 ? (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              ) : (
                <View style={styles.unreadDot} />
              )
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        large
        title="Tin nhắn"
        right={
          <IconButton icon="compose" size={20} color={colors.text2} bg={colors.softBg} onPress={onCompose} strokeWidth={1.8} />
        }
      />
      <View style={styles.searchWrap}>
        <SearchBox value={search} onChangeText={setSearch} placeholder="Tìm kiếm trò chuyện..." />
      </View>
      <View style={styles.filters}>
        {FILTERS.map(f => (
          <FilterChip
            key={f.key}
            label={f.label}
            active={filter === f.key}
            dot={f.key === 'unread' && totalUnread > 0}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>

      {!chatsLoaded ? (
        <ActivityIndicator style={{marginTop: 40}} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={it => it.chat.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            <EmptyState
              icon="chat"
              title="Chưa có cuộc trò chuyện"
              subtitle="Nhấn nút soạn tin ở góc trên để nhắn cho bạn bè hoặc tạo nhóm mới."
            />
          }
        />
      )}
    </View>
  );
}

function Separator() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  searchWrap: {paddingHorizontal: 20, paddingVertical: 8},
  filters: {flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8},
  list: {paddingHorizontal: 8, paddingBottom: 20},
  row: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 18},
  rowPressed: {backgroundColor: colors.border},
  avatarBox: {marginRight: 14},
  rowBody: {flex: 1, minWidth: 0},
  rowTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4},
  nameBox: {flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8},
  name: {flexShrink: 1, fontSize: 15, fontWeight: '600', color: colors.text},
  time: {fontSize: 12, color: colors.textMuted},
  timeUnread: {color: colors.primary, fontWeight: '600'},
  rowBottom: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  lastBox: {flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8},
  prefix: {fontSize: 13, color: colors.textMuted},
  last: {flexShrink: 1, fontSize: 13, color: colors.textSub},
  lastUnread: {color: colors.text2, fontWeight: '600'},
  italic: {fontStyle: 'italic'},
  unreadDot: {width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary},
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {color: '#fff', fontSize: 11, fontWeight: '700'},
  sep: {height: 1, backgroundColor: colors.border, marginHorizontal: 12},
});

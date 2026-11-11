import React, {useMemo, useState} from 'react';
import {Alert, FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {Avatar, EmptyState, FilterChip, Header, HeaderButton} from '../components/common';
import Icon from '../components/Icon';
import {useAuth} from '../context/AuthContext';
import {useData} from '../context/DataContext';
import {markNotificationRead, markNotificationsRead} from '../services/notificationService';
import {formatShortDate, formatTime} from '../utils/format';
import {colors} from '../theme';

const TYPE_META = {
  message: {icon: 'chat', label: 'Tin nhắn mới', bg: colors.primary},
  group_added: {icon: 'users', label: 'Nhóm', bg: '#0EA5E9'},
  reaction: {icon: 'bell', label: 'Cảm xúc', bg: colors.danger},
};

export default function NotificationsScreen({navigation}) {
  const {me} = useAuth();
  const {notifications, unreadNotifications, users, userChats} = useData();
  const [onlyUnread, setOnlyUnread] = useState(false);

  const list = useMemo(
    () => (onlyUnread ? notifications.filter(n => !n.read) : notifications),
    [notifications, onlyUnread],
  );

  const onPress = n => {
    if (!n.read) {
      markNotificationRead(me.uid, n.id).catch(() => {});
    }
    if (!n.convId) {
      return;
    }
    if (!userChats[n.convId]) {
      Alert.alert('Không thể mở', 'Bạn không còn ở trong cuộc trò chuyện này.');
      return;
    }
    navigation.navigate('Chat', {convId: n.convId});
  };

  const markAll = () => {
    markNotificationsRead(me.uid, notifications).catch(e => Alert.alert('Lỗi', e.message));
  };

  return (
    <View style={styles.container}>
      <Header
        large
        title="Thông báo"
        subtitle={unreadNotifications ? `${unreadNotifications} chưa đọc` : 'Bạn đã đọc hết'}
        right={<HeaderButton icon="check" label="Đánh dấu tất cả đã đọc" onPress={markAll} disabled={!unreadNotifications} />}
      />
      <View style={styles.filters}>
        <FilterChip label="Tất cả" active={!onlyUnread} onPress={() => setOnlyUnread(false)} />
        <FilterChip
          label={`Chưa đọc (${unreadNotifications})`}
          active={onlyUnread}
          dot={unreadNotifications > 0 && !onlyUnread}
          onPress={() => setOnlyUnread(true)}
        />
      </View>
      <FlatList
        data={list}
        keyExtractor={n => n.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={<EmptyState icon="bell" title="Không có thông báo" />}
        renderItem={({item}) => {
          const from = users[item.fromUid];
          const meta = TYPE_META[item.type] || TYPE_META.message;
          return (
            <Pressable
              onPress={() => onPress(item)}
              style={({pressed}) => [styles.row, !item.read && styles.rowUnread, pressed && {opacity: 0.75}]}>
              <View>
                <Avatar uri={from?.avatarUrl} name={from?.displayName} colorKey={item.fromUid} size={46} />
                <View style={[styles.typeBadge, {backgroundColor: meta.bg}]}>
                  <Icon name={meta.icon} size={11} color="#fff" strokeWidth={2.2} />
                </View>
              </View>
              <View style={styles.body}>
                <Text style={styles.type}>{meta.label}</Text>
                <Text style={[styles.text, !item.read && styles.textUnread]} numberOfLines={3}>
                  {item.text}
                </Text>
                <Text style={styles.time}>
                  {formatShortDate(item.createdAt)} · {formatTime(item.createdAt)}
                </Text>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
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
  filters: {flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10},
  list: {paddingHorizontal: 8, paddingBottom: 16},
  row: {flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 18},
  rowUnread: {backgroundColor: colors.primaryLight},
  typeBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  body: {flex: 1, marginLeft: 14},
  type: {fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase'},
  text: {fontSize: 14, color: colors.textSub, marginTop: 2, lineHeight: 19},
  textUnread: {color: colors.text, fontWeight: '600'},
  time: {fontSize: 11.5, color: colors.textMuted, marginTop: 4},
  dot: {width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6, marginLeft: 8},
  sep: {height: 1, backgroundColor: colors.border, marginHorizontal: 12},
});

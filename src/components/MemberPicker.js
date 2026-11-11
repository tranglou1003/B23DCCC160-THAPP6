import React, {useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {Avatar, Checkbox, EmptyState, SearchBox} from './common';
import {useData} from '../context/DataContext';
import {normalize} from '../utils/format';
import {colors} from '../theme';

/**
 * Danh sách chọn thành viên từ Danh bạ (checkbox tròn).
 * renderHeader(visibleUids) cho phép màn cha vẽ phần tiêu đề (VD có nút "Chọn tất cả").
 */
export default function MemberPicker({excludeUids = [], selected, onToggle, renderHeader}) {
  const {users, statuses} = useData();
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const kw = normalize(search.trim());
    return Object.entries(users)
      .filter(([uid]) => !excludeUids.includes(uid))
      .map(([uid, u]) => ({uid, ...u}))
      .filter(u => !kw || normalize(u.displayName).includes(kw) || normalize(u.email).includes(kw))
      .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
  }, [users, excludeUids, search]);

  return (
    <FlatList
      data={list}
      keyExtractor={u => u.uid}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        <View>
          {renderHeader ? renderHeader(list.map(u => u.uid)) : null}
          <SearchBox value={search} onChangeText={setSearch} placeholder="Tìm trong danh bạ" style={styles.search} />
        </View>
      }
      ListEmptyComponent={<EmptyState icon="users" title="Không tìm thấy liên hệ" />}
      renderItem={({item}) => {
        const checked = selected.includes(item.uid);
        return (
          <Pressable
            onPress={() => onToggle(item.uid)}
            style={({pressed}) => [styles.row, pressed && {opacity: 0.7}]}>
            <Avatar
              uri={item.avatarUrl}
              name={item.displayName}
              colorKey={item.uid}
              variant="pastel"
              online={statuses[item.uid]?.state === 'online'}
              size={46}
            />
            <View style={styles.body}>
              <Text style={[styles.name, checked && {color: colors.primary}]} numberOfLines={1}>
                {item.displayName}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
            <Checkbox checked={checked} />
          </Pressable>
        );
      }}
    />
  );
}

function Separator() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  content: {paddingHorizontal: 20, paddingBottom: 16},
  search: {marginTop: 12, marginBottom: 4, backgroundColor: colors.inputBg},
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 12},
  body: {flex: 1, marginLeft: 12},
  name: {fontSize: 14.5, fontWeight: '600', color: colors.text},
  email: {fontSize: 12.5, color: colors.textSub, marginTop: 1},
  sep: {height: 1, backgroundColor: colors.border},
});

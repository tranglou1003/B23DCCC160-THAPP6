import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import Clipboard from '@react-native-clipboard/clipboard';
import Geolocation from '@react-native-community/geolocation';

import {Avatar, IconButton} from '../components/common';
import Icon from '../components/Icon';
import MessageBubble, {DayLabel, PendingImageBubble} from '../components/MessageBubble';
import MessageMenu from '../components/MessageMenu';
import ImageViewer from '../components/ImageViewer';
import {useAuth} from '../context/AuthContext';
import {useData} from '../context/DataContext';
import {
  listenConversation,
  listenReadStatus,
  listenTyping,
  markConversationRead,
  recallMessage,
  searchMessages,
  sendMessage,
  setTyping,
  subscribeLatestMessages,
  subscribeOlderMessages,
  toggleReaction,
} from '../services/chatService';
import {setActiveConversation} from '../services/presenceService';
import {markNotificationsRead} from '../services/notificationService';
import {uploadImage, IMAGE_PICKER_OPTIONS} from '../services/uploadService';
import {PAGE_SIZE, TYPING_TIMEOUT} from '../config/appConfig';
import {chatDisplayInfo} from '../utils/chat';
import {dayKey, formatLastSeen, formatSeenTime, formatShortDate, messagePreview} from '../utils/format';
import {colors} from '../theme';

function toast(msg) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert(msg);
  }
}

export default function ChatScreen({navigation, route}) {
  const {convId} = route.params;
  const {me} = useAuth();
  const {users, statuses, userChats, notifications} = useData();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [conv, setConv] = useState(undefined);
  const [convError, setConvError] = useState(null);
  const [msgsById, setMsgsById] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typingMap, setTypingMap] = useState({});
  const [readStatus, setReadStatus] = useState({});
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [pendings, setPendings] = useState([]);
  const [menuMsg, setMenuMsg] = useState(null);
  const [viewerUri, setViewerUri] = useState(null);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [highlightId, setHighlightId] = useState(null);
  const [scrollTargetId, setScrollTargetId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [, setTick] = useState(0);

  const listRef = useRef(null);
  const olderUnsubs = useRef([]);
  const loadingOlderRef = useRef(false);
  const typingActive = useRef(false);
  const typingTimer = useRef(null);
  // ref để các tác vụ bất đồng bộ (upload ảnh) luôn dùng dữ liệu mới nhất
  const latest = useRef({});
  latest.current = {conv, statuses, me, replyTo};

  /* ---------------- Listener: hội thoại, trạng thái gõ, đã xem ---------------- */
  useEffect(() => {
    const unsubConv = listenConversation(
      convId,
      val => {
        setConv(val);
        setConvError(null);
      },
      err => setConvError(err.message),
    );
    const unsubTyping = listenTyping(convId, setTypingMap);
    const unsubRead = listenReadStatus(convId, setReadStatus);
    return () => {
      unsubConv();
      unsubTyping();
      unsubRead();
    };
  }, [convId]);

  /* ---------------- Tin nhắn: 20 tin mới nhất + realtime ---------------- */
  useEffect(() => {
    setMsgsById({});
    setInitialLoading(true);
    const unsub = subscribeLatestMessages(convId, {
      onInitial: (list, more) => {
        setMsgsById(prev => {
          const next = {...prev};
          list.forEach(m => {
            next[m.id] = m;
          });
          return next;
        });
        setHasMore(more);
        setInitialLoading(false);
      },
      onUpsert: m => setMsgsById(prev => ({...prev, [m.id]: m})),
      onError: err => {
        setInitialLoading(false);
        setConvError(err.message);
      },
    });
    return () => {
      unsub();
      olderUnsubs.current.forEach(u => u());
      olderUnsubs.current = [];
    };
  }, [convId]);

  const sorted = useMemo(
    () =>
      Object.values(msgsById).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    [msgsById],
  );

  /** Kéo lên đầu danh sách: tải thêm 20 tin cũ hơn (endBefore + limitToLast). */
  const loadOlder = useCallback(() => {
    if (loadingOlderRef.current || !hasMore || !sorted.length) {
      return;
    }
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    let first = true;
    const unsub = subscribeOlderMessages(
      convId,
      sorted[0].id,
      list => {
        setMsgsById(prev => {
          const next = {...prev};
          list.forEach(m => {
            next[m.id] = m;
          });
          return next;
        });
        if (first) {
          first = false;
          setHasMore(list.length >= PAGE_SIZE);
          loadingOlderRef.current = false;
          setLoadingOlder(false);
        }
      },
      () => {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      },
    );
    olderUnsubs.current.push(unsub);
  }, [convId, hasMore, sorted]);

  /* ---------------- Đang ở trong cuộc trò chuyện ---------------- */
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const viewing = isFocused && appActive;

  useEffect(() => {
    if (viewing) {
      setActiveConversation(convId);
    } else {
      setActiveConversation(null);
      stopTyping();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewing, convId]);

  // Rời màn hình: xóa activeConv + tắt "đang soạn tin"
  useEffect(
    () => () => {
      setActiveConversation(null);
      clearTimeout(typingTimer.current);
      if (typingActive.current) {
        typingActive.current = false;
        setTyping(convId, me.uid, false);
      }
    },
    [convId, me.uid],
  );

  const isMember = !!conv?.members?.[me.uid];
  const latestId = sorted.length ? sorted[sorted.length - 1].id : null;
  const myUnread = userChats[convId]?.unread || 0;
  const hasUserChat = !!userChats[convId];

  // Đánh dấu đã đọc (readStatus + unread = 0) khi đang xem và có tin mới
  useEffect(() => {
    if (!viewing || !isMember || !latestId) {
      return;
    }
    markConversationRead(convId, me.uid, hasUserChat);
  }, [viewing, isMember, latestId, myUnread, hasUserChat, convId, me.uid]);

  // Thông báo "tin nhắn mới" của cuộc trò chuyện đang mở => đã đọc
  useEffect(() => {
    if (!viewing) {
      return;
    }
    const pending = notifications.filter(
      n => n.convId === convId && n.type === 'message' && !n.read,
    );
    if (pending.length) {
      markNotificationsRead(me.uid, pending).catch(() => {});
    }
  }, [viewing, notifications, convId, me.uid]);

  // Cập nhật "Hoạt động X phút trước"
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  /* ---------------- Đang soạn tin ---------------- */
  const stopTyping = useCallback(() => {
    clearTimeout(typingTimer.current);
    if (typingActive.current) {
      typingActive.current = false;
      setTyping(convId, me.uid, false);
    }
  }, [convId, me.uid]);

  const onChangeText = value => {
    setText(value);
    if (!isMember) {
      return;
    }
    if (!value.trim()) {
      stopTyping();
      return;
    }
    if (!typingActive.current) {
      typingActive.current = true;
      setTyping(convId, me.uid, true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, TYPING_TIMEOUT);
  };

  /* ---------------- Gửi tin ---------------- */
  const buildReply = () => {
    const r = latest.current.replyTo;
    if (!r) {
      return undefined;
    }
    return {
      id: r.id,
      senderId: r.senderId,
      senderName: r.senderId === me.uid ? 'Bạn' : users[r.senderId]?.displayName || r.senderName || '',
      preview: messagePreview(r).slice(0, 120),
    };
  };

  const send = async payload => {
    const {conv: c, statuses: st} = latest.current;
    await sendMessage({convId, conv: c, sender: me, payload, statuses: st});
  };

  const onSend = async () => {
    const value = text.trim();
    if (!value) {
      return;
    }
    const reply = buildReply();
    setText('');
    setReplyTo(null);
    clearTimeout(typingTimer.current);
    typingActive.current = false; // multi-path update sẽ xóa typing/{convId}/{uid}
    try {
      await send({type: 'text', text: value, replyTo: reply});
    } catch (e) {
      Alert.alert('Gửi thất bại', e.message);
      setText(value);
    }
  };

  /* ---------------- Gửi ảnh ---------------- */
  const startUpload = async (asset, reply, existingId) => {
    const id = existingId || `pending_${Date.now()}`;
    if (existingId) {
      setPendings(p => p.map(x => (x.id === id ? {...x, status: 'uploading', error: null} : x)));
    } else {
      setPendings(p => [...p, {id, asset, reply, status: 'uploading'}]);
    }
    try {
      const up = await uploadImage(asset);
      await send({
        type: 'image',
        imageUrl: up.url,
        imageWidth: up.width,
        imageHeight: up.height,
        replyTo: reply,
      });
      setPendings(p => p.filter(x => x.id !== id));
    } catch (e) {
      setPendings(p => p.map(x => (x.id === id ? {...x, status: 'error', error: e.message} : x)));
    }
  };

  const handlePickerResult = res => {
    if (res.didCancel) {
      return;
    }
    if (res.errorCode) {
      const msg =
        res.errorCode === 'camera_unavailable'
          ? 'Thiết bị không có camera.'
          : res.errorCode === 'permission'
          ? 'Ứng dụng chưa được cấp quyền.'
          : res.errorMessage || res.errorCode;
      Alert.alert('Không thể lấy ảnh', msg);
      return;
    }
    const asset = res.assets?.[0];
    if (asset?.uri) {
      const reply = buildReply();
      setReplyTo(null);
      startUpload(asset, reply);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: 'Quyền sử dụng camera',
        message: 'Ứng dụng cần quyền camera để chụp và gửi ảnh.',
        buttonPositive: 'Đồng ý',
        buttonNegative: 'Từ chối',
      });
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          'Không có quyền camera',
          'Bạn đã từ chối quyền camera nên không thể chụp ảnh. Bạn vẫn có thể chọn ảnh từ thư viện hoặc cấp quyền trong Cài đặt.',
          [
            {text: 'Đóng', style: 'cancel'},
            {text: 'Mở Cài đặt', onPress: () => Linking.openSettings()},
          ],
        );
        return;
      }
    }
    handlePickerResult(await launchCamera({...IMAGE_PICKER_OPTIONS, cameraType: 'back'}));
  };

  const pickFromLibrary = async () => {
    handlePickerResult(await launchImageLibrary({...IMAGE_PICKER_OPTIONS, selectionLimit: 1}));
  };

  const onPressCamera = () =>
    Alert.alert('Gửi ảnh', 'Chọn nguồn ảnh', [
      {text: 'Hủy', style: 'cancel'},
      {text: '🖼️ Thư viện', onPress: pickFromLibrary},
      {text: '📷 Chụp ảnh', onPress: takePhoto},
    ]);

  /* ---------------- Gửi vị trí ---------------- */
  const onSendLocation = async () => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Không có quyền vị trí', 'Hãy cấp quyền vị trí để chia sẻ vị trí.');
        return;
      }
    }
    toast('Đang lấy vị trí…');
    Geolocation.getCurrentPosition(
      async pos => {
        try {
          await send({
            type: 'location',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            replyTo: buildReply(),
          });
          setReplyTo(null);
        } catch (e) {
          Alert.alert('Gửi thất bại', e.message);
        }
      },
      err => Alert.alert('Không lấy được vị trí', err.message),
      {enableHighAccuracy: true, timeout: 20000, maximumAge: 10000},
    );
  };

  /* ---------------- Menu nhấn giữ ---------------- */
  const closeMenu = () => setMenuMsg(null);

  const onReact = async emoji => {
    const m = menuMsg;
    closeMenu();
    try {
      await toggleReaction({convId, message: m, me, emoji});
    } catch (e) {
      Alert.alert('Lỗi', e.message);
    }
  };

  const onCopy = () => {
    Clipboard.setString(menuMsg.text || '');
    closeMenu();
    toast('Đã sao chép');
  };

  const onRecall = () => {
    const m = menuMsg;
    closeMenu();
    Alert.alert('Thu hồi tin nhắn', 'Tin nhắn sẽ được thu hồi với mọi người trong cuộc trò chuyện.', [
      {text: 'Hủy', style: 'cancel'},
      {
        text: 'Thu hồi',
        style: 'destructive',
        onPress: () =>
          recallMessage({convId, conv, message: m, myUid: me.uid}).catch(e =>
            Alert.alert('Không thể thu hồi', e.message),
          ),
      },
    ]);
  };

  const onReply = () => {
    setReplyTo(menuMsg);
    closeMenu();
  };

  /* ---------------- Cuộn tới tin gốc / kết quả tìm kiếm ---------------- */
  const listData = useMemo(() => {
    const items = sorted.map((msg, i) => {
      const prev = sorted[i - 1];
      const showDay = !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);
      const next = sorted[i + 1];
      const showSender =
        !prev || prev.senderId !== msg.senderId || prev.type === 'system' || showDay;
      // "đuôi" bong bóng ở tin cuối của một chuỗi tin liên tiếp cùng người gửi
      const tail =
        !next ||
        next.senderId !== msg.senderId ||
        next.type === 'system' ||
        dayKey(next.createdAt) !== dayKey(msg.createdAt);
      return {key: msg.id, kind: 'msg', msg, showDay, showSender, tail};
    });
    const pend = pendings.map(p => ({key: p.id, kind: 'pending', item: p}));
    return [...items, ...pend].reverse(); // FlatList inverted: tin mới nhất ở index 0
  }, [sorted, pendings]);

  const jumpTo = id => {
    setScrollTargetId(id);
  };

  useEffect(() => {
    if (!scrollTargetId) {
      return;
    }
    const index = listData.findIndex(it => it.key === scrollTargetId);
    if (index >= 0) {
      setScrollTargetId(null);
      setHighlightId(scrollTargetId);
      setTimeout(() => {
        listRef.current?.scrollToIndex({index, animated: true, viewPosition: 0.5});
      }, 50);
      return undefined;
    }
    if (hasMore) {
      loadOlder(); // chưa có trong danh sách => tải thêm trang cũ hơn
    } else if (!loadingOlder) {
      setScrollTargetId(null);
      toast('Không tìm thấy tin nhắn gốc');
    }
    return undefined;
  }, [scrollTargetId, listData, hasMore, loadingOlder, loadOlder]);

  useEffect(() => {
    if (!highlightId) {
      return undefined;
    }
    const t = setTimeout(() => setHighlightId(null), 2000);
    return () => clearTimeout(t);
  }, [highlightId]);

  const onScrollToIndexFailed = info => {
    listRef.current?.scrollToOffset({offset: info.averageItemLength * info.index, animated: false});
    setTimeout(() => {
      listRef.current?.scrollToIndex({index: info.index, animated: true, viewPosition: 0.5});
    }, 250);
  };

  // Tìm kiếm nội dung tin nhắn (debounce)
  useEffect(() => {
    if (!searchOpen || !searchText.trim()) {
      setSearchResults(null);
      return undefined;
    }
    const t = setTimeout(() => {
      searchMessages(convId, searchText)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 350);
    return () => clearTimeout(t);
  }, [searchText, searchOpen, convId]);

  /* ---------------- Hiển thị ---------------- */
  const info = chatDisplayInfo({convId, conv, users, statuses, myUid: me.uid});
  const otherIds = (info.memberIds || []).filter(u => u && u !== me.uid);

  const typingNames = Object.keys(typingMap)
    .filter(u => u !== me.uid && typingMap[u] && (!conv || conv.members?.[u]))
    .map(u => (users[u]?.displayName || '').split(' ').pop());

  let subtitle;
  let subtitleColor;
  if (typingNames.length) {
    subtitle = info.isGroup ? `${typingNames.join(', ')} đang soạn tin…` : 'đang soạn tin…';
    subtitleColor = colors.primary;
  } else if (info.isGroup) {
    subtitle = `${info.memberIds.length} thành viên · ${info.onlineCount} đang online`;
  } else if (info.online) {
    subtitle = 'Đang hoạt động';
    subtitleColor = colors.online;
  } else {
    subtitle = formatLastSeen(info.lastChanged);
  }

  // "Đã gửi" / "Đã xem" cho tin cuối cùng của mình
  const myLast = useMemo(() => {
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].senderId === me.uid && sorted[i].type !== 'system') {
        return sorted[i];
      }
    }
    return null;
  }, [sorted, me.uid]);

  // Thời điểm đọc muộn nhất của người khác => tin nào có createdAt <= mốc này là "đã xem" (✓✓)
  const othersReadMax = otherIds.reduce((mx, u) => Math.max(mx, readStatus[u] || 0), 0);

  let statusText = null;
  if (myLast) {
    const sentAt = myLast.createdAt || Number.MAX_SAFE_INTEGER;
    const seenBy = otherIds.filter(u => (readStatus[u] || 0) >= sentAt);
    if (!info.isGroup) {
      statusText = seenBy.length ? `Đã xem ${formatSeenTime(readStatus[seenBy[0]])}` : 'Đã gửi';
    } else if (seenBy.length && seenBy.length === otherIds.length) {
      statusText = 'Tất cả đã xem';
    } else if (seenBy.length) {
      const names = seenBy.map(u => (users[u]?.displayName || '').split(' ').pop());
      statusText = `Đã xem bởi ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
    } else {
      statusText = 'Đã gửi';
    }
  }

  const renderItem = ({item}) => {
    if (item.kind === 'pending') {
      return (
        <PendingImageBubble
          item={item.item}
          onRetry={p => startUpload(p.asset, p.reply, p.id)}
          onCancel={p => setPendings(list => list.filter(x => x.id !== p.id))}
        />
      );
    }
    const {msg} = item;
    return (
      <View>
        {item.showDay ? <DayLabel ts={msg.createdAt} /> : null}
        <MessageBubble
          msg={msg}
          isMine={msg.senderId === me.uid}
          isGroup={info.isGroup}
          showSender={item.showSender}
          tail={item.tail}
          seen={msg.senderId === me.uid && !!msg.createdAt && msg.createdAt <= othersReadMax}
          sender={users[msg.senderId]}
          myUid={me.uid}
          statusText={myLast && msg.id === myLast.id ? statusText : null}
          highlighted={highlightId === msg.id}
          onLongPress={m => !m.recalled && setMenuMsg(m)}
          onPressImage={setViewerUri}
          onPressReply={jumpTo}
          onPressReactions={m => setMenuMsg(m)}
        />
      </View>
    );
  };

  const canSend = !!text.trim() && isMember;

  return (
    <View style={styles.container}>
      {/* ---------- Thanh tiêu đề ---------- */}
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={({pressed}) => [styles.backBtn, pressed && {backgroundColor: colors.border}]}>
          <Icon name="back" size={21} color="#475569" strokeWidth={2.2} />
        </Pressable>
        <Pressable
          style={styles.headerUser}
          disabled={!(info.isGroup && isMember)}
          onPress={() => navigation.navigate('GroupInfo', {convId})}>
          <View style={styles.headerAvatar}>
            <Avatar
              uri={info.avatarUrl}
              name={info.title}
              colorKey={info.isGroup ? convId : info.otherUid}
              size={40}
              online={info.online}
              isGroup={info.isGroup}
            />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {info.title}
            </Text>
            <Text style={[styles.headerSub, subtitleColor && {color: subtitleColor}]} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </Pressable>
        <IconButton icon="search" size={17} boxSize={34} onPress={() => setSearchOpen(v => !v)} />
        {info.isGroup && isMember ? (
          <IconButton icon="dotsVertical" size={18} boxSize={34} onPress={() => navigation.navigate('GroupInfo', {convId})} />
        ) : null}
      </View>

      {searchOpen ? (
        <View style={styles.searchBar}>
          <View style={styles.searchField}>
            <Icon name="search" size={15} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              autoFocus
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Tìm trong cuộc trò chuyện..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => {
              setSearchOpen(false);
              setSearchText('');
            }}>
            <Text style={styles.searchCancel}>Đóng</Text>
          </Pressable>
        </View>
      ) : null}

      <KeyboardAvoidingView style={{flex: 1}} behavior="padding">
        <View style={{flex: 1}}>
          {initialLoading ? (
            <ActivityIndicator style={{marginTop: 40}} color={colors.primary} />
          ) : convError && !conv ? (
            <Text style={styles.error}>Không thể tải cuộc trò chuyện: {convError}</Text>
          ) : !listData.length ? (
            <View style={styles.emptyChat}>
              <Avatar
                uri={info.avatarUrl}
                name={info.title}
                colorKey={info.isGroup ? convId : info.otherUid}
                size={72}
                isGroup={info.isGroup}
              />
              <Text style={styles.emptyTitle}>{info.title}</Text>
              <Text style={styles.emptyText}>
                {info.isGroup ? 'Nhóm chưa có tin nhắn nào.' : 'Hai bạn chưa nhắn tin với nhau.'}
              </Text>
              {isMember ? (
                <Pressable
                  style={({pressed}) => [styles.waveBtn, pressed && {backgroundColor: colors.primaryBorder}]}
                  onPress={() => send({type: 'text', text: 'Xin chào 👋'}).catch(e => Alert.alert('Gửi thất bại', e.message))}>
                  <Text style={styles.waveText}>👋  Gửi lời chào</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <FlatList
              ref={listRef}
              inverted
              data={listData}
              keyExtractor={it => it.key}
              renderItem={renderItem}
              onEndReached={loadOlder}
              onEndReachedThreshold={0.2}
              onScrollToIndexFailed={onScrollToIndexFailed}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{paddingVertical: 12}}
              ListFooterComponent={
                loadingOlder ? (
                  <ActivityIndicator style={{margin: 12}} color={colors.primary} />
                ) : !hasMore && sorted.length ? (
                  <Text style={styles.begin}>— BẮT ĐẦU CUỘC TRÒ CHUYỆN —</Text>
                ) : null
              }
            />
          )}

          {searchOpen && searchResults ? (
            <View style={styles.searchResults}>
              <Text style={styles.searchCount}>{searchResults.length} kết quả</Text>
              <FlatList
                data={searchResults}
                keyExtractor={m => m.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({item}) => (
                  <Pressable
                    style={({pressed}) => [styles.resultRow, pressed && {backgroundColor: colors.softBg}]}
                    onPress={() => {
                      setSearchOpen(false);
                      setSearchText('');
                      jumpTo(item.id);
                    }}>
                    <View style={styles.resultTop}>
                      <Text style={styles.resultName}>
                        {item.senderId === me.uid ? 'Bạn' : users[item.senderId]?.displayName || item.senderName}
                      </Text>
                      <Text style={styles.resultTime}>{formatShortDate(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.resultText} numberOfLines={2}>
                      {item.text}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          ) : null}
        </View>

        {replyTo ? (
          <View style={styles.replyBar}>
            <Icon name="reply" size={18} color={colors.primary} strokeWidth={2} />
            <View style={styles.replyBody}>
              <Text style={styles.replyTitle} numberOfLines={1}>
                Trả lời {replyTo.senderId === me.uid ? 'chính bạn' : users[replyTo.senderId]?.displayName || replyTo.senderName}
              </Text>
              <Text style={styles.replyText} numberOfLines={1}>
                {messagePreview(replyTo)}
              </Text>
            </View>
            <IconButton icon="close" size={16} boxSize={32} onPress={() => setReplyTo(null)} />
          </View>
        ) : null}

        {/* ---------- Thanh nhập tin ---------- */}
        {isMember || (conv === undefined && !convError) ? (
          <View style={[styles.inputBar, {paddingBottom: Math.max(insets.bottom, 10) + 4}]}>
            <IconButton
              icon="camera"
              size={18}
              boxSize={38}
              bg={colors.inputBg}
              color="#475569"
              strokeWidth={1.8}
              disabled={!isMember}
              onPress={onPressCamera}
            />
            <IconButton
              icon="mapPin"
              size={18}
              boxSize={38}
              bg={colors.inputBg}
              color="#475569"
              strokeWidth={1.8}
              disabled={!isMember}
              onPress={onSendLocation}
            />
            <TextInput
              value={text}
              onChangeText={onChangeText}
              onBlur={stopTyping}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              maxLength={2000}
            />
            <Pressable
              onPress={onSend}
              disabled={!canSend}
              hitSlop={6}
              style={({pressed}) => [
                styles.sendBtn,
                !canSend && styles.sendBtnOff,
                pressed && {backgroundColor: colors.primaryDark},
              ]}>
              <View style={{marginLeft: 2}}>
                <Icon name="send" size={17} color="#fff" strokeWidth={2.2} />
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.notMember, {paddingBottom: insets.bottom + 12}]}>
            <Text style={styles.notMemberText}>Bạn không còn là thành viên của cuộc trò chuyện này.</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <MessageMenu
        message={menuMsg}
        myUid={me.uid}
        users={users}
        onClose={closeMenu}
        onReact={onReact}
        onCopy={onCopy}
        onRecall={onRecall}
        onReply={onReply}
      />
      <ImageViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.chatBg},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 2,
  },
  backBtn: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
  headerUser: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 2},
  headerAvatar: {borderRadius: 22, borderWidth: 2, borderColor: '#fff'},
  headerTitle: {fontSize: 15, fontWeight: '600', color: colors.text, letterSpacing: -0.2},
  headerSub: {fontSize: 11.5, color: colors.textMuted, marginTop: 1},
  error: {color: colors.danger, textAlign: 'center', margin: 24},
  begin: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginVertical: 12,
  },
  emptyChat: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},
  emptyTitle: {fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12},
  emptyText: {fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center'},
  waveBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  waveText: {color: colors.primary, fontWeight: '600', fontSize: 13.5},
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 120,
    backgroundColor: colors.inputBg,
    borderRadius: 19,
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 14,
    color: '#1E293B',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: {backgroundColor: '#93C5FD'},
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyBody: {flex: 1, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 8},
  replyTitle: {fontSize: 12.5, fontWeight: '600', color: colors.primary},
  replyText: {fontSize: 12.5, color: colors.textSub},
  notMember: {padding: 14, backgroundColor: '#fff', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border},
  notMemberText: {color: colors.textMuted, fontSize: 13},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {flex: 1, color: colors.text, fontSize: 14, paddingVertical: 0},
  searchCancel: {color: colors.primary, fontWeight: '600', fontSize: 14},
  searchResults: {...StyleSheet.absoluteFillObject, backgroundColor: '#fff'},
  searchCount: {paddingHorizontal: 16, paddingVertical: 10, color: colors.textMuted, fontWeight: '600', fontSize: 12.5},
  resultRow: {paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border},
  resultTop: {flexDirection: 'row', justifyContent: 'space-between'},
  resultName: {fontWeight: '600', color: colors.text, fontSize: 13.5},
  resultTime: {color: colors.textMuted, fontSize: 12},
  resultText: {color: colors.text2, marginTop: 3, fontSize: 13.5},
});

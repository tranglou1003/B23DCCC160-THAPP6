import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {AppState} from 'react-native';
import {useAuth} from './AuthContext';
import {listenUsers, listenStatuses} from '../services/userService';
import {listenUserChats, listenConversation} from '../services/chatService';
import {listenNotifications} from '../services/notificationService';
import {
  setupLocalNotifications,
  showLocalNotification,
} from '../services/localNotificationService';

const DataContext = createContext(null);

/**
 * Dữ liệu dùng chung sau khi đăng nhập:
 *  - users, statuses (danh bạ + online)
 *  - chats: userChats/{uid} ghép với conversations/{convId} (1-1 và nhóm), sắp theo tin mới nhất
 *  - notifications/{uid}
 * Mọi listener đều được hủy trong cleanup.
 */
export function DataProvider({children}) {
  const {me} = useAuth();
  const uid = me?.uid;

  const [users, setUsers] = useState({});
  const [statuses, setStatuses] = useState({});
  const [userChats, setUserChats] = useState({});
  const [convs, setConvs] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const convListeners = useRef({});
  const seenNotifIds = useRef(null);

  useEffect(() => {
    if (!uid) {
      return undefined;
    }
    const u1 = listenUsers(setUsers);
    const u2 = listenStatuses(setStatuses);
    const u3 = listenUserChats(uid, val => {
      setUserChats(val);
      setChatsLoaded(true);
    });
    const u4 = listenNotifications(uid, setNotifications);
    setupLocalNotifications();
    const listeners = convListeners.current;
    return () => {
      u1();
      u2();
      u3();
      u4();
      Object.values(listeners).forEach(unsub => unsub());
      convListeners.current = {};
      seenNotifIds.current = null;
      setUserChats({});
      setConvs({});
      setNotifications([]);
      setChatsLoaded(false);
    };
  }, [uid]);

  // Gắn / gỡ listener conversations/{convId} theo danh sách userChats
  useEffect(() => {
    const listeners = convListeners.current;
    Object.keys(userChats).forEach(convId => {
      if (!listeners[convId]) {
        listeners[convId] = listenConversation(
          convId,
          val => setConvs(prev => ({...prev, [convId]: val})),
          () => {},
        );
      }
    });
    Object.keys(listeners).forEach(convId => {
      if (!userChats[convId]) {
        listeners[convId]();
        delete listeners[convId];
        setConvs(prev => {
          const next = {...prev};
          delete next[convId];
          return next;
        });
      }
    });
  }, [userChats]);

  // Hiện thông báo cục bộ (notifee) khi có thông báo mới mà app đang chạy nền
  useEffect(() => {
    if (seenNotifIds.current === null) {
      // lần tải đầu: coi như đã thấy hết, chỉ báo các thông báo đến sau
      seenNotifIds.current = new Set(notifications.map(n => n.id));
      return;
    }
    const fresh = notifications.filter(n => !seenNotifIds.current.has(n.id));
    fresh.forEach(n => seenNotifIds.current.add(n.id));
    if (AppState.currentState !== 'active') {
      fresh
        .filter(n => !n.read)
        .forEach(n =>
          showLocalNotification({
            id: n.id,
            title: users[n.fromUid]?.displayName || 'Tin nhắn mới',
            body: n.text,
            convId: n.convId,
          }),
        );
    }
  }, [notifications, users, uid]);

  const chats = useMemo(
    () =>
      Object.entries(userChats)
        .map(([id, uc]) => ({id, ...uc, conv: convs[id]}))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [userChats, convs],
  );

  const totalUnread = useMemo(
    () => chats.reduce((sum, c) => sum + (c.unread || 0), 0),
    [chats],
  );
  const unreadNotifications = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications],
  );

  const value = useMemo(
    () => ({
      users,
      statuses,
      chats,
      userChats,
      chatsLoaded,
      totalUnread,
      notifications,
      unreadNotifications,
    }),
    [users, statuses, chats, userChats, chatsLoaded, totalUnread, notifications, unreadNotifications],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}

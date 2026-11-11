import {
  ref,
  push,
  update,
  query,
  orderByChild,
  limitToLast,
  onValue,
  serverTimestamp,
} from 'firebase/database';
import {db} from './firebase';

/**
 * Thêm 1 thông báo notifications/{toUid}/{id} vào object `updates`
 * (để ghi chung trong một multi-path update với tin nhắn / cảm xúc / tạo nhóm).
 * type: 'message' | 'group_added' | 'reaction'
 */
export function addNotification(updates, toUid, {type, convId, fromUid, text}) {
  const id = push(ref(db, `notifications/${toUid}`)).key;
  updates[`notifications/${toUid}/${id}`] = {
    type,
    convId,
    fromUid,
    text: (text || '').slice(0, 300),
    createdAt: serverTimestamp(),
    read: false,
  };
  return id;
}

export function listenNotifications(uid, callback) {
  const q = query(ref(db, `notifications/${uid}`), orderByChild('createdAt'), limitToLast(100));
  return onValue(
    q,
    snap => {
      const list = [];
      snap.forEach(child => {
        list.push({id: child.key, ...child.val()});
      });
      callback(list.reverse());
    },
    err => console.warn('listenNotifications', err.message),
  );
}

export function markNotificationRead(uid, id) {
  return update(ref(db), {[`notifications/${uid}/${id}/read`]: true});
}

/** Đánh dấu nhiều thông báo đã đọc trong một update(). */
export function markNotificationsRead(uid, notifications) {
  const updates = {};
  notifications
    .filter(n => !n.read)
    .forEach(n => {
      updates[`notifications/${uid}/${n.id}/read`] = true;
    });
  if (!Object.keys(updates).length) {
    return Promise.resolve();
  }
  return update(ref(db), updates);
}

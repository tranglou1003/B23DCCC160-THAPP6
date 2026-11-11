import {ref, onValue} from 'firebase/database';
import {db} from './firebase';

/** Lắng nghe toàn bộ danh bạ users/{uid}. Trả về hàm hủy listener. */
export function listenUsers(callback) {
  return onValue(
    ref(db, 'users'),
    snap => callback(snap.val() || {}),
    err => console.warn('listenUsers', err.message),
  );
}

/** Lắng nghe trạng thái online của mọi người: status/{uid}. */
export function listenStatuses(callback) {
  return onValue(
    ref(db, 'status'),
    snap => callback(snap.val() || {}),
    err => console.warn('listenStatuses', err.message),
  );
}

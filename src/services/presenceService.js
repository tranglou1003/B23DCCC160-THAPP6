import {
  ref,
  onValue,
  onDisconnect,
  update,
  serverTimestamp,
} from 'firebase/database';
import {AppState} from 'react-native';
import {auth, db} from './firebase';

/**
 * Trạng thái online: status/{uid} = { state, lastChanged, activeConv }
 *  - Dùng .info/connected + onDisconnect() để khi app bị tắt đột ngột / mất mạng,
 *    server tự ghi state = 'offline' và xóa activeConv => không bị kẹt "online".
 *  - activeConv: cuộc trò chuyện người dùng đang mở (dùng để quyết định có tạo thông báo không).
 */
let currentUid = null;

function statusRef(uid) {
  return ref(db, `status/${uid}`);
}

function offlineValue() {
  return {state: 'offline', lastChanged: serverTimestamp(), activeConv: null};
}

export function startPresence(uid) {
  currentUid = uid;
  const connectedRef = ref(db, '.info/connected');
  const unsubConnected = onValue(connectedRef, snap => {
    if (snap.val() !== true) {
      return;
    }
    onDisconnect(statusRef(uid))
      .set(offlineValue())
      .then(() => {
        if (AppState.currentState === 'active') {
          update(statusRef(uid), {state: 'online', lastChanged: serverTimestamp()});
        }
      })
      .catch(e => console.warn('presence', e.message));
  });

  const appStateSub = AppState.addEventListener('change', next => {
    if (!auth.currentUser) {
      return;
    }
    if (next === 'active') {
      update(statusRef(uid), {state: 'online', lastChanged: serverTimestamp()});
    } else if (next === 'background') {
      update(statusRef(uid), offlineValue());
    }
  });

  return () => {
    unsubConnected();
    appStateSub.remove();
  };
}

/** Ghi cuộc trò chuyện đang mở (null khi rời màn hình). */
export function setActiveConversation(convId) {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    return Promise.resolve();
  }
  return update(statusRef(uid), {activeConv: convId || null}).catch(() => {});
}

export async function goOffline() {
  const uid = currentUid || auth.currentUser?.uid;
  if (!uid) {
    return;
  }
  try {
    await update(statusRef(uid), offlineValue());
    await onDisconnect(statusRef(uid)).cancel();
  } catch (e) {
    // bỏ qua
  }
  currentUid = null;
}

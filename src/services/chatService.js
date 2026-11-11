import {
  ref,
  push,
  get,
  set,
  remove,
  update,
  query,
  orderByKey,
  orderByChild,
  limitToLast,
  startAt,
  endBefore,
  onValue,
  onChildAdded,
  onChildChanged,
  onDisconnect,
  increment,
  serverTimestamp,
} from 'firebase/database';
import {db} from './firebase';
import {addNotification} from './notificationService';
import {PAGE_SIZE} from '../config/appConfig';
import {previewText, normalize} from '../utils/format';

/* ------------------------------------------------------------------ */
/* Cuộc trò chuyện                                                     */
/* ------------------------------------------------------------------ */

/** convId của chat 1-1 luôn là 2 uid sắp xếp, nối bằng "_" (không bao giờ trùng id nhóm do push() sinh ra). */
export function directConvId(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

export function otherMemberOfDirect(convId, myUid) {
  return convId.split('_').find(u => u !== myUid);
}

/** Tạo conversations/{convId} type "direct" nếu chưa có. */
export async function ensureDirectConversation(myUid, otherUid) {
  const convId = directConvId(myUid, otherUid);
  const convRef = ref(db, `conversations/${convId}`);
  const snap = await get(convRef);
  if (!snap.exists()) {
    try {
      await set(convRef, {
        type: 'direct',
        members: {[myUid]: true, [otherUid]: true},
        createdBy: myUid,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      // Có thể người kia vừa tạo cùng lúc -> luật !data.exists() từ chối, bỏ qua.
      const again = await get(convRef);
      if (!again.exists()) {
        throw e;
      }
    }
  }
  return convId;
}

export function listenConversation(convId, callback, onError) {
  return onValue(
    ref(db, `conversations/${convId}`),
    snap => callback(snap.val()),
    err => onError && onError(err),
  );
}

/** Danh sách cuộc trò chuyện của tôi: userChats/{uid}, sắp theo updatedAt. */
export function listenUserChats(uid, callback) {
  const q = query(ref(db, `userChats/${uid}`), orderByChild('updatedAt'));
  return onValue(
    q,
    snap => callback(snap.val() || {}),
    err => console.warn('listenUserChats', err.message),
  );
}

/* ------------------------------------------------------------------ */
/* Gửi tin: MỘT lệnh update() nhiều đường dẫn                          */
/* ------------------------------------------------------------------ */

function clean(obj) {
  const out = {};
  Object.keys(obj).forEach(k => {
    if (obj[k] !== undefined) {
      out[k] = obj[k];
    }
  });
  return out;
}

/**
 * Thêm vào object `updates` toàn bộ đường dẫn cần ghi cho 1 tin nhắn:
 *   messages/{convId}/{msgId}
 *   userChats/{uid}/{convId}/lastMessage, lastSenderId, updatedAt ... của MỌI thành viên
 *   userChats/{uid}/{convId}/unread = increment(1) cho thành viên khác (không đọc giá trị cũ)
 *   notifications/{uid}/{id} cho thành viên không đang mở cuộc trò chuyện
 * Trả về msgId.
 */
export function buildMessageUpdates(
  updates,
  {convId, conv, members, sender, payload, statuses, notify = true},
) {
  const msgId = push(ref(db, `messages/${convId}`)).key;
  const message = clean({
    senderId: sender.uid,
    senderName: sender.displayName || '',
    type: payload.type,
    text: payload.text,
    imageUrl: payload.imageUrl,
    imageWidth: payload.imageWidth,
    imageHeight: payload.imageHeight,
    lat: payload.lat,
    lng: payload.lng,
    replyTo: payload.replyTo,
    createdAt: serverTimestamp(),
    recalled: false,
  });
  updates[`messages/${convId}/${msgId}`] = message;

  const isGroup = conv?.type === 'group';
  const preview = previewText(payload.type, payload.text);

  members.forEach(uid => {
    const base = `userChats/${uid}/${convId}`;
    updates[`${base}/lastMessage`] =
      payload.type === 'text' || payload.type === 'system' ? payload.text : '';
    updates[`${base}/lastMessageType`] = payload.type;
    updates[`${base}/lastMessageId`] = msgId;
    updates[`${base}/lastSenderId`] = sender.uid;
    updates[`${base}/lastSenderName`] = sender.displayName || '';
    updates[`${base}/updatedAt`] = serverTimestamp();

    if (uid === sender.uid) {
      updates[`${base}/unread`] = 0;
      return;
    }
    updates[`${base}/unread`] = increment(1);

    // Chỉ tạo thông báo khi người nhận KHÔNG ở trong cuộc trò chuyện này
    const st = statuses?.[uid];
    const isViewing = st && st.state === 'online' && st.activeConv === convId;
    if (notify && !isViewing) {
      addNotification(updates, uid, {
        type: 'message',
        convId,
        fromUid: sender.uid,
        text: isGroup
          ? `${sender.displayName} (${conv.name}): ${preview}`
          : `${sender.displayName}: ${preview}`,
      });
    }
  });

  updates[`typing/${convId}/${sender.uid}`] = null; // gửi tin => tắt "đang soạn tin"
  updates[`readStatus/${convId}/${sender.uid}`] = serverTimestamp();
  return msgId;
}

export async function sendMessage({convId, conv, sender, payload, statuses}) {
  const members = Object.keys(conv?.members || {});
  if (!members.includes(sender.uid)) {
    throw new Error('Bạn không còn là thành viên của cuộc trò chuyện này.');
  }
  const updates = {};
  const msgId = buildMessageUpdates(updates, {
    convId,
    conv,
    members,
    sender,
    payload,
    statuses,
  });
  await update(ref(db), updates);
  return msgId;
}

/* ------------------------------------------------------------------ */
/* Tải tin nhắn theo trang                                             */
/* ------------------------------------------------------------------ */

function snapToList(snap) {
  const list = [];
  snap.forEach(child => {
    list.push({id: child.key, ...child.val()});
  });
  return list;
}

/**
 * Trang mới nhất + tin mới theo thời gian thực.
 *  1) get(limitToLast(20)) lấy 20 tin mới nhất.
 *  2) Gắn onChildAdded/onChildChanged từ tin cũ nhất của trang đó trở đi (startAt)
 *     để nhận tin mới, thu hồi, cảm xúc theo thời gian thực.
 */
export function subscribeLatestMessages(convId, {onInitial, onUpsert, onError}) {
  const base = ref(db, `messages/${convId}`);
  const unsubs = [];
  let cancelled = false;

  get(query(base, orderByKey(), limitToLast(PAGE_SIZE)))
    .then(snap => {
      if (cancelled) {
        return;
      }
      const initial = snapToList(snap);
      onInitial(initial, initial.length >= PAGE_SIZE);
      const live = initial.length
        ? query(base, orderByKey(), startAt(initial[0].id))
        : query(base, orderByKey());
      const handle = child => onUpsert({id: child.key, ...child.val()});
      unsubs.push(onChildAdded(live, handle, onError));
      unsubs.push(onChildChanged(live, handle, onError));
    })
    .catch(err => onError && onError(err));

  return () => {
    cancelled = true;
    unsubs.forEach(u => u());
  };
}

/**
 * Tải thêm 20 tin cũ hơn `beforeKey`. Dùng onValue để trang cũ vẫn nhận cập nhật
 * thu hồi / cảm xúc. Trả về hàm hủy listener.
 */
export function subscribeOlderMessages(convId, beforeKey, onPage, onError) {
  const q = query(
    ref(db, `messages/${convId}`),
    orderByKey(),
    endBefore(beforeKey),
    limitToLast(PAGE_SIZE),
  );
  return onValue(q, snap => onPage(snapToList(snap)), onError);
}

/* ------------------------------------------------------------------ */
/* Thu hồi & cảm xúc                                                   */
/* ------------------------------------------------------------------ */

/** Không xóa node: đánh dấu recalled = true và xóa nội dung. Cập nhật lastMessage nếu là tin cuối. */
export async function recallMessage({convId, conv, message, myUid}) {
  if (message.senderId !== myUid) {
    throw new Error('Chỉ người gửi mới được thu hồi tin nhắn.');
  }
  const p = `messages/${convId}/${message.id}`;
  const updates = {
    [`${p}/recalled`]: true,
    [`${p}/text`]: null,
    [`${p}/imageUrl`]: null,
    [`${p}/lat`]: null,
    [`${p}/lng`]: null,
  };
  const lastIdSnap = await get(ref(db, `userChats/${myUid}/${convId}/lastMessageId`));
  if (lastIdSnap.val() === message.id) {
    Object.keys(conv?.members || {}).forEach(uid => {
      updates[`userChats/${uid}/${convId}/lastMessage`] = '';
      updates[`userChats/${uid}/${convId}/lastMessageType`] = 'recalled';
    });
  }
  await update(ref(db), updates);
}

/** Thả / đổi / bỏ cảm xúc. Mỗi người chỉ ghi reactions/{uid của mình}. */
export async function toggleReaction({convId, message, me, emoji}) {
  const path = `messages/${convId}/${message.id}/reactions/${me.uid}`;
  const updates = {};
  if (message.reactions?.[me.uid] === emoji) {
    updates[path] = null;
  } else {
    updates[path] = emoji;
    if (message.senderId !== me.uid) {
      const preview = previewText(message.type, message.text);
      addNotification(updates, message.senderId, {
        type: 'reaction',
        convId,
        fromUid: me.uid,
        text: `${me.displayName} đã thả ${emoji} vào tin nhắn: "${preview}"`,
      });
    }
  }
  await update(ref(db), updates);
}

/* ------------------------------------------------------------------ */
/* Đang soạn tin & đã xem                                              */
/* ------------------------------------------------------------------ */

export function setTyping(convId, uid, isTyping) {
  const r = ref(db, `typing/${convId}/${uid}`);
  if (isTyping) {
    // Nếu app bị tắt đột ngột, server tự xóa cờ đang gõ
    onDisconnect(r).remove().catch(() => {});
    return set(r, true).catch(() => {});
  }
  return remove(r).catch(() => {});
}

export function listenTyping(convId, callback) {
  return onValue(
    ref(db, `typing/${convId}`),
    snap => callback(snap.val() || {}),
    () => callback({}),
  );
}

export function listenReadStatus(convId, callback) {
  return onValue(
    ref(db, `readStatus/${convId}`),
    snap => callback(snap.val() || {}),
    () => callback({}),
  );
}

/** Đánh dấu đã đọc: ghi readStatus và đặt lại số chưa đọc của riêng tôi. */
export function markConversationRead(convId, uid, hasUserChat) {
  const updates = {[`readStatus/${convId}/${uid}`]: serverTimestamp()};
  if (hasUserChat) {
    updates[`userChats/${uid}/${convId}/unread`] = 0;
  }
  return update(ref(db), updates).catch(e => console.warn('markRead', e.message));
}

/* ------------------------------------------------------------------ */
/* Tìm kiếm trong cuộc trò chuyện                                      */
/* ------------------------------------------------------------------ */

export async function searchMessages(convId, keyword) {
  const kw = normalize(keyword.trim());
  if (!kw) {
    return [];
  }
  const snap = await get(ref(db, `messages/${convId}`));
  return snapToList(snap)
    .filter(
      m => !m.recalled && (m.type === 'text' || m.type === 'system') &&
        normalize(m.text || '').includes(kw),
    )
    .reverse();
}

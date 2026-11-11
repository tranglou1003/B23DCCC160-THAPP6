import {ref, push, update, serverTimestamp} from 'firebase/database';
import {db} from './firebase';
import {buildMessageUpdates} from './chatService';
import {addNotification} from './notificationService';

function nameOf(users, uid) {
  return users?.[uid]?.displayName || 'Một thành viên';
}

/** Tạo nhóm: conversations + tin hệ thống + userChats + thông báo "được thêm vào nhóm" trong MỘT update(). */
export async function createGroup({name, memberUids, me}) {
  const groupName = name.trim();
  if (!groupName) {
    throw new Error('Vui lòng nhập tên nhóm.');
  }
  if (memberUids.length < 2) {
    throw new Error('Nhóm cần tối thiểu 2 thành viên ngoài bạn.');
  }
  const convId = push(ref(db, 'conversations')).key;
  const members = {[me.uid]: true};
  memberUids.forEach(uid => {
    members[uid] = true;
  });
  const conv = {
    type: 'group',
    name: groupName,
    members,
    createdBy: me.uid,
    createdAt: serverTimestamp(),
  };
  const updates = {[`conversations/${convId}`]: conv};
  buildMessageUpdates(updates, {
    convId,
    conv,
    members: Object.keys(members),
    sender: me,
    payload: {type: 'system', text: `${me.displayName} đã tạo nhóm "${groupName}"`},
    notify: false,
  });
  memberUids.forEach(uid =>
    addNotification(updates, uid, {
      type: 'group_added',
      convId,
      fromUid: me.uid,
      text: `${me.displayName} đã thêm bạn vào nhóm "${groupName}"`,
    }),
  );
  await update(ref(db), updates);
  return convId;
}

export async function renameGroup({convId, conv, me, name}) {
  const newName = name.trim();
  if (!newName) {
    throw new Error('Tên nhóm không được để trống.');
  }
  const updates = {[`conversations/${convId}/name`]: newName};
  buildMessageUpdates(updates, {
    convId,
    conv: {...conv, name: newName},
    members: Object.keys(conv.members || {}),
    sender: me,
    payload: {type: 'system', text: `${me.displayName} đã đổi tên nhóm thành "${newName}"`},
    notify: false,
  });
  await update(ref(db), updates);
}

export async function addMembers({convId, conv, me, uids, users}) {
  if (!uids.length) {
    return;
  }
  const updates = {};
  uids.forEach(uid => {
    updates[`conversations/${convId}/members/${uid}`] = true;
  });
  const allMembers = [...Object.keys(conv.members || {}), ...uids];
  const names = uids.map(u => nameOf(users, u)).join(', ');
  buildMessageUpdates(updates, {
    convId,
    conv,
    members: allMembers,
    sender: me,
    payload: {type: 'system', text: `${me.displayName} đã thêm ${names} vào nhóm`},
    notify: false,
  });
  uids.forEach(uid =>
    addNotification(updates, uid, {
      type: 'group_added',
      convId,
      fromUid: me.uid,
      text: `${me.displayName} đã thêm bạn vào nhóm "${conv.name}"`,
    }),
  );
  await update(ref(db), updates);
}

/** Chỉ trưởng nhóm (createdBy) được xóa thành viên khác. */
export async function removeMember({convId, conv, me, uid, users}) {
  if (conv.createdBy !== me.uid) {
    throw new Error('Chỉ trưởng nhóm mới được xóa thành viên.');
  }
  const updates = {
    [`conversations/${convId}/members/${uid}`]: null,
    [`userChats/${uid}/${convId}`]: null,
  };
  const remaining = Object.keys(conv.members || {}).filter(u => u !== uid);
  buildMessageUpdates(updates, {
    convId,
    conv,
    members: remaining,
    sender: me,
    payload: {
      type: 'system',
      text: `${me.displayName} đã xóa ${nameOf(users, uid)} khỏi nhóm`,
    },
    notify: false,
  });
  await update(ref(db), updates);
}

/** Rời nhóm: tin hệ thống "A đã rời nhóm". Nếu là trưởng nhóm thì chuyển quyền cho người khác. */
export async function leaveGroup({convId, conv, me}) {
  const remaining = Object.keys(conv.members || {}).filter(u => u !== me.uid);
  const updates = {};
  if (remaining.length) {
    buildMessageUpdates(updates, {
      convId,
      conv,
      members: remaining,
      sender: me,
      payload: {type: 'system', text: `${me.displayName} đã rời nhóm`},
      notify: false,
    });
  }
  if (conv.createdBy === me.uid && remaining.length) {
    updates[`conversations/${convId}/createdBy`] = remaining[0];
  }
  updates[`conversations/${convId}/members/${me.uid}`] = null;
  updates[`userChats/${me.uid}/${convId}`] = null;
  updates[`readStatus/${convId}/${me.uid}`] = null;
  updates[`typing/${convId}/${me.uid}`] = null;
  await update(ref(db), updates);
}

import {readFileSync} from 'node:fs';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

const RULES = readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8');
const TS = firebase.database.ServerValue.TIMESTAMP;
const INC = firebase.database.ServerValue.increment(1);

const env = await initializeTestEnvironment({
  projectId: 'demo-chat',
  database: {rules: RULES, host: '127.0.0.1', port: 9000},
});
await env.clearDatabase();

const ctx = uid => env.authenticatedContext(uid).database();
const A = ctx('A'), B = ctx('B'), C = ctx('C'), D = ctx('D');
let pass = 0, fail = 0;
async function t(name, p) {
  try { await p; pass++; console.log('  ok  ', name); }
  catch (e) { fail++; console.log('  FAIL', name, '-', e.message); }
}

// users
for (const [u, db] of [['A', A], ['B', B], ['C', C], ['D', D]]) {
  await t(`users/${u}`, assertSucceeds(db.ref(`users/${u}`).set({displayName: u, email: `${u}@x.vn`, avatarUrl: '', createdAt: TS})));
}
await t('A cannot write users/B', assertFails(A.ref('users/B/displayName').set('hack')));
await t('A status online + activeConv', assertSucceeds(A.ref('status/A').set({state: 'online', lastChanged: TS, activeConv: 'A_B'})));
await t('A cannot write status/B', assertFails(A.ref('status/B/state').set('online')));

// direct conv
const dc = 'A_B';
await t('A reads nonexistent A_B', assertSucceeds(A.ref(`conversations/${dc}`).once('value')));
await t('C cannot read A_B', assertFails(C.ref(`conversations/${dc}`).once('value')));
await t('C cannot create A_B', assertFails(C.ref(`conversations/${dc}`).set({type: 'direct', members: {C: true, A: true}, createdBy: 'C', createdAt: TS})));
await t('A creates A_B', assertSucceeds(A.ref(`conversations/${dc}`).set({type: 'direct', members: {A: true, B: true}, createdBy: 'A', createdAt: TS})));
await t('B cannot overwrite A_B', assertFails(B.ref(`conversations/${dc}`).set({type: 'direct', members: {A: true, B: true}, createdBy: 'B', createdAt: TS})));

function msgUpdates(convId, members, sender, payload, extra = {}) {
  const u = {};
  const id = 'm' + Math.random().toString(36).slice(2, 9);
  u[`messages/${convId}/${id}`] = {senderId: sender, senderName: sender, createdAt: TS, recalled: false, ...payload};
  for (const m of members) {
    const b = `userChats/${m}/${convId}`;
    u[`${b}/lastMessage`] = payload.text || '';
    u[`${b}/lastMessageType`] = payload.type;
    u[`${b}/lastMessageId`] = id;
    u[`${b}/lastSenderId`] = sender;
    u[`${b}/lastSenderName`] = sender;
    u[`${b}/updatedAt`] = TS;
    u[`${b}/unread`] = m === sender ? 0 : INC;
  }
  u[`typing/${convId}/${sender}`] = null;
  u[`readStatus/${convId}/${sender}`] = TS;
  Object.assign(u, extra);
  return {u, id};
}

const s1 = msgUpdates(dc, ['A', 'B'], 'A', {type: 'text', text: 'Xin chào'}, {
  'notifications/B/n1': {type: 'message', convId: dc, fromUid: 'A', text: 'A: Xin chào', createdAt: TS, read: false},
});
await t('A sends multi-path message', assertSucceeds(A.ref().update(s1.u)));
const s2 = msgUpdates(dc, ['A', 'B'], 'A', {type: 'image', imageUrl: 'https://res.cloudinary.com/x.jpg', imageWidth: 800, imageHeight: 600});
await t('A sends image multi-path', assertSucceeds(A.ref().update(s2.u)));
const unread = (await B.ref(`userChats/B/${dc}/unread`).once('value')).val();
await t(`B unread incremented to 2 (got ${unread})`, unread === 2 ? Promise.resolve() : Promise.reject(new Error('wrong')));
await t('B reads own userChats', assertSucceeds(B.ref('userChats/B').orderByChild('updatedAt').once('value')));
await t('A cannot read userChats/B', assertFails(A.ref('userChats/B').once('value')));
await t('A cannot set B unread to 50', assertFails(A.ref(`userChats/B/${dc}/unread`).set(50)));
await t('B resets own unread', assertSucceeds(B.ref().update({[`userChats/B/${dc}/unread`]: 0, [`readStatus/${dc}/B`]: TS})));
await t('B reads messages (limitToLast 20)', assertSucceeds(B.ref(`messages/${dc}`).orderByKey().limitToLast(20).once('value')));
await t('C cannot read messages', assertFails(C.ref(`messages/${dc}`).once('value')));
await t('C cannot read typing', assertFails(C.ref(`typing/${dc}`).once('value')));
await t('C cannot write message', assertFails(C.ref(`messages/${dc}/x1`).set({senderId: 'C', type: 'text', text: 'hi', createdAt: TS})));
await t('B cannot send as A', assertFails(B.ref(`messages/${dc}/x2`).set({senderId: 'A', type: 'text', text: 'fake', createdAt: TS})));
await t('B cannot edit A text', assertFails(B.ref(`messages/${dc}/${s1.id}/text`).set('edited')));

// recall
await t('B cannot recall A msg', assertFails(B.ref().update({[`messages/${dc}/${s1.id}/recalled`]: true, [`messages/${dc}/${s1.id}/text`]: null})));
await t('A recalls image (last msg) + lastMessage update', assertSucceeds(A.ref().update({
  [`messages/${dc}/${s2.id}/recalled`]: true,
  [`messages/${dc}/${s2.id}/text`]: null,
  [`messages/${dc}/${s2.id}/imageUrl`]: null,
  [`messages/${dc}/${s2.id}/lat`]: null,
  [`messages/${dc}/${s2.id}/lng`]: null,
  [`userChats/A/${dc}/lastMessage`]: '',
  [`userChats/A/${dc}/lastMessageType`]: 'recalled',
  [`userChats/B/${dc}/lastMessage`]: '',
  [`userChats/B/${dc}/lastMessageType`]: 'recalled',
})));
await t('A cannot un-recall', assertFails(A.ref(`messages/${dc}/${s2.id}/recalled`).set(false)));
await t('A cannot delete message node', assertFails(A.ref(`messages/${dc}/${s1.id}`).remove()));

// reactions
await t('B reacts on A msg + notification', assertSucceeds(B.ref().update({
  [`messages/${dc}/${s1.id}/reactions/B`]: '❤️',
  'notifications/A/n2': {type: 'reaction', convId: dc, fromUid: 'B', text: 'B đã thả ❤️', createdAt: TS, read: false},
})));
await t('B cannot set reaction of A', assertFails(B.ref(`messages/${dc}/${s1.id}/reactions/A`).set('😂')));
await t('B removes own reaction', assertSucceeds(B.ref(`messages/${dc}/${s1.id}/reactions/B`).remove()));

// typing
await t('B typing self', assertSucceeds(B.ref(`typing/${dc}/B`).set(true)));
await t('B cannot set typing of A', assertFails(B.ref(`typing/${dc}/A`).set(true)));
await t('C cannot set typing in A_B', assertFails(C.ref(`typing/${dc}/C`).set(true)));
await t('B onDisconnect remove typing', assertSucceeds(B.ref(`typing/${dc}/B`).onDisconnect().remove()));
await t('C cannot read readStatus', assertFails(C.ref(`readStatus/${dc}`).once('value')));

// notifications
await t('A cannot forge notif fromUid=C', assertFails(A.ref('notifications/B/n9').set({type: 'message', convId: dc, fromUid: 'C', text: 'x', createdAt: TS, read: false})));
await t('A cannot read notifications/B', assertFails(A.ref('notifications/B').once('value')));
await t('B reads own notifications', assertSucceeds(B.ref('notifications/B').orderByChild('createdAt').limitToLast(100).once('value')));
await t('B marks notif read', assertSucceeds(B.ref().update({'notifications/B/n1/read': true})));
await t('A cannot mark B notif read', assertFails(A.ref('notifications/B/n1/read').set(true)));

// group
const g = '-Ngroup1';
const gu = msgUpdates(g, ['A', 'B', 'C'], 'A', {type: 'system', text: 'A đã tạo nhóm'}, {
  [`conversations/${g}`]: {type: 'group', name: 'Nhóm 1', members: {A: true, B: true, C: true}, createdBy: 'A', createdAt: TS},
  'notifications/B/g1': {type: 'group_added', convId: g, fromUid: 'A', text: 'A đã thêm bạn', createdAt: TS, read: false},
  'notifications/C/g1': {type: 'group_added', convId: g, fromUid: 'A', text: 'A đã thêm bạn', createdAt: TS, read: false},
});
await t('A creates group (one multi-path update)', assertSucceeds(A.ref().update(gu.u)));
await t('D cannot read group', assertFails(D.ref(`conversations/${g}`).once('value')));
await t('D cannot read group messages', assertFails(D.ref(`messages/${g}`).once('value')));
await t('C reads group messages', assertSucceeds(C.ref(`messages/${g}`).orderByKey().limitToLast(20).once('value')));
const gm = msgUpdates(g, ['A', 'B', 'C'], 'B', {type: 'location', lat: 21.0, lng: 105.8});
await t('B sends location in group', assertSucceeds(B.ref().update(gm.u)));
await t('B renames group', assertSucceeds(B.ref(`conversations/${g}/name`).set('Nhóm mới')));
await t('D cannot rename group', assertFails(D.ref(`conversations/${g}/name`).set('hack')));
await t('D cannot add self to group', assertFails(D.ref(`conversations/${g}/members/D`).set(true)));
await t('B cannot remove C (not admin)', assertFails(B.ref(`conversations/${g}/members/C`).remove()));
const add = msgUpdates(g, ['A', 'B', 'C', 'D'], 'B', {type: 'system', text: 'B đã thêm D'}, {
  [`conversations/${g}/members/D`]: true,
  'notifications/D/g1': {type: 'group_added', convId: g, fromUid: 'B', text: 'B đã thêm bạn', createdAt: TS, read: false},
});
await t('B adds D', assertSucceeds(B.ref().update(add.u)));
const rm = msgUpdates(g, ['A', 'B', 'D'], 'A', {type: 'system', text: 'A đã xóa C'}, {
  [`conversations/${g}/members/C`]: null,
  [`userChats/C/${g}`]: null,
});
await t('A (admin) removes C', assertSucceeds(A.ref().update(rm.u)));
await t('C can no longer read messages', assertFails(C.ref(`messages/${g}`).once('value')));
const lv = msgUpdates(g, ['B', 'D'], 'A', {type: 'system', text: 'A đã rời nhóm'}, {
  [`conversations/${g}/createdBy`]: 'B',
  [`conversations/${g}/members/A`]: null,
  [`userChats/A/${g}`]: null,
  [`readStatus/${g}/A`]: null,
  [`typing/${g}/A`]: null,
});
await t('A (admin) leaves group, transfers admin', assertSucceeds(A.ref().update(lv.u)));
const owner = (await B.ref(`conversations/${g}/createdBy`).once('value')).val();
await t(`new admin is B (got ${owner})`, owner === 'B' ? Promise.resolve() : Promise.reject(new Error('wrong')));
await t('A cannot send to group after leaving', assertFails(A.ref().update(msgUpdates(g, ['B', 'D'], 'A', {type: 'text', text: 'hi'}).u)));

console.log(`\n${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);

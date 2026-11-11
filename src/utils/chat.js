import {otherMemberOfDirect} from '../services/chatService';

/** Thông tin hiển thị (tên, ảnh, online) của một cuộc trò chuyện. */
export function chatDisplayInfo({convId, conv, users, statuses, myUid}) {
  const isGroup = conv?.type === 'group' || (convId && !convId.includes('_'));
  if (isGroup) {
    const memberIds = Object.keys(conv?.members || {});
    const onlineCount = memberIds.filter(u => statuses?.[u]?.state === 'online').length;
    return {
      isGroup: true,
      title: conv?.name || 'Nhóm',
      avatarUrl: conv?.avatarUrl || '',
      memberIds,
      onlineCount,
      online: onlineCount > (memberIds.includes(myUid) ? 1 : 0),
    };
  }
  const otherUid = otherMemberOfDirect(convId, myUid);
  const other = users?.[otherUid];
  const status = statuses?.[otherUid];
  return {
    isGroup: false,
    otherUid,
    title: other?.displayName || 'Người dùng',
    avatarUrl: other?.avatarUrl || '',
    memberIds: [myUid, otherUid],
    online: status?.state === 'online',
    lastChanged: status?.lastChanged,
  };
}

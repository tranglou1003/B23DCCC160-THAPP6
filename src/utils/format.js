/** Nội dung hiển thị ngắn gọn của một tin nhắn (Home, thông báo, trích dẫn). */
export function previewText(type, text) {
  switch (type) {
    case 'image':
      return '📷 Hình ảnh';
    case 'location':
      return '📍 Vị trí';
    case 'recalled':
      return 'Tin nhắn đã được thu hồi';
    default:
      return text || '';
  }
}

export function messagePreview(msg) {
  if (!msg) {
    return '';
  }
  if (msg.recalled) {
    return previewText('recalled');
  }
  return previewText(msg.type, msg.text);
}

/** Bỏ dấu tiếng Việt + chữ thường để tìm kiếm. */
export function normalize(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

const pad = n => (n < 10 ? `0${n}` : `${n}`);

export function formatTime(ts) {
  if (!ts) {
    return '';
  }
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Thời gian ngắn ở danh sách: "14:05", "Hôm qua", "12/10". */
export function formatShortDate(ts) {
  if (!ts) {
    return '';
  }
  const d = new Date(ts);
  const now = new Date();
  if (isSameDay(d, now)) {
    return formatTime(ts);
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) {
    return 'Hôm qua';
  }
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Nhãn ngày phân cách trong khung chat. */
export function formatDayLabel(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (isSameDay(d, now)) {
    return 'Hôm nay';
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) {
    return 'Hôm qua';
  }
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function dayKey(ts) {
  const d = new Date(ts || Date.now());
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** "Đã xem 14:05" hoặc "Đã xem 12/10 14:05". */
export function formatSeenTime(ts) {
  const d = new Date(ts);
  if (isSameDay(d, new Date())) {
    return formatTime(ts);
  }
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${formatTime(ts)}`;
}

/** "Hoạt động X phút trước" thay vì chỉ ghi offline. */
export function formatLastSeen(ts, now = Date.now()) {
  if (!ts) {
    return 'Không hoạt động';
  }
  const diff = Math.max(0, now - ts);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) {
    return 'Hoạt động vừa xong';
  }
  if (minutes < 60) {
    return `Hoạt động ${minutes} phút trước`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hoạt động ${hours} giờ trước`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `Hoạt động ${days} ngày trước`;
  }
  return `Hoạt động ${formatShortDate(ts)}`;
}

export function initials(name) {
  const parts = (name || '?').trim().split(/\s+/);
  const last = parts[parts.length - 1] || '?';
  const first = parts.length > 1 ? parts[0] : '';
  return ((first[0] || '') + (last[0] || '')).toUpperCase() || '?';
}

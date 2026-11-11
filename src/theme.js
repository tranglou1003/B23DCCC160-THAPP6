/** Bảng màu theo thiết kế "Tối giản" (mau.txt) – tông slate + xanh dương. */
export const colors = {
  primary: '#2563EB', // blue-600
  primaryDark: '#1D4ED8', // blue-700
  primaryLight: '#EFF6FF', // blue-50
  primaryBorder: '#DBEAFE', // blue-100
  background: '#FFFFFF',
  surface: '#FFFFFF',
  chatBg: '#F8FAFC', // slate-50
  text: '#0F172A', // slate-900
  text2: '#334155', // slate-700
  textSub: '#64748B', // slate-500
  textMuted: '#94A3B8', // slate-400
  border: '#F1F5F9', // slate-100
  border2: '#E2E8F0', // slate-200
  inputBg: '#F1F5F9', // slate-100
  softBg: '#F8FAFC', // slate-50
  dark: '#0F172A', // slate-900 (chip đang chọn)
  myBubble: '#F0FDF6', // emerald-50
  myBubbleBorder: '#D1FAE5', // emerald-100
  myMeta: '#047857', // emerald-700
  otherBubble: '#FFFFFF',
  otherMeta: '#94A3B8',
  online: '#10B981', // emerald-500
  danger: '#F43F5E', // rose-500
  dangerDark: '#E11D48', // rose-600
  dangerLight: '#FFF1F2', // rose-50
  dangerBorder: '#FFE4E6', // rose-100
  overlay: 'rgba(15,23,42,0.45)',
  // tương thích code cũ
  header: '#FFFFFF',
  headerText: '#0F172A',
  headerSub: '#94A3B8',
  link: '#2563EB',
  unread: '#2563EB',
  pill: 'rgba(226,232,240,0.85)',
};

/** Màu avatar đặc (danh sách chat, chat). */
export const avatarPalette = [
  '#F43F5E', // rose-500
  '#8B5CF6', // violet-500
  '#0EA5E9', // sky-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#6366F1', // indigo-500
  '#EC4899', // pink-500
];

/** Cặp màu pastel (nền -100, chữ -600) dùng ở Tạo nhóm. */
export const pastelPalette = [
  ['#FFE4E6', '#E11D48'],
  ['#EDE9FE', '#7C3AED'],
  ['#E0F2FE', '#0284C7'],
  ['#D1FAE5', '#059669'],
  ['#FEF3C7', '#D97706'],
  ['#E0E7FF', '#4F46E5'],
  ['#FCE7F3', '#DB2777'],
];

/** Màu tên người gửi trong nhóm. */
export const namePalette = [
  '#E11D48',
  '#7C3AED',
  '#0284C7',
  '#059669',
  '#D97706',
  '#4F46E5',
  '#DB2777',
];

export function colorIndex(key) {
  let h = 0;
  const s = key || '';
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 1000003;
  }
  return h % avatarPalette.length;
}

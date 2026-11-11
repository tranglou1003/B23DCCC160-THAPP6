/**
 * Cấu hình Firebase và Cloudinary.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyCWi-o3WgKiJC1BhxoV1k4F3JR8-la7TpY",
  authDomain: "mychat-9d36c.firebaseapp.com",
  databaseURL: "https://mychat-9d36c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mychat-9d36c",
  storageBucket: "mychat-9d36c.firebasestorage.app",
  messagingSenderId: "190180302298",
  appId: "1:190180302298:web:40d11e146d4d235cf2b4e3",
};

export const cloudinaryConfig = {
  cloudName: 'wxafc5of',   // Cloud name
  uploadPreset: 'MyChat',  // Upload preset chế độ Unsigned (không dùng API secret)
  folder: 'chat-app',
};

/** Số tin nhắn mỗi trang khi tải lịch sử. */
export const PAGE_SIZE = 20;

/** Thời gian (ms) không gõ thì tự tắt trạng thái "đang soạn tin". */
export const TYPING_TIMEOUT = 3000;

/** Cạnh dài tối đa của ảnh trước khi tải lên. */
export const MAX_IMAGE_SIZE = 1024;

export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];
import {cloudinaryConfig, MAX_IMAGE_SIZE} from '../config/appConfig';

/**
 * Tùy chọn cho react-native-image-picker: thu nhỏ ảnh để cạnh dài ≤ 1024px
 * (giữ nguyên tỉ lệ) và nén JPEG TRƯỚC khi tải lên.
 */
export const IMAGE_PICKER_OPTIONS = {
  mediaType: 'photo',
  maxWidth: MAX_IMAGE_SIZE,
  maxHeight: MAX_IMAGE_SIZE,
  quality: 0.8,
  includeBase64: false,
  saveToPhotos: false,
};

/** Tính kích thước sau khi thu nhỏ (cạnh dài ≤ maxSize). */
export function fitSize(width, height, maxSize = MAX_IMAGE_SIZE) {
  if (!width || !height) {
    return {width: maxSize, height: maxSize};
  }
  const scale = Math.min(1, maxSize / Math.max(width, height));
  return {width: Math.round(width * scale), height: Math.round(height * scale)};
}

/**
 * Tải ảnh lên Cloudinary bằng UNSIGNED upload preset (không dùng API secret).
 * Chỉ URL trả về được lưu vào Realtime Database.
 */
export async function uploadImage({uri, type, fileName}, folder = cloudinaryConfig.folder) {
  const {cloudName, uploadPreset} = cloudinaryConfig;
  const form = new FormData();
  form.append('file', {
    uri,
    type: type || 'image/jpeg',
    name: fileName || `photo_${Date.now()}.jpg`,
  });
  form.append('upload_preset', uploadPreset);
  if (folder) {
    form.append('folder', folder);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error?.message || `Upload lỗi (${res.status})`);
    }
    return {url: json.secure_url, width: json.width, height: json.height};
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('Hết thời gian tải ảnh lên.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

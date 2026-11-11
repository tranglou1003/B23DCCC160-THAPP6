/**
 * Thông báo cục bộ bằng @notifee/react-native khi app chạy nền (Phần C).
 * Nếu gỡ thư viện notifee thì app vẫn chạy bình thường (require trong try/catch).
 */
let notifee = null;
let EventType = {};
let AndroidImportance = {};
try {
  const mod = require('@notifee/react-native');
  notifee = mod.default;
  EventType = mod.EventType;
  AndroidImportance = mod.AndroidImportance;
} catch (e) {
  notifee = null;
}

const CHANNEL_ID = 'chat-messages';

export async function setupLocalNotifications() {
  if (!notifee) {
    return;
  }
  try {
    await notifee.requestPermission();
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Tin nhắn',
      importance: AndroidImportance.HIGH,
    });
  } catch (e) {
    console.warn('notifee setup', e.message);
  }
}

export async function showLocalNotification({id, title, body, convId}) {
  if (!notifee) {
    return;
  }
  try {
    await notifee.displayNotification({
      id,
      title,
      body,
      data: {convId: convId || '', notifId: id},
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher',
        pressAction: {id: 'default'},
      },
    });
  } catch (e) {
    console.warn('notifee display', e.message);
  }
}

/** Xử lý khi người dùng nhấn vào thông báo (app mở từ thông báo hoặc đang chạy). */
export function onLocalNotificationPress(handler) {
  if (!notifee) {
    return () => {};
  }
  notifee
    .getInitialNotification()
    .then(initial => initial && handler(initial.notification?.data || {}))
    .catch(() => {});
  return notifee.onForegroundEvent(({type, detail}) => {
    if (type === EventType.PRESS) {
      handler(detail.notification?.data || {});
    }
  });
}

/** Gọi ở index.js: notifee yêu cầu đăng ký handler cho sự kiện nền. */
export function registerBackgroundHandler() {
  if (!notifee) {
    return;
  }
  notifee.onBackgroundEvent(async () => {});
}

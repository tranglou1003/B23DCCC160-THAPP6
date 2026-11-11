import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import {ref, set, update, serverTimestamp} from 'firebase/database';
import {auth, db} from './firebase';
import {goOffline} from './presenceService';

export function listenAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function register(displayName, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, {displayName: displayName.trim()});
  await set(ref(db, `users/${cred.user.uid}`), {
    displayName: displayName.trim(),
    email: email.trim().toLowerCase(),
    avatarUrl: '',
    createdAt: serverTimestamp(),
  });
  return cred.user;
}

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logout() {
  await goOffline();
  await signOut(auth);
}

/** Cập nhật họ tên / ảnh đại diện. Danh bạ, Home, Chat đọc từ users/{uid} nên tự cập nhật. */
export async function updateMyProfile({displayName, avatarUrl}) {
  const user = auth.currentUser;
  if (!user) {
    return;
  }
  const changes = {};
  const authChanges = {};
  if (displayName !== undefined) {
    changes.displayName = displayName.trim();
    authChanges.displayName = displayName.trim();
  }
  if (avatarUrl !== undefined) {
    changes.avatarUrl = avatarUrl;
    authChanges.photoURL = avatarUrl;
  }
  await update(ref(db, `users/${user.uid}`), changes);
  await updateProfile(user, authChanges);
}

export function authErrorMessage(e) {
  const code = e?.code || '';
  const map = {
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/email-already-in-use': 'Email đã được sử dụng.',
    'auth/weak-password': 'Mật khẩu phải có ít nhất 6 ký tự.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/wrong-password': 'Email hoặc mật khẩu không đúng.',
    'auth/user-not-found': 'Tài khoản không tồn tại.',
    'auth/too-many-requests': 'Thử quá nhiều lần, vui lòng đợi một lát.',
    'auth/network-request-failed': 'Lỗi mạng, kiểm tra kết nối Internet.',
  };
  return map[code] || e?.message || 'Đã có lỗi xảy ra.';
}

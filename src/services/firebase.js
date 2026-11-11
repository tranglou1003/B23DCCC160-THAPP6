import {initializeApp, getApps, getApp} from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  // @ts-ignore - export chỉ có trong bản build React Native của firebase/auth
  getReactNativePersistence,
} from 'firebase/auth';
import {getDatabase} from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {firebaseConfig} from '../config/appConfig';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // initializeAuth chỉ được gọi 1 lần (Fast Refresh có thể gọi lại)
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getDatabase(app);
export default app;

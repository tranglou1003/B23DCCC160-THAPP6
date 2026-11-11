import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {ref, onValue, set, serverTimestamp} from 'firebase/database';
import {db} from '../services/firebase';
import {listenAuth} from '../services/authService';
import {startPresence} from '../services/presenceService';

const AuthContext = createContext({user: null, me: null, profile: null, initializing: true});

export function AuthProvider({children}) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = listenAuth(u => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  // Hồ sơ users/{uid} + trạng thái online (onDisconnect)
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return undefined;
    }
    const unsubProfile = onValue(
      ref(db, `users/${user.uid}`),
      snap => {
        const val = snap.val();
        setProfile(val);
        // Tự tạo lại hồ sơ nếu thiếu (VD: đăng ký lúc chưa Publish luật bảo mật)
        if (!val) {
          set(ref(db, `users/${user.uid}`), {
            displayName: user.displayName || (user.email || 'User').split('@')[0],
            email: (user.email || '').toLowerCase(),
            avatarUrl: user.photoURL || '',
            createdAt: serverTimestamp(),
          }).catch(e => console.warn('create profile', e.message));
        }
      },
      err => console.warn('profile', err.message),
    );
    const stopPresence = startPresence(user.uid);
    return () => {
      unsubProfile();
      stopPresence();
    };
  }, [user]);

  const me = useMemo(() => {
    if (!user) {
      return null;
    }
    return {
      uid: user.uid,
      displayName: profile?.displayName || user.displayName || user.email,
      avatarUrl: profile?.avatarUrl || '',
      email: user.email,
    };
  }, [user, profile]);

  const value = useMemo(() => ({user, me, profile, initializing}), [user, me, profile, initializing]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

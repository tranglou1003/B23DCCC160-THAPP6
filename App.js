import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider, useAuth} from './src/context/AuthContext';
import {DataProvider} from './src/context/DataContext';
import AppNavigator from './src/navigation/AppNavigator';
import {navigationRef, openChat} from './src/navigation/navigationRef';
import {onLocalNotificationPress} from './src/services/localNotificationService';
import {markNotificationRead} from './src/services/notificationService';

/** Nhấn vào thông báo cục bộ (notifee) => mở đúng cuộc trò chuyện + đánh dấu đã đọc. */
function LocalNotificationBridge() {
  const {me} = useAuth();
  const uid = me?.uid;
  useEffect(() => {
    if (!uid) {
      return undefined;
    }
    return onLocalNotificationPress(data => {
      if (data.notifId) {
        markNotificationRead(uid, data.notifId).catch(() => {});
      }
      if (data.convId) {
        // đợi navigator sẵn sàng khi app vừa được mở từ thông báo
        const tryOpen = (n = 0) =>
          navigationRef.isReady() ? openChat(data.convId) : n < 20 && setTimeout(() => tryOpen(n + 1), 150);
        tryOpen();
      }
    });
  }, [uid]);
  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
          <NavigationContainer ref={navigationRef}>
            <AppNavigator />
          </NavigationContainer>
          <LocalNotificationBridge />
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

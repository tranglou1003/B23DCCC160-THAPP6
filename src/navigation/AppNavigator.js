import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import Icon from '../components/Icon';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useAuth} from '../context/AuthContext';
import {useData} from '../context/DataContext';
import {colors} from '../theme';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ContactsScreen from '../screens/ContactsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupInfoScreen from '../screens/GroupInfoScreen';
import AddMembersScreen from '../screens/AddMembersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({icon, color}) {
  return <Icon name={icon} size={24} color={color} strokeWidth={1.8} />;
}

const badgeOf = n => (n > 0 ? (n > 99 ? '99+' : n) : undefined);

function MainTabs() {
  const {totalUnread, unreadNotifications} = useData();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {fontSize: 11, fontWeight: '600', marginTop: 2},
        tabBarStyle: {borderTopColor: colors.border, borderTopWidth: 1, elevation: 0},
        tabBarBadgeStyle: {
          backgroundColor: colors.danger,
          fontSize: 10,
          fontWeight: '700',
          borderWidth: 2,
          borderColor: '#fff',
          minWidth: 20,
          height: 20,
          lineHeight: 15,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Tin nhắn',
          tabBarIcon: p => <TabIcon icon="chat" {...p} />,
          tabBarBadge: badgeOf(totalUnread),
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{title: 'Danh bạ', tabBarIcon: p => <TabIcon icon="users" {...p} />}}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Thông báo',
          tabBarIcon: p => <TabIcon icon="bell" {...p} />,
          tabBarBadge: badgeOf(unreadNotifications),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'Cá nhân', tabBarIcon: p => <TabIcon icon="user" {...p} />}}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const {user, initializing} = useAuth();
  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
          <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
          <Stack.Screen name="AddMembers" component={AddMembersScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background},
});

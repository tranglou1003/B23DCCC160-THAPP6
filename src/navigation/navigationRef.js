import {createNavigationContainerRef} from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function openChat(convId) {
  if (navigationRef.isReady() && convId) {
    navigationRef.navigate('Chat', {convId});
  }
}

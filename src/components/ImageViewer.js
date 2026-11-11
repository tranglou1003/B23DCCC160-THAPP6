import React, {useState} from 'react';
import {ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

/** Xem ảnh toàn màn hình. */
export default function ImageViewer({uri, onClose}) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  if (!uri) {
    return null;
  }
  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <Pressable style={styles.fill} onPress={onClose}>
          <Image
            source={{uri}}
            style={styles.fill}
            resizeMode="contain"
            onLoadEnd={() => setLoading(false)}
          />
          {loading ? <ActivityIndicator style={StyleSheet.absoluteFill} color="#fff" size="large" /> : null}
        </Pressable>
        <Pressable style={[styles.close, {top: insets.top + 12}]} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  fill: {flex: 1, width: '100%'},
  close: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {color: '#fff', fontSize: 20, fontWeight: '700'},
});

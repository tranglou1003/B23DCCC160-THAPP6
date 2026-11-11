import React, {memo} from 'react';
import {ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {Avatar} from './common';
import Icon from './Icon';
import {colors, colorIndex, namePalette} from '../theme';
import {formatDayLabel, formatTime} from '../utils/format';

const MAX_IMG_W = 236;
const MAX_IMG_H = 300;

function imageSize(w, h) {
  if (!w || !h) {
    return {width: MAX_IMG_W, height: MAX_IMG_W};
  }
  const scale = Math.min(MAX_IMG_W / w, MAX_IMG_H / h);
  return {width: Math.round(w * scale), height: Math.round(h * scale)};
}

/** Gom cảm xúc: {uid: "❤️"} -> [["❤️", 2], ["👍", 1]] */
function groupReactions(reactions) {
  const counts = {};
  Object.values(reactions || {}).forEach(e => {
    counts[e] = (counts[e] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/** Nhãn ngày "Hôm nay" dạng viên thuốc xám. */
export function DayLabel({ts}) {
  return (
    <View style={styles.centerRow}>
      <Text style={styles.dayPill}>{formatDayLabel(ts)}</Text>
    </View>
  );
}

function MessageBubble({
  msg,
  isMine,
  isGroup,
  showSender,
  sender,
  myUid,
  seen,
  statusText,
  highlighted,
  onLongPress,
  onPressImage,
  onPressReply,
  onPressReactions,
}) {
  if (msg.type === 'system') {
    return (
      <View style={styles.centerRow}>
        <Text style={styles.systemPill}>{msg.text}</Text>
      </View>
    );
  }

  const reactions = msg.recalled ? [] : groupReactions(msg.reactions);
  const myReaction = msg.reactions?.[myUid];
  const showAvatarCol = isGroup && !isMine;
  const senderName = sender?.displayName || msg.senderName || 'Người dùng';
  const metaColor = isMine ? colors.myMeta : colors.otherMeta;

  let body;
  if (msg.recalled) {
    body = <Text style={[styles.text, styles.recalled]}>Tin nhắn đã được thu hồi</Text>;
  } else if (msg.type === 'image') {
    body = (
      <Pressable onPress={() => onPressImage(msg.imageUrl)} onLongPress={() => onLongPress(msg)} delayLongPress={300}>
        <Image source={{uri: msg.imageUrl}} style={[styles.image, imageSize(msg.imageWidth, msg.imageHeight)]} />
      </Pressable>
    );
  } else if (msg.type === 'location') {
    const url = `https://www.google.com/maps/search/?api=1&query=${msg.lat},${msg.lng}`;
    body = (
      <Pressable
        onPress={() => Linking.openURL(url)}
        onLongPress={() => onLongPress(msg)}
        delayLongPress={300}
        style={styles.locCard}>
        <View style={styles.locIcon}>
          <Icon name="mapPin" size={20} color={colors.primary} strokeWidth={1.8} />
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.locTitle}>Vị trí được chia sẻ</Text>
          <Text style={styles.locCoord}>
            {Number(msg.lat).toFixed(5)}, {Number(msg.lng).toFixed(5)}
          </Text>
          <Text style={styles.locLink}>Mở bản đồ ›</Text>
        </View>
      </Pressable>
    );
  } else {
    body = <Text style={styles.text}>{msg.text}</Text>;
  }

  return (
    <View style={[styles.wrap, isMine ? styles.wrapMine : styles.wrapOther, highlighted && styles.highlight]}>
      {showAvatarCol ? (
        <View style={styles.avatarCol}>
          {showSender ? <Avatar uri={sender?.avatarUrl} name={senderName} colorKey={msg.senderId} size={30} /> : null}
        </View>
      ) : null}

      <View style={[styles.col, {alignItems: isMine ? 'flex-end' : 'flex-start'}]}>
        {showSender && isGroup && !isMine ? (
          <Text style={[styles.sender, {color: namePalette[colorIndex(msg.senderId)]}]} numberOfLines={1}>
            {senderName}
          </Text>
        ) : null}

        <Pressable
          onLongPress={() => onLongPress(msg)}
          delayLongPress={300}
          style={[
            styles.bubble,
            isMine ? styles.mine : styles.other,
            showSender && (isMine ? styles.cornerMine : styles.cornerOther),
          ]}>
          {msg.replyTo && !msg.recalled ? (
            <Pressable onPress={() => onPressReply(msg.replyTo.id)} style={styles.quote}>
              <Text style={styles.quoteName} numberOfLines={1}>
                {msg.replyTo.senderName}
              </Text>
              <Text style={styles.quoteText} numberOfLines={2}>
                {msg.replyTo.preview}
              </Text>
            </Pressable>
          ) : null}

          {body}

          {/* Hàng cuối trong bong bóng: cảm xúc (trái) – giờ + dấu ✓ (phải) */}
          <View style={styles.metaRow}>
            <View style={styles.reactions}>
              {reactions.map(([emoji, count]) => (
                <Pressable
                  key={emoji}
                  onPress={() => onPressReactions(msg)}
                  style={[styles.reaction, myReaction === emoji && styles.reactionMine]}>
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {count > 1 ? <Text style={styles.reactionCount}>{count}</Text> : null}
                </Pressable>
              ))}
            </View>
            <View style={styles.timeBox}>
              <Text style={[styles.time, {color: metaColor}]}>{formatTime(msg.createdAt)}</Text>
              {isMine && !msg.recalled ? (
                <Icon name={seen ? 'checkDouble' : 'check'} size={15} color={metaColor} strokeWidth={2.2} />
              ) : null}
            </View>
          </View>
        </Pressable>

        {statusText ? (
          <View style={styles.statusRow}>
            <Icon name={statusText.startsWith('Đã gửi') ? 'check' : 'checkDouble'} size={13} color={colors.textMuted} strokeWidth={2.2} />
            <Text style={styles.status}>{statusText}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Bong bóng tạm khi đang tải ảnh lên (có loading / nút Thử lại). */
export function PendingImageBubble({item, onRetry, onCancel}) {
  const size = imageSize(item.asset.width, item.asset.height);
  return (
    <View style={[styles.wrap, styles.wrapMine]}>
      <View style={{alignItems: 'flex-end'}}>
        <View style={[styles.bubble, styles.mine]}>
          <View>
            <Image source={{uri: item.asset.uri}} style={[styles.image, size, {opacity: 0.55}]} />
            <View style={styles.pendingOverlay}>
              {item.status === 'uploading' ? (
                <View style={styles.spinner}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <View style={{alignItems: 'center'}}>
                  <Text style={styles.pendingText}>Tải ảnh thất bại</Text>
                  <View style={{flexDirection: 'row', gap: 8, marginTop: 10}}>
                    <Pressable style={styles.retryBtn} onPress={() => onRetry(item)}>
                      <Text style={styles.retryText}>Thử lại</Text>
                    </Pressable>
                    <Pressable style={[styles.retryBtn, styles.cancelBtn]} onPress={() => onCancel(item)}>
                      <Text style={[styles.retryText, {color: colors.text2}]}>Hủy</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
          <View style={styles.metaRow}>
            <View />
            <Text style={[styles.time, {color: colors.myMeta}]}>
              {item.status === 'uploading' ? 'Đang gửi…' : 'Chưa gửi'}
            </Text>
          </View>
        </View>
        {item.status === 'error' && item.error ? (
          <Text style={[styles.status, {color: colors.danger, marginTop: 4}]} numberOfLines={2}>
            {item.error}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default memo(MessageBubble);

const styles = StyleSheet.create({
  wrap: {flexDirection: 'row', paddingHorizontal: 14, marginVertical: 3},
  wrapMine: {justifyContent: 'flex-end', paddingLeft: 60},
  wrapOther: {justifyContent: 'flex-start', paddingRight: 60},
  highlight: {backgroundColor: 'rgba(37,99,235,0.08)'},
  avatarCol: {width: 38, paddingTop: 18},
  col: {flexShrink: 1},
  sender: {fontSize: 11.5, fontWeight: '600', marginBottom: 3, marginLeft: 4},
  bubble: {
    borderRadius: 18,
    padding: 10,
    paddingBottom: 6,
    borderWidth: 1,
    minWidth: 84,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 1,
  },
  mine: {backgroundColor: colors.myBubble, borderColor: colors.myBubbleBorder},
  other: {backgroundColor: colors.otherBubble, borderColor: colors.border},
  cornerMine: {borderTopRightRadius: 4},
  cornerOther: {borderTopLeftRadius: 4},
  text: {fontSize: 14.5, lineHeight: 20, color: '#1E293B'},
  recalled: {fontStyle: 'italic', color: colors.textMuted},
  image: {borderRadius: 12, backgroundColor: colors.border2},
  locCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    minWidth: 210,
  },
  locIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locTitle: {fontSize: 13.5, fontWeight: '600', color: colors.text},
  locCoord: {fontSize: 11.5, color: colors.textMuted, marginTop: 1},
  locLink: {fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 4},
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  quoteName: {fontSize: 12, fontWeight: '600', color: colors.primary},
  quoteText: {fontSize: 12, color: colors.textSub},
  metaRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 8},
  reactions: {flexDirection: 'row', flexWrap: 'wrap', gap: 4, flexShrink: 1},
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    minWidth: 24,
    paddingHorizontal: 5,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border2,
    justifyContent: 'center',
  },
  reactionMine: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  reactionEmoji: {fontSize: 12},
  reactionCount: {fontSize: 11, fontWeight: '700', color: colors.text2, marginLeft: 3},
  timeBox: {flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto'},
  time: {fontSize: 11, fontWeight: '500'},
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, marginRight: 4},
  status: {fontSize: 10.5, color: colors.textMuted},
  centerRow: {alignItems: 'center', marginVertical: 8, paddingHorizontal: 30},
  dayPill: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
    backgroundColor: 'rgba(226,232,240,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  systemPill: {
    fontSize: 11.5,
    color: colors.textSub,
    backgroundColor: 'rgba(226,232,240,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
    overflow: 'hidden',
  },
  pendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  spinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingText: {color: '#fff', fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4},
  retryBtn: {backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6},
  cancelBtn: {backgroundColor: '#fff'},
  retryText: {color: '#fff', fontWeight: '600', fontSize: 13},
});

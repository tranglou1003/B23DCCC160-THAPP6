import React from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Avatar} from './common';
import Icon from './Icon';
import {REACTIONS} from '../config/appConfig';
import {colors, colorIndex, namePalette} from '../theme';
import {formatTime, messagePreview} from '../utils/format';

/**
 * Menu khi nhấn giữ một tin: thả cảm xúc, Trả lời, Sao chép, Thu hồi (chỉ tin của mình).
 * Tin được nhấn giữ hiện nổi phía trên, nền phía sau làm mờ tối.
 */
export default function MessageMenu({message, myUid, users, onClose, onReact, onCopy, onRecall, onReply}) {
  const insets = useSafeAreaInsets();
  if (!message) {
    return null;
  }
  const isMine = message.senderId === myUid;
  const canCopy = message.type === 'text' && !message.recalled;
  const myReaction = message.reactions?.[myUid];
  const reacted = Object.entries(message.reactions || {});
  const sender = users[message.senderId];
  const senderName = isMine ? 'Bạn' : sender?.displayName || message.senderName || 'Người dùng';
  const preview = messagePreview(message);

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheetArea, {paddingBottom: insets.bottom + 16}]}>
          {/* Tin nhắn được chọn, hiện nổi */}
          <View style={[styles.previewRow, isMine ? {justifyContent: 'flex-end'} : null]}>
            {!isMine ? (
              <View style={{marginRight: 8, marginTop: 2}}>
                <Avatar uri={sender?.avatarUrl} name={senderName} colorKey={message.senderId} size={30} />
              </View>
            ) : null}
            <View style={{alignItems: isMine ? 'flex-end' : 'flex-start', flexShrink: 1}}>
              {!isMine ? (
                <Text style={[styles.previewName, {color: namePalette[colorIndex(message.senderId)]}]}>
                  {senderName}
                </Text>
              ) : null}
              <View style={[styles.previewBubble, isMine ? styles.previewMine : styles.previewOther]}>
                <Text style={styles.previewText} numberOfLines={4}>
                  {preview}
                </Text>
                <Text style={[styles.previewTime, isMine && {color: colors.myMeta}]}>{formatTime(message.createdAt)}</Text>
              </View>
            </View>
          </View>

          {/* Thẻ menu */}
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                Tin nhắn: <Text style={styles.cardQuote}>“{preview}”</Text>
              </Text>
              {!message.recalled ? <Text style={styles.cardHint}>Chọn cảm xúc</Text> : null}
            </View>

            {!message.recalled ? (
              <View style={styles.reactions}>
                {REACTIONS.map(e => (
                  <Pressable
                    key={e}
                    onPress={() => onReact(e)}
                    style={({pressed}) => [
                      styles.reactionBtn,
                      myReaction === e && styles.reactionOn,
                      pressed && {transform: [{scale: 1.2}]},
                    ]}>
                    <Text style={styles.reactionText}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {reacted.length ? (
              <Text style={styles.who} numberOfLines={2}>
                {reacted
                  .map(([uid, e]) => `${e} ${uid === myUid ? 'Bạn' : users[uid]?.displayName || 'Người dùng'}`)
                  .join('   ')}
              </Text>
            ) : null}

            <View style={styles.actions}>
              {!message.recalled ? (
                <Action
                  icon="reply"
                  tint={colors.primary}
                  bg={colors.primaryLight}
                  title="Trả lời"
                  sub="Trích dẫn tin nhắn này"
                  onPress={onReply}
                />
              ) : null}
              {canCopy ? (
                <Action icon="copy" tint="#D97706" bg="#FFFBEB" title="Sao chép" sub="Lưu nội dung vào bộ nhớ tạm" onPress={onCopy} />
              ) : null}
              {isMine && !message.recalled ? (
                <Action
                  icon="trash"
                  tint={colors.dangerDark}
                  bg={colors.dangerLight}
                  title="Thu hồi"
                  sub="Thu hồi tin nhắn với mọi người"
                  danger
                  onPress={onRecall}
                />
              ) : null}
              <View style={styles.divider} />
              <Action icon="close" tint={colors.textSub} bg={colors.inputBg} title="Đóng menu" onPress={onClose} />
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function Action({icon, tint, bg, title, sub, onPress, danger}) {
  return (
    <Pressable onPress={onPress} style={({pressed}) => [styles.action, pressed && {backgroundColor: colors.softBg}]}>
      <View style={[styles.actionIcon, {backgroundColor: bg}]}>
        <Icon name={icon} size={17} color={tint} strokeWidth={2} />
      </View>
      <View style={{flex: 1}}>
        <Text style={[styles.actionTitle, danger && {color: colors.dangerDark}]}>{title}</Text>
        {sub ? <Text style={styles.actionSub}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: 'rgba(100,116,139,0.55)', justifyContent: 'flex-end'},
  sheetArea: {paddingHorizontal: 16},
  previewRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, paddingHorizontal: 4},
  previewName: {fontSize: 11.5, fontWeight: '600', marginBottom: 3, marginLeft: 2},
  previewBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 7,
    maxWidth: 280,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
  },
  previewOther: {backgroundColor: '#fff', borderColor: colors.border, borderTopLeftRadius: 4},
  previewMine: {backgroundColor: colors.myBubble, borderColor: colors.myBubbleBorder, borderTopRightRadius: 4},
  previewText: {fontSize: 14.5, color: '#1E293B', lineHeight: 20},
  previewTime: {fontSize: 10.5, color: colors.textMuted, marginTop: 4},
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 6},
    elevation: 10,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  cardTitle: {flex: 1, fontSize: 12.5, color: colors.textSub},
  cardQuote: {fontStyle: 'italic', fontWeight: '700', color: colors.text},
  cardHint: {fontSize: 11.5, color: colors.textMuted},
  reactions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.softBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    marginTop: 12,
  },
  reactionBtn: {width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center'},
  reactionOn: {backgroundColor: colors.primaryBorder},
  reactionText: {fontSize: 26},
  who: {fontSize: 12, color: colors.textSub, marginTop: 8, paddingHorizontal: 6},
  actions: {marginTop: 8},
  action: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 8, paddingVertical: 9, borderRadius: 14},
  actionIcon: {width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  actionTitle: {fontSize: 14.5, fontWeight: '600', color: colors.text},
  actionSub: {fontSize: 11.5, color: colors.textMuted, marginTop: 1},
  divider: {height: 1, backgroundColor: colors.border, marginVertical: 4, marginHorizontal: 8},
});

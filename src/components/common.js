import React, {useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from './Icon';
import {colors, avatarPalette, pastelPalette, colorIndex} from '../theme';
import {initials} from '../utils/format';

/**
 * Avatar.
 *  - variant "solid" (mặc định): nền màu đậm, chữ trắng
 *  - variant "pastel": nền nhạt, chữ đậm (màn Tạo nhóm)
 *  - shape "rounded": bo góc vuông (màn Danh bạ)
 *  - isGroup: nền xanh nhạt + icon nhóm
 */
export function Avatar({uri, name, size = 44, online, isGroup, colorKey, variant = 'solid', shape = 'circle'}) {
  const [failed, setFailed] = useState(false);
  const dot = Math.max(10, Math.round(size * 0.24));
  const radius = shape === 'rounded' ? size * 0.36 : size / 2;
  const idx = colorIndex(colorKey || name);

  let inner;
  if (uri && !failed) {
    inner = (
      <Image
        source={{uri}}
        onError={() => setFailed(true)}
        style={{width: size, height: size, borderRadius: radius, backgroundColor: colors.border}}
      />
    );
  } else if (isGroup) {
    inner = (
      <View
        style={[
          styles.center,
          {width: size, height: size, borderRadius: radius, backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#BAE6FD'},
        ]}>
        <Icon name="users" size={size * 0.46} color="#0284C7" strokeWidth={1.7} />
      </View>
    );
  } else {
    const pastel = variant === 'pastel';
    inner = (
      <View
        style={[
          styles.center,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: pastel ? pastelPalette[idx][0] : avatarPalette[idx],
          },
        ]}>
        <Text
          style={{
            color: pastel ? pastelPalette[idx][1] : '#fff',
            fontSize: size * 0.36,
            fontWeight: pastel ? '700' : '600',
          }}>
          {initials(name)}
        </Text>
      </View>
    );
  }

  return (
    <View style={{width: size, height: size}}>
      {inner}
      {online ? <View style={[styles.onlineDot, {width: dot, height: dot, borderRadius: dot / 2}]} /> : null}
    </View>
  );
}

/**
 * Tiêu đề màn hình (nền trắng).
 *  - large: tiêu đề to bên trái (các tab chính)
 *  - mặc định: nút ‹ quay lại + (avatar) + tiêu đề nhỏ + phụ đề
 */
export function Header({title, subtitle, subtitleColor, onBack, right, left, onPressTitle, large}) {
  const insets = useSafeAreaInsets();
  if (large) {
    return (
      <View style={[styles.headerLarge, {paddingTop: insets.top + 10}]}>
        <View style={{flex: 1}}>
          <Text style={styles.largeTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.largeSubtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    );
  }
  return (
    <View style={[styles.header, {paddingTop: insets.top + 8}]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={({pressed}) => [styles.backBtn, pressed && styles.pressed]}>
          <Icon name="back" size={22} color={colors.text2} strokeWidth={2.2} />
        </Pressable>
      ) : null}
      {left}
      <Pressable style={styles.headerTitleBox} onPress={onPressTitle} disabled={!onPressTitle}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, subtitleColor && {color: subtitleColor}]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
      {right}
    </View>
  );
}

/** Nút dạng chip trên header (VD: "Tạo nhóm", "Đọc tất cả"). */
export function HeaderButton({label, onPress, disabled, icon}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({pressed}) => [styles.chipBtn, pressed && {backgroundColor: colors.primaryBorder}, disabled && {opacity: 0.45}]}>
      {icon ? <Icon name={icon} size={15} color={colors.primary} strokeWidth={2} /> : null}
      <Text style={styles.chipBtnText}>{label}</Text>
    </Pressable>
  );
}

/** Nút tròn chứa icon nét. */
export function IconButton({icon, onPress, disabled, style, size = 18, color = colors.textSub, bg, boxSize = 36, strokeWidth = 2}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({pressed}) => [
        styles.iconBtn,
        {width: boxSize, height: boxSize, borderRadius: boxSize / 2},
        bg && {backgroundColor: bg},
        pressed && styles.pressed,
        disabled && {opacity: 0.4},
        style,
      ]}>
      <Icon name={icon} size={size} color={color} strokeWidth={strokeWidth} />
    </Pressable>
  );
}

/** variant: primary | danger (nền đỏ nhạt) | outline */
export function Button({title, onPress, loading, disabled, variant = 'primary', style, iconRight}) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const textColor = isPrimary ? '#fff' : isDanger ? colors.dangerDark : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({pressed}) => [
        styles.button,
        isPrimary && styles.buttonPrimary,
        isDanger && styles.buttonDanger,
        !isPrimary && !isDanger && styles.buttonOutline,
        pressed && (isPrimary ? {backgroundColor: colors.primaryDark} : {opacity: 0.8}),
        (disabled || loading) && {opacity: 0.5},
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.row}>
          <Text style={[styles.buttonText, {color: textColor}]}>{title}</Text>
          {iconRight ? (
            <View style={{marginLeft: 6}}>
              <Icon name={iconRight} size={16} color="rgba(255,255,255,0.85)" strokeWidth={2.5} />
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export function Input(props) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      {...props}
      onFocus={e => {
        setFocused(true);
        props.onFocus && props.onFocus(e);
      }}
      onBlur={e => {
        setFocused(false);
        props.onBlur && props.onBlur(e);
      }}
      style={[styles.input, focused && styles.inputFocused, props.style]}
    />
  );
}

/** Ô tìm kiếm có icon kính lúp. variant="outlined" có viền (màn Danh bạ). */
export function SearchBox({value, onChangeText, placeholder = 'Tìm kiếm', variant, style}) {
  const outlined = variant === 'outlined';
  return (
    <View style={[styles.searchBox, outlined && styles.searchBoxOutlined, style]}>
      <Icon name="search" size={16} color={colors.textMuted} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Icon name="close" size={16} color={colors.textMuted} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Checkbox tròn có dấu ✓. */
export function Checkbox({checked}) {
  return (
    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
      {checked ? <Icon name="check" size={14} color="#fff" strokeWidth={3} /> : null}
    </View>
  );
}

export function Badge({count, style, color}) {
  if (!count) {
    return null;
  }
  return (
    <View style={[styles.badge, color && {backgroundColor: color}, style]}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

/** Chip lọc dạng viên thuốc: đang chọn = nền đen. */
export function FilterChip({label, active, onPress, dot}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.filterChip, active && styles.filterChipOn, pressed && {opacity: 0.8}]}>
      <Text style={[styles.filterText, active && styles.filterTextOn]}>{label}</Text>
      {dot ? <View style={styles.filterDot} /> : null}
    </Pressable>
  );
}

export function EmptyState({icon = 'chat', title, subtitle}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={30} color={colors.textMuted} strokeWidth={1.6} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {alignItems: 'center', justifyContent: 'center'},
  row: {flexDirection: 'row', alignItems: 'center'},
  pressed: {backgroundColor: colors.border},
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: colors.surface,
  },
  largeTitle: {fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.5},
  largeSubtitle: {fontSize: 12.5, color: colors.textMuted, fontWeight: '500', marginTop: 2},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  backBtn: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  headerTitleBox: {flex: 1, justifyContent: 'center', minHeight: 40},
  headerTitle: {fontSize: 17, fontWeight: '700', color: colors.text, letterSpacing: -0.2},
  headerSubtitle: {fontSize: 12, color: colors.textMuted, marginTop: 1},
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  chipBtnText: {color: colors.primary, fontWeight: '600', fontSize: 13},
  iconBtn: {alignItems: 'center', justifyContent: 'center'},
  button: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
  },
  buttonDanger: {backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: colors.dangerBorder},
  buttonOutline: {borderWidth: 1.5, borderColor: colors.primary, backgroundColor: '#fff'},
  buttonText: {fontWeight: '600', fontSize: 15},
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    backgroundColor: colors.softBg,
  },
  inputFocused: {borderColor: colors.primary, backgroundColor: '#fff'},
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
  },
  searchBoxOutlined: {backgroundColor: colors.softBg, borderWidth: 1, borderColor: colors.border2, borderRadius: 18},
  searchInput: {flex: 1, fontSize: 14.5, color: colors.text, paddingVertical: 0},
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {color: '#fff', fontSize: 11, fontWeight: '700'},
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.inputBg,
  },
  filterChipOn: {backgroundColor: colors.dark},
  filterText: {fontSize: 12.5, fontWeight: '500', color: '#475569'},
  filterTextOn: {color: '#fff'},
  filterDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary},
  empty: {alignItems: 'center', paddingTop: 70, paddingHorizontal: 32},
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {fontSize: 15.5, fontWeight: '600', color: colors.text, textAlign: 'center'},
  emptySubtitle: {fontSize: 13.5, color: colors.textMuted, textAlign: 'center', marginTop: 6},
});

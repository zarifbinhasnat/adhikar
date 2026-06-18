import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const VARIANTS = {
  primary: {
    bg:     COLORS.primary,
    text:   COLORS.onAccent,
    border: 'transparent',
  },
  danger: {
    bg:     COLORS.danger,
    text:   COLORS.onAccent,
    border: 'transparent',
  },
  secondary: {
    bg:     COLORS.surfaceAlt,
    text:   COLORS.textMuted,
    border: 'transparent',
  },
  ghost: {
    bg:     'transparent',
    text:   COLORS.textPrimary,
    border: COLORS.border,
  },
};

export default function ActionButton({ label, icon, onPress, variant = 'primary', style }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: isGhost ? 1 : 0,
        },
        style,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        {icon}
        {label ? <Text style={[styles.label, { color: v.text }]}>{label}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  label: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.semibold,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
});

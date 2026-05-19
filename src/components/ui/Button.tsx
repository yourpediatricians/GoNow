import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = true,
}) => {
  const sizeStyles = {
    sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base },
    md: { paddingVertical: Spacing.md + 2, paddingHorizontal: Spacing.xl },
    lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing['2xl'] },
  };

  const textSizes = {
    sm: FontSize.sm,
    md: FontSize.base,
    lg: FontSize.lg,
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[fullWidth && styles.fullWidth, style]}
        activeOpacity={0.85}>
        <LinearGradient
          colors={disabled ? ['#555', '#444'] : [Colors.primaryLight, Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, sizeStyles[size], Shadow.glow]}>
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={[styles.primaryText, { fontSize: textSizes[size] }, textStyle]}>
              {title}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyles = {
    secondary: {
      container: styles.secondaryContainer,
      text: styles.secondaryText,
    },
    outline: {
      container: styles.outlineContainer,
      text: styles.outlineText,
    },
    ghost: {
      container: styles.ghostContainer,
      text: styles.ghostText,
    },
    danger: {
      container: styles.dangerContainer,
      text: styles.dangerText,
    },
    primary: {
      container: {},
      text: {},
    },
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        sizeStyles[size],
        variantStyles[variant].container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={Colors.textPrimary} size="small" />
      ) : (
        <Text
          style={[
            styles.baseText,
            { fontSize: textSizes[size] },
            variantStyles[variant].text,
            textStyle,
          ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  baseText: {
    fontWeight: FontWeight.semiBold,
    letterSpacing: 0.3,
  },
  primaryText: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  secondaryContainer: { backgroundColor: Colors.surfaceElevated },
  secondaryText: { color: Colors.textPrimary },
  outlineContainer: {
    backgroundColor: Colors.transparent,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  outlineText: { color: Colors.primary },
  ghostContainer: { backgroundColor: Colors.transparent },
  ghostText: { color: Colors.textSecondary },
  dangerContainer: { backgroundColor: Colors.error },
  dangerText: { color: Colors.white },
});

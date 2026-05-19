import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Colors, FontSize, BorderRadius, Spacing, FontWeight } from '../../constants/theme';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  style?: ViewStyle;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  onPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  secureTextEntry,
  keyboardType = 'default',
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  multiline,
  numberOfLines,
  autoCapitalize = 'sentences',
  editable = true,
  onPress,
}) => {
  const [focused, setFocused] = useState(false);

  const content = (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.focused,
          error ? styles.errorBorder : null,
          !editable && styles.disabled,
        ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          style={[styles.input, leftIcon ? styles.inputWithLeft : null]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          editable={editable}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.base,
    minHeight: 54,
  },
  focused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,90,31,0.05)',
  },
  errorBorder: { borderColor: Colors.error },
  disabled: { opacity: 0.6 },
  leftIcon: { marginRight: Spacing.sm },
  rightIcon: { marginLeft: Spacing.sm },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    paddingVertical: Spacing.md,
  },
  inputWithLeft: { paddingLeft: 0 },
  error: {
    color: Colors.error,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});

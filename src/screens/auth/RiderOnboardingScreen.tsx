import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  ToastAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { Logo } from '../../components/Logo';
import { userService } from '../../services/user.service';
import { useAuthStore } from '../../store/authStore';

export const RiderOnboardingScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showReferral, setShowReferral] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Required', 'Please enter your name to continue.');
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert('Invalid Name', 'Please enter a valid name (at least 2 characters).');
      return;
    }

    const trimmedCode = referralCode.trim().toUpperCase();
    if (trimmedCode && trimmedCode.startsWith('GNC')) {
      const msg = 'Riders cannot use captain referral codes (starting with GNC).';
      if (Platform.OS === 'android') {
        ToastAndroid.show(msg, ToastAndroid.LONG);
      }
      Alert.alert('Invalid Referral Code', msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const profilePayload: any = { name: trimmedName };
      if (trimmedCode) {
        profilePayload.referralCode = trimmedCode;
      }

      // 1. Save name (+ optional referralCode) to backend
      await userService.updateProfile(profilePayload);

      // 2. Update in-memory auth store so RootNavigator redirects to RiderNavigator
      useAuthStore.getState().updateProfile({ name: trimmedName });

      // 3. Persist updated user into AsyncStorage to keep session state on restart
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const { STORAGE_KEYS } = await import('../../services/api');
        const existingUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        const parsedUser = existingUser ? JSON.parse(existingUser) : {};
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER,
          JSON.stringify({ ...parsedUser, name: trimmedName })
        );
      } catch (storageErr) {
        console.error('AsyncStorage name update failed:', storageErr);
      }
    } catch (err: any) {
      console.error('Rider name update error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Could not save profile. Please check connection.';
      if (Platform.OS === 'android') {
        ToastAndroid.show(msg, ToastAndroid.LONG);
      }
      Alert.alert('Setup Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Exit Setup',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Background glow gradient */}
      <View style={s.backgroundGlow} />

      <View style={s.header}>
        <TouchableOpacity style={s.closeBtn} onPress={handleCancel} activeOpacity={0.7}>
          <Text style={s.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled">
        
        <View style={s.logoContainer}>
          <Logo size={90} />
        </View>

        <View style={s.textContainer}>
          <Text style={s.title}>Welcome to GoNow!</Text>
          <Text style={s.subtitle}>
            Enter your name to complete setting up your account and get moving.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Full Name</Text>
          <View style={s.inputContainer}>
            <TextInput
              style={s.input}
              placeholder="e.g. Arjun Sharma"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={40}
              editable={!isSubmitting}
            />
          </View>
        </View>

        {/* Optional referral code */}
        <TouchableOpacity
          style={s.referralToggle}
          onPress={() => setShowReferral(v => !v)}
          activeOpacity={0.7}>
          <Text style={s.referralToggleText}>
            {showReferral ? '▼' : '▶'} Have a referral code? (Optional)
          </Text>
        </TouchableOpacity>

        {showReferral && (
          <View style={[s.card, { marginTop: 0 }]}>
            <Text style={s.label}>Referral Code</Text>
            <View style={s.inputContainer}>
              <TextInput
                style={[s.input, s.referralInput]}
                placeholder="e.g. GNR8F6A0C"
                placeholderTextColor={Colors.textMuted}
                value={referralCode}
                onChangeText={(v) => setReferralCode(v.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                editable={!isSubmitting}
              />
            </View>
            <Text style={s.referralHint}>🎁 Get ₹25 in your wallet on signup</Text>
          </View>
        )}

        <TouchableOpacity
          style={s.btn}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.btnGrad}>
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={s.btnText}>Get Started  →</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundGlow: {
    position: 'absolute',
    top: -150,
    alignSelf: 'center',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(255, 90, 31, 0.1)',
    zIndex: -1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.glow,
  },
  logoEmoji: {
    fontSize: 36,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.black,
    color: Colors.white,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.base,
    color: Colors.white,
  },
  btn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  btnGrad: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  referralToggle: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
    paddingVertical: 4,
  },
  referralToggleText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  referralInput: {
    letterSpacing: 3,
    fontWeight: FontWeight.bold,
  },
  referralHint: {
    fontSize: FontSize.xs,
    color: Colors.success,
    marginTop: Spacing.xs,
  },
});

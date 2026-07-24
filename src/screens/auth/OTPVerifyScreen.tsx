import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerify'>;

// Firebase Phone Auth uses a 6-digit OTP
const OTP_LENGTH = 6;

export const OTPVerifyScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phone, role } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);
  const [verified, setVerified] = useState(false);  // ← new: track OTP success for captain
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const { verifyOtp, sendOtp } = useAuthStore();

  useEffect(() => {
    // Focus keyboard on mount
    setTimeout(() => {
      inputRef.current?.focus();
    }, 400);

    const interval = setInterval(() => {
      setTimer(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async (otpCode = otp) => {
    if (otpCode.length !== OTP_LENGTH) return;

    setError('');
    setLoading(true);
    try {
      await verifyOtp(phone, otpCode, role);

      if (role === 'captain') {
        // For captain: show success screen with Start Onboard button
        setVerified(true);
        Animated.spring(successScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
      }
    } catch (err: any) {
      let msg = err?.response?.data?.message || err?.message || 'Invalid or expired OTP. Please try again.';
      // Clean up Firebase native error bracket prefixes
      if (msg.includes('auth/invalid-verification-code') || msg.includes('invalid-code')) {
        msg = 'The verification code you entered is incorrect. Please try again.';
      } else if (msg.includes('auth/session-expired') || msg.includes('session-expired')) {
        msg = 'The verification code has expired. Please request a new one.';
      } else if (msg.includes('auth/too-many-requests') || msg.includes('quota-exceeded')) {
        msg = 'Too many attempts. Please try again later.';
      } else if (msg.includes('[') && msg.includes(']')) {
        msg = msg.replace(/\[.*?\]\s*/g, '');
      }
      setError(msg);
      shake();
      setOtp('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setTimer(30);
    setOtp('');
    setError('');
    setTimeout(() => inputRef.current?.focus(), 100);
    try {
      await sendOtp(phone, role);
    } catch {
      setError('Failed to resend OTP. Please try again.');
    }
  };

  const otpDigits = otp.split('').concat(Array(OTP_LENGTH - otp.length).fill(''));

  // ── Captain verified success screen ──────────────────────────────────────────
  if (verified && role === 'captain') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <LinearGradient colors={['#001A08', Colors.background]} style={styles.successGrad} />

        <View style={styles.successContent}>
          {/* Animated check */}
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <LinearGradient colors={[Colors.success, '#16A34A']} style={styles.successGradCircle}>
              <Text style={styles.successCheck}>✓</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={styles.successTitle}>Phone Verified!</Text>
          <Text style={styles.successSubtitle}>
            Your number <Text style={styles.successPhone}>{phone}</Text>{' '}
            has been verified successfully.
          </Text>

          {/* Divider with label */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>What's next</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Steps */}
          {[
            { icon: '👤', title: 'Personal Details', desc: 'Name, profile photo' },
            { icon: '🚗', title: 'Vehicle Info', desc: 'Type, make, model, plate' },
            { icon: '📄', title: 'Documents', desc: 'Licence, RC, insurance' },
            { icon: '✅', title: 'Go Live!', desc: 'Start accepting rides' },
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepIconWrap}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.successFooter}>
          <TouchableOpacity
            style={styles.onboardBtn}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('CaptainOnboarding' as any)}>
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.onboardBtnGrad}>
              <Text style={styles.onboardBtnText}>Start Onboard</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.onboardNote}>Takes about 5 minutes to complete</Text>
        </View>
      </View>
    );
  }

  // ── OTP entry screen ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>🔐</Text>
        </View>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>
          Enter the {OTP_LENGTH}-digit code sent to{'\n'}
          <Text style={styles.phone}>{phone}</Text>
        </Text>
      </View>

      {/* OTP Interactive Row Container */}
      <View style={styles.otpContainer}>
        <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
          {otpDigits.map((digit, i) => (
            <View key={i}>
              <LinearGradient
                colors={
                  digit
                    ? [Colors.primaryLight, Colors.primary]
                    : i === otp.length
                    ? ['rgba(255,90,31,0.1)', 'rgba(255,90,31,0.05)']
                    : [Colors.surfaceElevated, Colors.surfaceElevated]
                }
                style={[
                  styles.otpBox,
                  i === otp.length && styles.activeBox,
                  error ? styles.errorBox : null,
                ]}>
                <Text style={[styles.otpDigit, digit && styles.filledDigit]}>
                  {digit || ''}
                </Text>
              </LinearGradient>
            </View>
          ))}
        </Animated.View>

        {/* Hidden but interactive full-row overlay input */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={v => {
            const clean = v.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
            setOtp(clean);
            setError('');
            if (clean.length === OTP_LENGTH) {
              setTimeout(() => handleVerify(clean), 200);
            }
          }}
          keyboardType="number-pad"
          style={styles.hiddenInput}
          maxLength={OTP_LENGTH}
          caretHidden
          autoFocus={true}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={loading ? 'Verifying...' : 'Verify & Continue'}
        onPress={() => handleVerify()}
        loading={loading}
        disabled={otp.length !== OTP_LENGTH}
        style={styles.btn}
      />

      <View style={styles.resendRow}>
        <Text style={styles.resendText}>Didn't receive OTP? </Text>
        {timer > 0 ? (
          <Text style={styles.timer}>Resend in {timer}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>Resend OTP</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing['2xl'], paddingTop: Spacing['3xl'] },
  backBtn: {
    width: 42, height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  backIcon: { fontSize: 20, color: Colors.textPrimary },
  header: { marginBottom: Spacing['2xl'] },
  iconBox: {
    width: 64, height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,90,31,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  icon: { fontSize: 28 },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.black, color: Colors.textPrimary, letterSpacing: -1, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 24 },
  phone: { color: Colors.primary, fontWeight: FontWeight.bold },
  
  // Container that receives all taps and forwards them to the TextInput
  otpContainer: {
    position: 'relative',
    marginVertical: Spacing.xl,
    height: 60,
    justifyContent: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'space-between',
    width: '100%',
  },
  otpBox: {
    width: 46,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
  },
  activeBox: { borderColor: Colors.primary },
  errorBox: { borderColor: Colors.error },
  otpDigit: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textMuted },
  filledDigit: { color: Colors.white },
  
  // Invisible input stretched to cover the entire container row
  hiddenInput: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.01,
    color: 'transparent',
    backgroundColor: 'transparent',
  },
  error: { color: Colors.error, fontSize: FontSize.sm, marginBottom: Spacing.md, textAlign: 'center' },
  btn: { marginBottom: Spacing.lg },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  timer: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  resendLink: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // ── Success / Onboard styles ──────────────────────────────────────────────────
  successGrad: { ...StyleSheet.absoluteFillObject },
  successContent: { flex: 1, paddingHorizontal: Spacing['2xl'], paddingTop: 60, gap: Spacing.lg },
  successCircle: { alignSelf: 'center', marginBottom: Spacing.sm },
  successGradCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  successCheck: { fontSize: 44, color: Colors.white, fontWeight: FontWeight.black },
  successTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.black, color: Colors.textPrimary, textAlign: 'center' },
  successSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  successPhone: { color: Colors.primary, fontWeight: FontWeight.bold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.surfaceBorder },
  dividerLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semiBold, letterSpacing: 1 },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  stepIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,90,31,0.08)', borderWidth: 1, borderColor: 'rgba(255,90,31,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepIcon: { fontSize: 20 },
  stepText: { flex: 1 },
  stepTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  stepDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  stepNumber: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.bold },
  successFooter: { paddingHorizontal: Spacing['2xl'], paddingBottom: 40, gap: Spacing.sm },
  onboardBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  onboardBtnGrad: { paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  onboardBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 0.3 },
  onboardNote: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
});

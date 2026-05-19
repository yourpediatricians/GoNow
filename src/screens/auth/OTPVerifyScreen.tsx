import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerify'>;

const OTP_LENGTH = 6;
const MOCK_OTP = '123456';

export const OTPVerifyScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phone } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const { setUser, setToken } = useAuthStore();

  useEffect(() => {
    inputRef.current?.focus();
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

  const handleVerify = () => {
    if (otp !== MOCK_OTP) {
      setError('Invalid OTP. Try 123456');
      shake();
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setUser({
        id: 'user_001',
        name: 'Arjun Sharma',
        phone,
        role: 'rider',
        rating: 4.8,
        totalRides: 42,
      });
      setToken('mock_token_abc123');
      navigation.navigate('ProfileSetup', { phone });
    }, 1000);
  };

  const handleResend = () => {
    setTimer(30);
    setOtp('');
    setError('');
    inputRef.current?.focus();
  };

  const otpDigits = otp.split('').concat(Array(OTP_LENGTH - otp.length).fill(''));

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
          Enter the 6-digit code sent to{'\n'}
          <Text style={styles.phone}>{phone}</Text>
        </Text>
        <Text style={styles.hint}>💡 Use 123456 for demo</Text>
      </View>

      {/* OTP Boxes */}
      <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
        {otpDigits.map((digit, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}>
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
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Hidden input */}
      <TextInput
        ref={inputRef}
        value={otp}
        onChangeText={v => {
          const clean = v.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
          setOtp(clean);
          setError('');
          if (clean.length === OTP_LENGTH) {
            setTimeout(() => handleVerify(), 200);
          }
        }}
        keyboardType="numeric"
        style={styles.hiddenInput}
        maxLength={OTP_LENGTH}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={loading ? 'Verifying...' : 'Verify & Continue'}
        onPress={handleVerify}
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
  hint: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.sm },
  otpRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  otpBox: {
    width: 50, height: 58,
    borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.surfaceBorder,
  },
  activeBox: { borderColor: Colors.primary },
  errorBox: { borderColor: Colors.error },
  otpDigit: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.textMuted },
  filledDigit: { color: Colors.white },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0 },
  error: { color: Colors.error, fontSize: FontSize.sm, marginBottom: Spacing.md },
  btn: { marginBottom: Spacing.lg },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  timer: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  resendLink: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});

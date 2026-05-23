import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;

const COUNTRY_CODE = '+91';

export const PhoneEntryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { role } = route.params;
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { sendOtp } = useAuthStore();

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit number');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const fullPhone = COUNTRY_CODE + phone;
      const result = await sendOtp(fullPhone, role);

      // In dev mode, backend returns the OTP — show it as a hint
      if (result?.devOtp) {
        Alert.alert('Dev Mode OTP', `Your OTP is: ${result.devOtp}`, [{ text: 'OK' }]);
      }

      navigation.navigate('OTPVerify', { phone: fullPhone, role });
    } catch (err: any) {
      console.error('PhoneEntryScreen handleSendOTP error:', err);
      const msg = err?.message || err?.response?.data?.message || 'Failed to send OTP. Check your connection.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = role === 'rider' ? '🚗 Rider' : '🏍️ Captain';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">

        {/* Back */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Role badge */}
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{roleLabel}</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>📱</Text>
          </View>
          <Text style={styles.title}>Enter Your{'\n'}Phone Number</Text>
          <Text style={styles.subtitle}>
            We'll send you a one-time password to verify your number
          </Text>
        </View>

        {/* Phone Input */}
        <View style={styles.phoneRow}>
          <View style={styles.countryCode}>
            <Text style={styles.flag}>🇮🇳</Text>
            <Text style={styles.code}>{COUNTRY_CODE}</Text>
          </View>
          <View style={styles.phoneInput}>
            <Input
              value={phone}
              onChangeText={v => {
                setPhone(v.replace(/[^0-9]/g, '').slice(0, 10));
                setError('');
              }}
              placeholder="98765 43210"
              keyboardType="phone-pad"
              error={error}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Popular carriers */}
        <View style={styles.carriers}>
          <Text style={styles.carriersLabel}>Works with all carriers</Text>
          <View style={styles.carrierChips}>
            {['Jio', 'Airtel', 'Vi', 'BSNL'].map(c => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>

        <Button
          title={loading ? 'Sending OTP...' : 'Send OTP'}
          onPress={handleSendOTP}
          loading={loading}
          disabled={phone.length !== 10}
          style={styles.btn}
        />

        <Text style={styles.note}>
          Standard SMS rates may apply. OTP is valid for 10 minutes.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: Spacing['2xl'], paddingTop: Spacing['3xl'] },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  backIcon: { fontSize: 20, color: Colors.textPrimary },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,90,31,0.12)',
    borderRadius: BorderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,90,31,0.3)',
    marginBottom: Spacing.xl,
  },
  roleBadgeText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semiBold },
  header: { marginBottom: Spacing['2xl'] },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,90,31,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  icon: { fontSize: 28 },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginBottom: Spacing.sm,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    alignItems: 'flex-start',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 54,
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
  },
  flag: { fontSize: 20 },
  code: {
    color: Colors.textPrimary,
    fontWeight: FontWeight.semiBold,
    fontSize: FontSize.base,
  },
  phoneInput: { flex: 1 },
  carriers: { marginBottom: Spacing.xl },
  carriersLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  carrierChips: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
  },
  chipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  btn: { marginBottom: Spacing.lg },
  note: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

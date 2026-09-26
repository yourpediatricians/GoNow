import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert, Share, TextInput,
  Platform, ToastAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { userService } from '../../services/user.service';

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  totalReferralEarnings: number;
  rewardRules: {
    role: string;
    friendReward: number;
    yourReward: number;
    requiredRides: number;
  };
}

export const ReferralScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyCode, setApplyCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [copied, setCopied] = useState(false);

  const showErrorToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    }
    Alert.alert('Referral Error', message);
  };

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await userService.getReferralInfo();
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load referral info');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCopy = () => {
    if (!data) return;
    try {
      // Use Clipboard API if available, otherwise show alert with code
      const Clipboard = require('@react-native-clipboard/clipboard').default;
      Clipboard.setString(data.referralCode);
    } catch {
      // Clipboard not available, fallback
    }
    setCopied(true);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Code ${data.referralCode} copied to clipboard!`, ToastAndroid.SHORT);
    }
    Alert.alert('Copied!', `Code ${data?.referralCode} copied to clipboard.`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!data) return;
    const isCaptain = data.rewardRules?.role === 'captain';
    const message = isCaptain
      ? `Use my captain referral code ${data.referralCode} to get ₹${data.rewardRules.friendReward} welcome bonus on GoNow Captain! Download and register today.`
      : `Use my code ${data.referralCode} to get ₹${data.rewardRules.friendReward} off your first ride on GoNow! Download the app and enter the code during signup.`;
    await Share.share({ message });
  };

  const handleApplyReferral = async () => {
    const code = applyCode.trim().toUpperCase();
    if (!code) {
      showErrorToast('Please enter a referral code.');
      return;
    }

    // Edge Case 1: Self-Referral validation
    if (data?.referralCode && code === data.referralCode.toUpperCase()) {
      showErrorToast('You cannot use your own referral code.');
      return;
    }

    // Edge Case 2: Role Mismatch validation
    const userRole = data?.rewardRules?.role || 'rider';
    if (userRole === 'rider' && code.startsWith('GNC')) {
      showErrorToast('Riders cannot use captain referral codes (starting with GNC).');
      return;
    }
    if (userRole === 'captain' && code.startsWith('GNR')) {
      showErrorToast('Captains cannot use rider referral codes (starting with GNR).');
      return;
    }

    setIsApplying(true);
    try {
      const res = await userService.applyReferral(code);
      const successMsg = res.message || '₹25 added to your wallet balance!';
      if (Platform.OS === 'android') {
        ToastAndroid.show(successMsg, ToastAndroid.LONG);
      }
      Alert.alert('🎉 Bonus Added!', successMsg);
      setApplyCode('');
      load(); // Refresh stats after applying
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Invalid or already used referral code.';
      showErrorToast(errMsg);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      {/* Header */}
      <LinearGradient colors={['#1A0800', Colors.background]} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Refer & Earn</Text>
        <Text style={s.headerSub}>Invite friends. Earn rewards. Together.</Text>
      </LinearGradient>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Loading your referral info…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {/* Referral Code Card */}
          <LinearGradient
            colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.codeCard}>
            <Text style={s.codeLabel}>YOUR REFERRAL CODE</Text>
            <Text style={s.codeText}>{data.referralCode}</Text>
            <View style={s.codeActions}>
              <TouchableOpacity style={s.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
                <Text style={s.copyBtnText}>{copied ? '✓ Copied!' : '📋 Copy Code'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.8}>
                <Text style={s.shareBtnText}>📤 Share</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statValue}>{data.totalReferrals}</Text>
              <Text style={s.statLabel}>Friends Invited</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statValue, { color: Colors.success }]}>₹{data.totalReferralEarnings}</Text>
              <Text style={s.statLabel}>Bonus Earned</Text>
            </View>
          </View>

          {/* How it works */}
          <View style={s.rulesCard}>
            <Text style={s.rulesTitle}>How it works</Text>
            {data.rewardRules?.role === 'captain' ? (
              <>
                <View style={s.stepRow}>
                  <View style={s.stepNumBadge}><Text style={s.stepNum}>1</Text></View>
                  <Text style={s.stepText}>Share your captain code with friends.</Text>
                </View>
                <View style={s.stepRow}>
                  <View style={s.stepNumBadge}><Text style={s.stepNum}>2</Text></View>
                  <Text style={s.stepText}>Referred captain gets ₹{data.rewardRules.friendReward} upon document verification.</Text>
                </View>
                <View style={s.stepRow}>
                  <View style={s.stepNumBadge}><Text style={s.stepNum}>3</Text></View>
                  <Text style={s.stepText}>You get ₹{data.rewardRules.yourReward} after the new captain completes {data.rewardRules.requiredRides || 3} rides.</Text>
                </View>
              </>
            ) : (
              <>
                <View style={s.stepRow}>
                  <View style={s.stepNumBadge}><Text style={s.stepNum}>1</Text></View>
                  <Text style={s.stepText}>Share your code with friends.</Text>
                </View>
                <View style={s.stepRow}>
                  <View style={s.stepNumBadge}><Text style={s.stepNum}>2</Text></View>
                  <Text style={s.stepText}>Friend gets ₹{data.rewardRules.friendReward} instantly on signup.</Text>
                </View>
                <View style={s.stepRow}>
                  <View style={s.stepNumBadge}><Text style={s.stepNum}>3</Text></View>
                  <Text style={s.stepText}>You get ₹{data.rewardRules.yourReward} after they complete their first ride.</Text>
                </View>
              </>
            )}
          </View>

          {/* Apply Referral Section */}
          <View style={s.applyCard}>
            <Text style={s.applyTitle}>Have a referral code?</Text>
            <Text style={s.applySub}>Enter a friend's code to get your welcome bonus</Text>
            <TextInput
              style={s.applyInput}
              placeholder="Enter referral code"
              placeholderTextColor={Colors.textMuted}
              value={applyCode}
              onChangeText={(v) => setApplyCode(v.toUpperCase())}
              autoCapitalize="characters"
              maxLength={12}
            />
            <TouchableOpacity
              style={[s.applyBtn, isApplying && { opacity: 0.6 }]}
              onPress={handleApplyReferral}
              disabled={isApplying}
              activeOpacity={0.85}>
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.applyBtnGrad}>
                <Text style={s.applyBtnText}>{isApplying ? 'Applying…' : 'Apply Code'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 54, paddingHorizontal: Spacing.xl, paddingBottom: Spacing['2xl'] },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  backBtnText: { fontSize: 20, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  headerTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  loadingText: { fontSize: FontSize.sm, color: Colors.textMuted },
  errorText: { fontSize: FontSize.base, color: Colors.error, textAlign: 'center' },
  retryBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primary },
  retryText: { color: Colors.primary, fontWeight: FontWeight.bold },
  scroll: { padding: Spacing.xl, gap: Spacing.lg },
  codeCard: { borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, ...Shadow.glow },
  codeLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, fontWeight: FontWeight.bold },
  codeText: { fontSize: FontSize['3xl'], fontWeight: FontWeight.black, color: Colors.white, letterSpacing: 6 },
  codeActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  copyBtn: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  copyBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  shareBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  shareBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 4 },
  statValue: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, color: Colors.primary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
  rulesCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: Spacing.md },
  rulesTitle: { fontSize: FontSize.base, fontWeight: FontWeight.black, color: Colors.textPrimary, marginBottom: Spacing.xs },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepNumBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,90,31,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,90,31,0.3)' },
  stepNum: { fontSize: FontSize.xs, fontWeight: FontWeight.black, color: Colors.primary },
  stepText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  applyCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: Spacing.md },
  applyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  applySub: { fontSize: FontSize.xs, color: Colors.textMuted },
  applyInput: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.lg, color: Colors.textPrimary, letterSpacing: 4, fontWeight: FontWeight.bold },
  applyBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  applyBtnGrad: { paddingVertical: Spacing.md, alignItems: 'center' },
  applyBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.base },
});

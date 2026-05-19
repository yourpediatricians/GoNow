import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';

const { width } = Dimensions.get('window');

const TRANSACTIONS = [
  { id: 't1', type: 'credit', icon: '💰', label: 'Added money', sub: 'via UPI', amount: 500, date: 'Today, 10:30 AM' },
  { id: 't2', type: 'debit', icon: '🏍️', label: 'Ride payment', sub: 'Koramangala → MG Road', amount: -85, date: 'Today, 9:15 AM' },
  { id: 't3', type: 'credit', icon: '🎁', label: 'Referral bonus', sub: 'Friend joined GoNow', amount: 100, date: 'Yesterday, 3:00 PM' },
  { id: 't4', type: 'debit', icon: '🛺', label: 'Ride payment', sub: 'HSR Layout → Silk Board', amount: -130, date: 'Yesterday, 6:30 PM' },
  { id: 't5', type: 'credit', icon: '🏷️', label: 'Promo cashback', sub: 'GOFIRST20 applied', amount: 50, date: 'Dec 15' },
  { id: 't6', type: 'debit', icon: '🚗', label: 'Ride payment', sub: 'Whitefield → Airport', amount: -680, date: 'Dec 15, 4:00 AM' },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000];

export const WalletScreen: React.FC = () => {
  const [balance] = useState(340);
  const [activeTab, setActiveTab] = useState<'all' | 'credit' | 'debit'>('all');

  const filtered = TRANSACTIONS.filter(t => activeTab === 'all' || t.type === activeTab);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <LinearGradient colors={['#1A0A00', '#0D0D0D']} style={s.header}>
          <Text style={s.headerTitle}>GoNow Wallet</Text>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.balanceCard}>
            <View>
              <Text style={s.balanceLabel}>Available Balance</Text>
              <Text style={s.balanceValue}>₹{balance}</Text>
              <Text style={s.balanceSub}>Ready to use on your next ride</Text>
            </View>
            <View style={s.walletIcon}><Text style={{ fontSize: 32 }}>👛</Text></View>
          </LinearGradient>
        </LinearGradient>

        {/* Quick add money */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Add Money</Text>
          <View style={s.quickAmountsRow}>
            {QUICK_AMOUNTS.map(amt => (
              <TouchableOpacity key={amt} style={s.amountChip}>
                <Text style={s.amountChipText}>+₹{amt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.addBtn} activeOpacity={0.9}>
            <LinearGradient colors={[Colors.primaryLight, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.addBtnGrad}>
              <Text style={s.addBtnText}>Add Money via UPI / Cards</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Offers banner */}
        <TouchableOpacity style={s.offerBanner} activeOpacity={0.85}>
          <LinearGradient colors={['rgba(108,99,255,0.2)', 'rgba(108,99,255,0.05)']} style={s.offerGrad}>
            <Text style={s.offerIcon}>🏷️</Text>
            <View style={s.offerText}>
              <Text style={s.offerTitle}>Add ₹500, get ₹50 cashback</Text>
              <Text style={s.offerSub}>Valid till Dec 31 · Tap to add</Text>
            </View>
            <Text style={s.offerArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Transactions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Transactions</Text>
          <View style={s.tabRow}>
            {(['all', 'credit', 'debit'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[s.tab, activeTab === tab && s.tabActive]}
                onPress={() => setActiveTab(tab)}>
                {activeTab === tab && (
                  <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={StyleSheet.absoluteFill} borderRadius={BorderRadius.full} />
                )}
                <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {filtered.map(t => (
            <View key={t.id} style={s.transRow}>
              <View style={[s.transIcon, t.type === 'credit' ? s.creditIcon : s.debitIcon]}>
                <Text style={{ fontSize: 20 }}>{t.icon}</Text>
              </View>
              <View style={s.transInfo}>
                <Text style={s.transLabel}>{t.label}</Text>
                <Text style={s.transSub}>{t.sub}</Text>
                <Text style={s.transDate}>{t.date}</Text>
              </View>
              <Text style={[s.transAmount, t.amount > 0 ? s.creditAmount : s.debitAmount]}>
                {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount)}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing['2xl'], paddingTop: 54, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.textPrimary, marginBottom: Spacing.lg },
  balanceCard: { borderRadius: BorderRadius.xl, padding: Spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...Shadow.glow },
  balanceLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  balanceValue: { fontSize: FontSize['4xl'], fontWeight: FontWeight.black, color: Colors.white },
  balanceSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  walletIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  quickAmountsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  amountChip: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  amountChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  addBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  addBtnGrad: { paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
  offerBanner: { marginHorizontal: Spacing.xl, marginTop: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)' },
  offerGrad: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.md },
  offerIcon: { fontSize: 28 },
  offerText: { flex: 1 },
  offerTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#A09AF0' },
  offerSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  offerArrow: { fontSize: FontSize.xl, color: '#A09AF0' },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tab: { paddingVertical: 8, paddingHorizontal: Spacing.base, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, overflow: 'hidden', borderWidth: 1, borderColor: Colors.surfaceBorder },
  tabActive: { borderColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  tabTextActive: { color: Colors.white, fontWeight: FontWeight.bold },
  transRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, gap: Spacing.md },
  transIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  creditIcon: { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  debitIcon: { backgroundColor: 'rgba(255,90,31,0.1)', borderWidth: 1, borderColor: 'rgba(255,90,31,0.2)' },
  transInfo: { flex: 1 },
  transLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  transSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  transDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  transAmount: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  creditAmount: { color: Colors.success },
  debitAmount: { color: Colors.textPrimary },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useCaptainStore } from '../../store/captainStore';
import { walletService } from '../../services/wallet.service';

const { width } = Dimensions.get('window');

type MainTab = 'earnings' | 'redeem';
type Period = 'today' | 'week' | 'month';

interface WalletTransaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  description?: string;
  category?: string;
  createdAt: string;
}

const WEEKLY_DATA = [
  { day: 'Mon', amount: 820, rides: 8 },
  { day: 'Tue', amount: 1120, rides: 11 },
  { day: 'Wed', amount: 640, rides: 6 },
  { day: 'Thu', amount: 1380, rides: 13 },
  { day: 'Fri', amount: 1750, rides: 17 },
  { day: 'Sat', amount: 2100, rides: 20 },
  { day: 'Sun', amount: 960, rides: 9 },
];

export const CaptainEarningsScreen: React.FC = () => {
  const [mainTab, setMainTab] = useState<MainTab>('earnings');
  const [period, setPeriod] = useState<Period>('week');
  const [walletBal, setWalletBal] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  const {
    weeklyEarnings,
    todayEarnings,
    todayRides,
    totalEarnings,
    fetchEarnings,
    totalRides,
    completedRides,
    cancelledRides,
    acceptedRides,
  } = useCaptainStore();

  const loadAllData = async () => {
    try {
      await Promise.all([
        fetchEarnings(),
        walletService.getBalance().then((res) => setWalletBal(res.data?.balance || 0)),
        walletService.getTransactions(1, 50).then((res) => {
          setTransactions(res.data?.transactions || []);
        }),
      ]);
    } catch (err) {
      console.warn('Error refreshing captain earnings/wallet:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData();
  }, []);

  const handleRedeem = async () => {
    if (walletBal < 100) {
      Alert.alert(
        'Minimum ₹100 Required',
        `Your current redeemable balance is ₹${walletBal}. Minimum withdrawal amount is ₹100.`
      );
      return;
    }

    Alert.alert(
      'Redeem Wallet Balance',
      `Redeem ₹${walletBal.toLocaleString()} to your registered bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Redeem',
          onPress: async () => {
            setIsRedeeming(true);
            try {
              const res = await walletService.withdraw(walletBal);
              Alert.alert(
                '🎉 Redeem Initiated',
                res.message || `₹${walletBal} will be transferred to your registered bank account within 24 hours.`
              );
              loadAllData();
            } catch (err: any) {
              Alert.alert(
                'Redeem Failed',
                err?.response?.data?.message || 'Could not process redeem request. Please try again.'
              );
            } finally {
              setIsRedeeming(false);
            }
          },
        },
      ]
    );
  };

  const chartData = (weeklyEarnings.length > 0 ? weeklyEarnings : WEEKLY_DATA).map((d) => ({
    day: (d as any).day ?? (d as any).date ?? '',
    amount: d.amount,
    rides: d.rides,
  }));
  const maxAmount = Math.max(...chartData.map((d) => d.amount), 1);

  const stats =
    period === 'today'
      ? {
          total: todayEarnings,
          rides: todayRides,
          hours: '-',
          avg: todayRides > 0 ? Math.round(todayEarnings / todayRides) : 0,
        }
      : period === 'week'
      ? {
          total: weeklyEarnings.reduce((s, d) => s + d.amount, 0),
          rides: weeklyEarnings.reduce((s, d) => s + d.rides, 0),
          hours: '-',
          avg:
            weeklyEarnings.reduce((s, d) => s + d.rides, 0) > 0
              ? Math.round(
                  weeklyEarnings.reduce((s, d) => s + d.amount, 0) /
                    weeklyEarnings.reduce((s, d) => s + d.rides, 0)
                )
              : 0,
        }
      : {
          total: totalEarnings,
          rides: completedRides,
          hours: '-',
          avg: completedRides > 0 ? Math.round(totalEarnings / completedRides) : 0,
        };

  const getTxMeta = (t: WalletTransaction) => {
    switch (t.category) {
      case 'ride_earning':
        return {
          icon: '💵',
          title: 'Ride Virtual Payment',
          sub: t.description || 'Wallet portion from rider',
        };
      case 'referral':
        return {
          icon: '🎁',
          title: 'Referral Bonus',
          sub: t.description || 'Captain invite reward',
        };
      case 'withdrawal':
        return {
          icon: '🏦',
          title: 'Redeemed to Bank',
          sub: t.description || 'Transferred to account',
        };
      default:
        return {
          icon: t.type === 'credit' ? '📥' : '📤',
          title: t.description || (t.type === 'credit' ? 'Wallet Credit' : 'Wallet Debit'),
          sub: t.category ? t.category.replace(/_/g, ' ') : 'Wallet Activity',
        };
    }
  };

  const formatTxDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const isYesterday =
        new Date(now.setDate(now.getDate() - 1)).toDateString() === d.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isToday) return `Today, ${timeStr}`;
      if (isYesterday) return `Yesterday, ${timeStr}`;
      return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${timeStr}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }>
        {/* Header */}
        <LinearGradient colors={['#1A0A00', Colors.background]} style={s.header}>
          <Text style={s.headerTitle}>Earnings & Wallet</Text>

          {/* Top-Level Mode Selector */}
          <View style={s.mainTabRow}>
            <TouchableOpacity
              style={[s.mainTab, mainTab === 'earnings' && s.mainTabActive]}
              onPress={() => setMainTab('earnings')}
              activeOpacity={0.8}>
              {mainTab === 'earnings' && (
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.full }]}
                />
              )}
              <Text style={[s.mainTabText, mainTab === 'earnings' && s.mainTabTextActive]}>
                📊 Total Earnings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.mainTab, mainTab === 'redeem' && s.mainTabActive]}
              onPress={() => setMainTab('redeem')}
              activeOpacity={0.8}>
              {mainTab === 'redeem' && (
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.full }]}
                />
              )}
              <Text style={[s.mainTabText, mainTab === 'redeem' && s.mainTabTextActive]}>
                👛 Redeem Wallet {walletBal > 0 ? `(₹${walletBal})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {mainTab === 'earnings' ? (
          <>
            {/* ── 2.1 Total Ride Earnings View ── */}
            <View style={s.sectionPadding}>
              {/* Period selector */}
              <View style={s.periodRow}>
                {(['today', 'week', 'month'] as Period[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[s.periodBtn, period === p && s.periodBtnActive]}
                    onPress={() => setPeriod(p)}>
                    {period === p && (
                      <LinearGradient
                        colors={[Colors.primaryLight, Colors.primary]}
                        style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.full }]}
                      />
                    )}
                    <Text style={[s.periodText, period === p && s.periodTextActive]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Big earning card */}
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.earningCard}>
                <View>
                  <Text style={s.earningLabel}>
                    {period === 'today'
                      ? "Today's Earnings"
                      : period === 'week'
                      ? "This Week's Earnings"
                      : "This Month's Earnings"}
                  </Text>
                  <Text style={s.earningValue}>₹{stats.total.toLocaleString()}</Text>
                </View>
                <View style={s.earningMeta}>
                  {[
                    { v: `${stats.rides}`, l: 'Rides' },
                    { v: stats.hours, l: 'Online' },
                    { v: `₹${stats.avg}`, l: 'Avg / Ride' },
                  ].map((m, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <View style={s.metaDivider} />}
                      <View style={s.metaItem}>
                        <Text style={s.metaValue}>{m.v}</Text>
                        <Text style={s.metaLabel}>{m.l}</Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </LinearGradient>
            </View>

            {/* Quick Settleable Balance Link */}
            <TouchableOpacity
              style={s.quickRedeemCard}
              activeOpacity={0.85}
              onPress={() => setMainTab('redeem')}>
              <View style={s.quickRedeemLeft}>
                <Text style={{ fontSize: 24 }}>👛</Text>
                <View>
                  <Text style={s.quickRedeemTitle}>Redeemable Balance: ₹{walletBal.toLocaleString()}</Text>
                  <Text style={s.quickRedeemSub}>Virtual ride money + referral earnings · Tap to redeem</Text>
                </View>
              </View>
              <Text style={s.quickRedeemArrow}>→</Text>
            </TouchableOpacity>

            {/* Weekly chart */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Weekly Breakdown</Text>
              <View style={s.chart}>
                {chartData.map((d, i) => {
                  const isToday = i === 6;
                  const formattedAmount =
                    d.amount >= 1000 ? `₹${(d.amount / 1000).toFixed(1)}k` : `₹${d.amount}`;
                  return (
                    <View key={i} style={s.barWrap}>
                      <Text style={s.barAmt}>{formattedAmount}</Text>
                      <View style={s.barTrack}>
                        <LinearGradient
                          colors={
                            isToday
                              ? [Colors.primaryLight, Colors.primary]
                              : [Colors.surfaceElevated, Colors.surfaceBorder]
                          }
                          style={[s.bar, { height: (d.amount / maxAmount) * 90 }]}
                        />
                      </View>
                      <Text style={[s.barDay, isToday && s.barDayActive]}>{d.day}</Text>
                      <Text style={s.barRides}>{d.rides}r</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Ride Performance */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Ride Performance</Text>
              <View style={s.performanceContainer}>
                <View style={s.perfRow}>
                  <View style={s.perfCard}>
                    <Text style={s.perfVal}>{totalRides}</Text>
                    <Text style={s.perfLabel}>Total Requests</Text>
                  </View>
                  <View style={s.perfCard}>
                    <Text style={s.perfVal}>{acceptedRides}</Text>
                    <Text style={s.perfLabel}>Accepted Rides</Text>
                  </View>
                </View>
                <View style={s.perfRow}>
                  <View style={s.perfCard}>
                    <Text style={s.perfVal}>{completedRides}</Text>
                    <Text style={s.perfLabel}>Completed Rides</Text>
                  </View>
                  <View style={s.perfCard}>
                    <Text style={[s.perfVal, s.cancelledVal]}>{cancelledRides}</Text>
                    <Text style={s.perfLabel}>Cancelled Rides</Text>
                  </View>
                </View>
                <View style={s.perfRow}>
                  <View style={s.perfCard}>
                    <Text style={s.perfVal}>
                      {totalRides > 0 ? Math.round((acceptedRides / totalRides) * 100) : 100}%
                    </Text>
                    <Text style={s.perfLabel}>Acceptance Rate</Text>
                  </View>
                  <View style={s.perfCard}>
                    <Text style={s.perfVal}>
                      {acceptedRides > 0 ? Math.round((completedRides / acceptedRides) * 100) : 100}%
                    </Text>
                    <Text style={s.perfLabel}>Completion Rate</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* ── 2.2 Redeem Wallet View ── */}
            <View style={s.sectionPadding}>
              {/* Redeemable Balance Card */}
              <LinearGradient
                colors={['#0F2E1E', '#0B1E14']}
                style={s.redeemBalanceCard}>
                <View style={s.redeemTop}>
                  <View>
                    <Text style={s.redeemLabel}>REDEEMABLE WALLET BALANCE</Text>
                    <Text style={s.redeemAmount}>₹{walletBal.toLocaleString()}</Text>
                    <Text style={s.redeemSub}>
                      Referral bonuses + Virtual payments from rides
                    </Text>
                  </View>
                  <View style={[s.redeemBadge, walletBal < 100 && { backgroundColor: 'rgba(255,180,0,0.15)', borderColor: 'rgba(255,180,0,0.3)' }]}>
                    <Text style={[s.redeemBadgeText, walletBal < 100 && { color: '#F59E0B' }]}>
                      {walletBal >= 100 ? 'Ready to Redeem' : 'Min ₹100 required'}
                    </Text>
                  </View>
                </View>

                {/* Redeem Button */}
                <TouchableOpacity
                  style={[s.redeemActionBtn, (walletBal < 100 || isRedeeming) && { opacity: 0.6 }]}
                  activeOpacity={0.85}
                  onPress={handleRedeem}
                  disabled={isRedeeming}>
                  <LinearGradient
                    colors={walletBal >= 100 ? [Colors.success, '#16A34A'] : [Colors.surfaceElevated, Colors.surfaceBorder]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.redeemBtnGrad}>
                    {isRedeeming ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Text style={[s.redeemBtnText, walletBal < 100 && { color: Colors.textMuted }]}>
                        {walletBal >= 100
                          ? `🏦 Redeem ₹${walletBal.toLocaleString()} to Bank`
                          : walletBal > 0
                          ? `🏦 ₹${walletBal} Redeemable (Min ₹100)`
                          : '🏦 No Balance to Redeem (Min ₹100)'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* How Your Money Works Explainer Card */}
            <View style={s.explainerCard}>
              <Text style={s.explainerTitle}>💡 How Your Money Works</Text>
              
              <View style={s.explainerItem}>
                <View style={s.explainerIconBadge}>
                  <Text style={{ fontSize: 18 }}>💵</Text>
                </View>
                <View style={s.explainerTextWrap}>
                  <Text style={s.explainerItemHeading}>Direct Cash / Spot UPI</Text>
                  <Text style={s.explainerItemSub}>
                    Paid directly to you by the rider on the spot. You keep 100% of this immediately.
                  </Text>
                </View>
              </View>

              <View style={s.explainerDivider} />

              <View style={s.explainerItem}>
                <View style={s.explainerIconBadge}>
                  <Text style={{ fontSize: 18 }}>👛</Text>
                </View>
                <View style={s.explainerTextWrap}>
                  <Text style={s.explainerItemHeading}>Virtual Wallet Payments (e.g. ₹60 on ₹100 ride)</Text>
                  <Text style={s.explainerItemSub}>
                    When riders pay using their GoNow referral balance, the virtual portion is instantly credited here to your redeemable balance.
                  </Text>
                </View>
              </View>

              <View style={s.explainerDivider} />

              <View style={s.explainerItem}>
                <View style={s.explainerIconBadge}>
                  <Text style={{ fontSize: 18 }}>🎁</Text>
                </View>
                <View style={s.explainerTextWrap}>
                  <Text style={s.explainerItemHeading}>Captain Referral Rewards</Text>
                  <Text style={s.explainerItemSub}>
                    Bonus earnings for referring friends or new captains are also credited directly to this wallet.
                  </Text>
                </View>
              </View>
            </View>

            {/* Digital Wallet Transaction History */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Digital Earnings & Redemptions</Text>
              {transactions.length === 0 ? (
                <View style={s.emptyTxBox}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>👛</Text>
                  <Text style={s.emptyTxTitle}>No digital transactions yet</Text>
                  <Text style={s.emptyTxSub}>
                    When riders pay via GoNow wallet balance or when you earn referral rewards, they will appear here.
                  </Text>
                </View>
              ) : (
                transactions.map((t) => {
                  const meta = getTxMeta(t);
                  const isCredit = t.type === 'credit';
                  return (
                    <View key={t._id} style={s.transRow}>
                      <View style={[s.transIcon, isCredit ? s.creditIcon : s.debitIcon]}>
                        <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
                      </View>
                      <View style={s.transInfo}>
                        <Text style={s.transLabel} numberOfLines={1}>{meta.title}</Text>
                        <Text style={s.transSub} numberOfLines={1}>{meta.sub}</Text>
                        <Text style={s.transDate}>{formatTxDate(t.createdAt)}</Text>
                      </View>
                      <Text style={[s.transAmount, isCredit ? s.creditAmount : s.debitAmount]}>
                        {isCredit ? '+' : '-'}₹{Math.abs(t.amount)}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 54,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  mainTabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mainTabActive: {},
  mainTabText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  mainTabTextActive: {
    color: Colors.white,
  },
  sectionPadding: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  periodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  periodBtn: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  periodBtnActive: {
    borderColor: Colors.primary,
  },
  periodText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  periodTextActive: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  earningCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadow.glow,
  },
  earningLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  earningValue: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.black,
    color: Colors.white,
  },
  earningMeta: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaValue: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  metaLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  metaDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  quickRedeemCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  quickRedeemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  quickRedeemTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  quickRedeemSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  quickRedeemArrow: {
    fontSize: FontSize.lg,
    color: Colors.success,
    fontWeight: FontWeight.bold,
    marginLeft: Spacing.sm,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  chart: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    height: 160,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'flex-end',
  },
  barWrap: { flex: 1, alignItems: 'center', gap: 3 },
  barAmt: { fontSize: 7, color: Colors.textMuted },
  barTrack: { width: '100%', height: 90, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  barDay: { fontSize: FontSize.xs, color: Colors.textMuted },
  barDayActive: { color: Colors.primary, fontWeight: FontWeight.bold },
  barRides: { fontSize: 8, color: Colors.textMuted },
  performanceContainer: {
    gap: Spacing.md,
  },
  perfRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  perfCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 4,
  },
  perfVal: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
  },
  perfLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  cancelledVal: {
    color: Colors.error,
  },
  redeemBalanceCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    gap: Spacing.lg,
  },
  redeemTop: {
    gap: Spacing.xs,
  },
  redeemLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  redeemAmount: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.black,
    color: Colors.success,
  },
  redeemSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  redeemBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    marginTop: Spacing.xs,
  },
  redeemBadgeText: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: FontWeight.bold,
  },
  redeemActionBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  redeemBtnGrad: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  explainerCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  explainerTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  explainerItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  explainerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explainerTextWrap: {
    flex: 1,
  },
  explainerItemHeading: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  explainerItemSub: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  explainerDivider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  emptyTxBox: {
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTxTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  emptyTxSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  transRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  transIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditIcon: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  debitIcon: {
    backgroundColor: 'rgba(255,90,31,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,90,31,0.2)',
  },
  transInfo: { flex: 1 },
  transLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
  },
  transSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  transDate: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  transAmount: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  creditAmount: { color: Colors.success },
  debitAmount: { color: Colors.textPrimary },
});

export default CaptainEarningsScreen;

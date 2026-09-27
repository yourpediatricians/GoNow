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
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { walletService } from '../../services/wallet.service';

interface Transaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  description?: string;
  category?: string;
  createdAt: string;
  balanceAfter?: number;
}

export const WalletScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'credit' | 'debit'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWalletData = async () => {
    try {
      const [balanceRes, txRes] = await Promise.all([
        walletService.getBalance().catch(() => ({ data: { balance: 0, totalEarned: 0, totalSpent: 0 } })),
        walletService.getTransactions(1, 50).catch(() => ({ data: { transactions: [], balance: 0 } })),
      ]);

      if (balanceRes?.data) {
        setBalance(balanceRes.data.balance || 0);
        setTotalEarned(balanceRes.data.totalReferralEarned ?? balanceRes.data.totalEarned ?? 0);
        setTotalSpent(balanceRes.data.totalRideSpent ?? balanceRes.data.totalSpent ?? 0);
      }

      if (txRes?.data?.transactions) {
        setTransactions(txRes.data.transactions);
      }
    } catch (err) {
      console.warn('Failed to load wallet data:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWalletData();
  }, []);

  const filtered = activeTab === 'all'
    ? transactions
    : transactions.filter((t) => t.type === activeTab);

  const getTxMeta = (t: Transaction) => {
    switch (t.category) {
      case 'referral':
        return {
          icon: '🎁',
          title: t.description || 'Referral Bonus',
          sub: 'Welcome or Friend Invite Reward',
        };
      case 'ride_payment':
        return {
          icon: '🏍️',
          title: 'Used on Ride',
          sub: t.description || 'GoNow Trip Deduction',
        };
      case 'ride_earning':
        return {
          icon: '💵',
          title: 'Ride Earning',
          sub: t.description || 'Digital Ride Payment',
        };
      case 'bonus':
        return {
          icon: '🎉',
          title: t.description || 'Promotional Reward',
          sub: 'GoNow Bonus',
        };
      case 'tip_received':
      case 'tip_paid':
        return {
          icon: '⭐',
          title: t.description || 'Ride Tip',
          sub: 'Captain Appreciation',
        };
      default:
        return {
          icon: t.type === 'credit' ? '📥' : '📤',
          title: t.description || (t.type === 'credit' ? 'Wallet Credit' : 'Wallet Debit'),
          sub: t.category ? t.category.replace(/_/g, ' ').toUpperCase() : 'Wallet Activity',
        };
    }
  };

  const formatTxDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === d.toDateString();

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
        <LinearGradient colors={['#1A0A00', '#0D0D0D']} style={s.header}>
          <View style={s.headerNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={s.backBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>My Wallet</Text>
          </View>

          {/* Balance Card */}
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.balanceCard}>
            <View style={s.balanceTop}>
              <View>
                <Text style={s.balanceLabel}>AVAILABLE RIDE BALANCE</Text>
                <Text style={s.balanceValue}>₹{balance.toLocaleString()}</Text>
                <Text style={s.balanceSub}>
                  {balance > 0 ? '✓ Ready to deduct on your upcoming rides' : 'Invite friends or use a code to earn balance'}
                </Text>
              </View>
              <View style={s.walletIconBadge}>
                <Text style={{ fontSize: 32 }}>👛</Text>
              </View>
            </View>

            {/* Micro Stats inside Card */}
            <View style={s.balanceStatsRow}>
              <View style={s.balanceStatItem}>
                <Text style={s.balanceStatLabel}>Total Referral Bonus</Text>
                <Text style={s.balanceStatValue}>₹{totalEarned.toLocaleString()}</Text>
              </View>
              <View style={s.balanceStatDivider} />
              <View style={s.balanceStatItem}>
                <Text style={s.balanceStatLabel}>Used on Rides</Text>
                <Text style={s.balanceStatValue}>₹{totalSpent.toLocaleString()}</Text>
              </View>
            </View>
          </LinearGradient>
        </LinearGradient>

        {/* Refer & Earn Banner */}
        <TouchableOpacity
          style={s.referBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Referral')}>
          <LinearGradient
            colors={['rgba(255,90,31,0.15)', 'rgba(255,90,31,0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.referBannerGrad}>
            <Text style={s.referIcon}>🎁</Text>
            <View style={s.referText}>
              <Text style={s.referTitle}>Refer Friends & Earn Wallet Cash</Text>
              <Text style={s.referSub}>
                Get ₹30 per friend ride + friends get ₹25 welcome bonus
              </Text>
            </View>
            <Text style={s.referArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* How Your Wallet Works Card */}
        <View style={s.explainerCard}>
          <Text style={s.explainerTitle}>💡 How Your Wallet Works</Text>

          <View style={s.explainerItem}>
            <View style={s.explainerIconBadge}>
              <Text style={{ fontSize: 18 }}>🎁</Text>
            </View>
            <View style={s.explainerTextWrap}>
              <Text style={s.explainerHeading}>Earned via Referrals</Text>
              <Text style={s.explainerSub}>
                Get ₹25 welcome bonus with a referral code, and ₹30 every time an invited friend completes their 1st ride.
              </Text>
            </View>
          </View>

          <View style={s.explainerDivider} />

          <View style={s.explainerItem}>
            <View style={s.explainerIconBadge}>
              <Text style={{ fontSize: 18 }}>🏍️</Text>
            </View>
            <View style={s.explainerTextWrap}>
              <Text style={s.explainerHeading}>Automatic Ride Deduction</Text>
              <Text style={s.explainerSub}>
                Toggle "Use GoNow Balance" when booking. Any balance is automatically discounted from your ride fare, and whatever is left stays in your wallet for future rides.
              </Text>
            </View>
          </View>
        </View>

        {/* Transactions Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Transaction History</Text>
          <View style={s.tabRow}>
            {(['all', 'credit', 'debit'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[s.tab, activeTab === tab && s.tabActive]}
                onPress={() => setActiveTab(tab)}>
                {activeTab === tab && (
                  <LinearGradient
                    colors={[Colors.primaryLight, Colors.primary]}
                    style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.full }]}
                  />
                )}
                <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                  {tab === 'all' ? 'All Activity' : tab === 'credit' ? 'Money In' : 'Money Out'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={s.loadingText}>Fetching transactions...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyContainer}>
              <Text style={s.emptyIcon}>👛</Text>
              <Text style={s.emptyTitle}>No transactions found</Text>
              <Text style={s.emptySub}>
                {activeTab === 'credit'
                  ? 'No referral bonuses yet. Invite friends or enter a code to earn balance!'
                  : activeTab === 'debit'
                  ? 'No ride deductions yet. Book your next trip with GoNow balance.'
                  : 'Your referral rewards and ride deductions will show up here.'}
              </Text>
            </View>
          ) : (
            filtered.map((t) => {
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    padding: Spacing.xl,
    paddingTop: 54,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
  },
  balanceCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadow.glow,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: FontWeight.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.black,
    color: Colors.white,
  },
  balanceSub: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  walletIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  balanceStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceStatLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  balanceStatValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  balanceStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  referBanner: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,90,31,0.3)',
  },
  referBannerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  referIcon: { fontSize: 28 },
  referText: { flex: 1 },
  referTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  referSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  referArrow: {
    fontSize: FontSize.xl,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  explainerCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
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
    alignItems: 'center',
    gap: Spacing.md,
  },
  explainerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  explainerTextWrap: {
    flex: 1,
  },
  explainerHeading: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  explainerSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  explainerDivider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
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
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  tabActive: {
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  tabTextActive: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
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
  loadingContainer: {
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default WalletScreen;

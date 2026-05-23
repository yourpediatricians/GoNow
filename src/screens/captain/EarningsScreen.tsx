import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useCaptainStore } from '../../store/captainStore';

const { width } = Dimensions.get('window');

type Period = 'today' | 'week' | 'month';

const WEEKLY_DATA = [
  { day: 'Mon', amount: 820, rides: 8 },
  { day: 'Tue', amount: 1120, rides: 11 },
  { day: 'Wed', amount: 640, rides: 6 },
  { day: 'Thu', amount: 1380, rides: 13 },
  { day: 'Fri', amount: 1750, rides: 17 },
  { day: 'Sat', amount: 2100, rides: 20 },
  { day: 'Sun', amount: 960, rides: 9 },
];

const EARNINGS_BY_PERIOD: Record<Period, { total: number; rides: number; hours: string; avg: number }> = {
  today: { total: 960, rides: 9, hours: '6.5 hrs', avg: 107 },
  week: { total: 8770, rides: 84, hours: '52 hrs', avg: 104 },
  month: { total: 34200, rides: 320, hours: '205 hrs', avg: 107 },
};

const INCENTIVES = [
  { icon: '🎯', title: '10-Ride Bonus', desc: 'Complete 10 rides today', reward: '₹150', progress: 9, total: 10 },
  { icon: '⏰', title: 'Peak Hour Surge', desc: 'Earn 1.5x from 5–8 PM', reward: '1.5x', progress: 0, total: 1, isActive: true },
  { icon: '⭐', title: 'Rating Bonus', desc: 'Maintain 4.8+ rating', reward: '₹200/wk', progress: 4.9, total: 5, isRating: true },
];

const RECENT_EARNINGS = [
  { id: 'e1', from: 'Koramangala', to: 'MG Road', fare: 85, tip: 20, time: '9:15 AM', km: 4.2 },
  { id: 'e2', from: 'HSR Layout', to: 'Silk Board', fare: 110, tip: 0, time: '8:00 AM', km: 6.8 },
  { id: 'e3', from: 'BTM Layout', to: 'Jayanagar', fare: 70, tip: 10, time: '7:20 AM', km: 3.1 },
];

export const CaptainEarningsScreen: React.FC = () => {
  const [period, setPeriod] = useState<Period>('week');
  const { weeklyEarnings, todayEarnings, todayRides, totalEarnings, acceptanceRate, fetchEarnings } = useCaptainStore();

  useEffect(() => {
    fetchEarnings();
  }, []);

  const chartData = weeklyEarnings.length > 0 ? weeklyEarnings : WEEKLY_DATA;
  const maxAmount = Math.max(...chartData.map(d => d.amount), 1);

  const stats = period === 'today'
    ? { total: todayEarnings, rides: todayRides, hours: '-', avg: todayRides > 0 ? Math.round(todayEarnings / todayRides) : 0 }
    : period === 'week'
    ? { total: weeklyEarnings.reduce((s, d) => s + d.amount, 0), rides: weeklyEarnings.reduce((s, d) => s + d.rides, 0), hours: '-', avg: 0 }
    : { total: totalEarnings, rides: 0, hours: '-', avg: 0 };


  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1A0A00', Colors.background]} style={s.header}>
          <Text style={s.headerTitle}>Earnings</Text>
          {/* Period selector */}
          <View style={s.periodRow}>
            {(['today', 'week', 'month'] as Period[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[s.periodBtn, period === p && s.periodBtnActive]}
                onPress={() => setPeriod(p)}>
                {period === p && (
                  <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={StyleSheet.absoluteFill} borderRadius={BorderRadius.full} />
                )}
                <Text style={[s.periodText, period === p && s.periodTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Big earning stat */}
          <LinearGradient colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.earningCard}>
            <View>
              <Text style={s.earningLabel}>{period === 'today' ? "Today's" : period === 'week' ? "This Week's" : "This Month's"} Earnings</Text>
              <Text style={s.earningValue}>₹{stats.total.toLocaleString()}</Text>
            </View>
            <View style={s.earningMeta}>
              {[
                { v: stats.rides.toString(), l: 'Rides' },
                { v: stats.hours, l: 'Online' },
                { v: `₹${stats.avg}`, l: 'Per Ride' },
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
        </LinearGradient>

        {/* Weekly chart */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Weekly Breakdown</Text>
          <View style={s.chart}>
            {chartData.map((d, i) => {
              const isToday = i === 6;
              return (
                <View key={i} style={s.barWrap}>
                  <Text style={s.barAmt}>₹{(d.amount / 1000).toFixed(1)}k</Text>
                  <View style={s.barTrack}>
                    <LinearGradient
                      colors={isToday ? [Colors.primaryLight, Colors.primary] : [Colors.surfaceElevated, Colors.surfaceBorder]}
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

        {/* Incentives */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Incentives & Bonuses</Text>
          {INCENTIVES.map((inc, i) => (
            <View key={i} style={s.incCard}>
              <View style={s.incHeader}>
                <Text style={{ fontSize: 24 }}>{inc.icon}</Text>
                <View style={s.incInfo}>
                  <Text style={s.incTitle}>{inc.title}</Text>
                  <Text style={s.incDesc}>{inc.desc}</Text>
                </View>
                <View style={[s.rewardBadge, (inc as any).isActive && s.rewardBadgeActive]}>
                  <Text style={[s.rewardText, (inc as any).isActive && s.rewardTextActive]}>{inc.reward}</Text>
                </View>
              </View>
              {!((inc as any).isActive) && (
                <View style={s.progressRow}>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${((inc as any).isRating ? (inc.progress / inc.total) * 100 : (inc.progress / inc.total) * 100)}%` }]} />
                  </View>
                  <Text style={s.progressText}>
                    {(inc as any).isRating ? `${inc.progress}/${inc.total}⭐` : `${inc.progress}/${inc.total}`}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Recent rides */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent Rides</Text>
          {RECENT_EARNINGS.map(r => (
            <View key={r.id} style={s.rideRow}>
              <View style={s.rideIcon}><Text style={{ fontSize: 18 }}>🏍️</Text></View>
              <View style={s.rideInfo}>
                <Text style={s.rideRoute}>{r.from} → {r.to}</Text>
                <Text style={s.rideMeta}>{r.time} · {r.km} km</Text>
              </View>
              <View style={s.rideFare}>
                <Text style={s.rideFareValue}>₹{r.fare}</Text>
                {r.tip > 0 && <Text style={s.rideTip}>+₹{r.tip} tip</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Withdraw */}
        <View style={s.withdrawSection}>
          <TouchableOpacity style={s.withdrawBtn} activeOpacity={0.9}>
            <LinearGradient colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.withdrawGrad}>
              <Text style={s.withdrawText}>💳  Withdraw ₹{stats.total.toLocaleString()}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing['2xl'], paddingTop: 54, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, color: Colors.textPrimary, marginBottom: Spacing.lg },
  periodRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  periodBtn: { paddingVertical: 8, paddingHorizontal: Spacing.base, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceElevated, overflow: 'hidden', borderWidth: 1, borderColor: Colors.surfaceBorder },
  periodBtnActive: { borderColor: Colors.primary },
  periodText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  periodTextActive: { color: Colors.white, fontWeight: FontWeight.bold },
  earningCard: { borderRadius: BorderRadius.xl, padding: Spacing.xl, gap: Spacing.lg, ...Shadow.glow },
  earningLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  earningValue: { fontSize: FontSize['4xl'], fontWeight: FontWeight.black, color: Colors.white },
  earningMeta: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: BorderRadius.md, padding: Spacing.md },
  metaItem: { flex: 1, alignItems: 'center' },
  metaValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
  metaLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  metaDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  section: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  chart: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, height: 160, gap: 4, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: 'flex-end' },
  barWrap: { flex: 1, alignItems: 'center', gap: 3 },
  barAmt: { fontSize: 7, color: Colors.textMuted },
  barTrack: { width: '100%', height: 90, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  barDay: { fontSize: FontSize.xs, color: Colors.textMuted },
  barDayActive: { color: Colors.primary, fontWeight: FontWeight.bold },
  barRides: { fontSize: 8, color: Colors.textMuted },
  incCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.surfaceBorder, marginBottom: Spacing.sm },
  incHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  incInfo: { flex: 1 },
  incTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  incDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  rewardBadge: { backgroundColor: 'rgba(255,90,31,0.1)', borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,90,31,0.3)' },
  rewardBadgeActive: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  rewardText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },
  rewardTextActive: { color: Colors.success },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  progressTrack: { flex: 1, height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  progressText: { fontSize: FontSize.xs, color: Colors.textMuted, minWidth: 40, textAlign: 'right' },
  rideRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, gap: Spacing.md },
  rideIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,90,31,0.1)', alignItems: 'center', justifyContent: 'center' },
  rideInfo: { flex: 1 },
  rideRoute: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  rideMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  rideFare: { alignItems: 'flex-end' },
  rideFareValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
  rideTip: { fontSize: FontSize.xs, color: Colors.success },
  withdrawSection: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  withdrawBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  withdrawGrad: { paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center', ...Shadow.glow },
  withdrawText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
});

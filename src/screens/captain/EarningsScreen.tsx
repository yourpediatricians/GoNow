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

export const CaptainEarningsScreen: React.FC = () => {
  const [period, setPeriod] = useState<Period>('week');
  const {
    weeklyEarnings, todayEarnings, todayRides, totalEarnings, acceptanceRate, fetchEarnings,
    totalRides, completedRides, cancelledRides, acceptedRides
  } = useCaptainStore();

  useEffect(() => {
    fetchEarnings();
  }, []);

  const chartData = (weeklyEarnings.length > 0 ? weeklyEarnings : WEEKLY_DATA)
    .map(d => ({
      day:    (d as any).day ?? (d as any).date ?? '',  // backend returns 'date', local mock uses 'day'
      amount: d.amount,
      rides:  d.rides,
    }));
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
              const formattedAmount = d.amount >= 1000 
                ? `₹${(d.amount / 1000).toFixed(1)}k` 
                : `₹${d.amount}`;
              return (
                <View key={i} style={s.barWrap}>
                  <Text style={s.barAmt}>{formattedAmount}</Text>
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
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useCaptainStore } from '../../store/captainStore';
import { useAuthStore } from '../../store/authStore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';

const { width } = Dimensions.get('window');

const RECENT_RIDES = [
  { id: '1', from: 'Koramangala', to: 'MG Road', fare: 85, time: '9:15 AM', duration: '14 min', type: '🏍️' },
  { id: '2', from: 'HSR Layout', to: 'Silk Board', fare: 110, time: '8:00 AM', duration: '20 min', type: '🏍️' },
  { id: '3', from: 'BTM Layout', to: 'Jayanagar', fare: 70, time: '7:20 AM', duration: '12 min', type: '🏍️' },
];

export const CaptainDashboardScreen: React.FC = () => {
  const { isOnline, setOnline, todayEarnings, todayRides, weeklyEarnings } = useCaptainStore();
  const { user } = useAuthStore();
  const [incomingRide, setIncomingRide] = useState(false);

  const maxEarning = Math.max(...weeklyEarnings.map(d => d.amount));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={['#1A0A00', '#0D0D0D']}
          style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Captain Dashboard</Text>
              <Text style={styles.captainName}>{user?.name}</Text>
            </View>
            <View style={styles.onlineToggle}>
              <Text style={[styles.onlineLabel, isOnline && styles.onlineLabelActive]}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </Text>
              <Switch
                value={isOnline}
                onValueChange={setOnline}
                trackColor={{ false: Colors.surfaceBorder, true: 'rgba(255,90,31,0.3)' }}
                thumbColor={isOnline ? Colors.primary : Colors.textMuted}
              />
            </View>
          </View>

          {/* Status Banner */}
          <View style={[styles.statusBanner, isOnline ? styles.statusBannerOnline : styles.statusBannerOffline]}>
            <Text style={styles.statusBannerText}>
              {isOnline
                ? '✅ You are online and accepting rides'
                : '⏸️ Go online to start accepting rides'}
            </Text>
          </View>
        </LinearGradient>

        {/* Today's Stats */}
        <View style={styles.statsSection}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.earningsCard}>
            <View style={styles.earningsRow}>
              <View>
                <Text style={styles.earningsLabel}>Today's Earnings</Text>
                <Text style={styles.earningsValue}>₹{todayEarnings.toLocaleString()}</Text>
              </View>
              <View style={styles.earningsIcon}>
                <Text style={{ fontSize: 28 }}>💰</Text>
              </View>
            </View>
            <View style={styles.earningsMeta}>
              <View style={styles.earningsMetaItem}>
                <Text style={styles.earningsMetaValue}>{todayRides}</Text>
                <Text style={styles.earningsMetaLabel}>Rides</Text>
              </View>
              <View style={styles.earningsMetaDivider} />
              <View style={styles.earningsMetaItem}>
                <Text style={styles.earningsMetaValue}>4.9⭐</Text>
                <Text style={styles.earningsMetaLabel}>Rating</Text>
              </View>
              <View style={styles.earningsMetaDivider} />
              <View style={styles.earningsMetaItem}>
                <Text style={styles.earningsMetaValue}>98%</Text>
                <Text style={styles.earningsMetaLabel}>Acceptance</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Earnings</Text>
          <View style={styles.chart}>
            {weeklyEarnings.map((day, i) => (
              <View key={i} style={styles.chartBar}>
                <Text style={styles.chartValue}>₹{(day.amount / 1000).toFixed(1)}k</Text>
                <View style={styles.barContainer}>
                  <LinearGradient
                    colors={
                      day.date === 'Sat'
                        ? [Colors.primaryLight, Colors.primary]
                        : [Colors.surfaceElevated, Colors.surfaceBorder]
                    }
                    style={[styles.bar, { height: (day.amount / maxEarning) * 100 }]}
                  />
                </View>
                <Text style={styles.chartDay}>{day.date}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Rides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Rides</Text>
          <View style={styles.recentList}>
            {RECENT_RIDES.map(ride => (
              <View key={ride.id} style={styles.recentCard}>
                <View style={styles.recentIcon}>
                  <Text style={{ fontSize: 20 }}>{ride.type}</Text>
                </View>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentRoute}>{ride.from} → {ride.to}</Text>
                  <Text style={styles.recentMeta}>{ride.time} · {ride.duration}</Text>
                </View>
                <Text style={styles.recentFare}>₹{ride.fare}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: '💳', label: 'Withdraw', sub: 'Instant transfer' },
              { icon: '📊', label: 'Analytics', sub: 'View reports' },
              { icon: '🛠️', label: 'Vehicle', sub: 'Manage vehicle' },
              { icon: '🎯', label: 'Incentives', sub: 'View offers' },
            ].map((action, i) => (
              <TouchableOpacity key={i} style={styles.actionCard}>
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionSub}>{action.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    padding: Spacing['2xl'],
    paddingTop: 54,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  greeting: { fontSize: FontSize.sm, color: Colors.textMuted, letterSpacing: 0.5 },
  captainName: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.textPrimary },
  onlineToggle: { alignItems: 'flex-end', gap: 4 },
  onlineLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  onlineLabelActive: { color: Colors.success },
  statusBanner: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statusBannerOnline: { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  statusBannerOffline: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  statusBannerText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  statsSection: { padding: Spacing.xl },
  earningsCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.glow,
  },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  earningsLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  earningsValue: { fontSize: FontSize['4xl'], fontWeight: FontWeight.black, color: Colors.white },
  earningsIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  earningsMeta: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  earningsMetaItem: { flex: 1, alignItems: 'center' },
  earningsMetaValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
  earningsMetaLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  earningsMetaDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    height: 160,
    gap: 4,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  chartBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  chartValue: { fontSize: 8, color: Colors.textMuted },
  barContainer: { width: '100%', height: 100, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  chartDay: { fontSize: FontSize.xs, color: Colors.textMuted },
  recentList: { gap: Spacing.sm },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  recentIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,90,31,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  recentInfo: { flex: 1 },
  recentRoute: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  recentMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  recentFare: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionCard: {
    width: (width - Spacing.xl * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  actionIcon: { fontSize: 24, marginBottom: Spacing.sm },
  actionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  actionSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});

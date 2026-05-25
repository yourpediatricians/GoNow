import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useRideStore } from '../../store/rideStore';
import { RideHistory } from '../../types';

const MOCK_HISTORY = [
  {
    id: '1',
    type: 'bike',
    icon: '🏍️',
    from: 'Koramangala 5th Block',
    to: 'MG Road Metro Station',
    date: 'Today, 9:15 AM',
    fare: 85,
    distance: '4.2 km',
    duration: '14 min',
    status: 'completed',
    captain: 'Rajesh K.',
    rating: 5,
  },
  {
    id: '2',
    type: 'auto',
    icon: '🛺',
    from: 'HSR Layout Sector 6',
    to: 'Silk Board Junction',
    date: 'Yesterday, 6:30 PM',
    fare: 130,
    distance: '6.8 km',
    duration: '22 min',
    status: 'completed',
    captain: 'Suresh M.',
    rating: 4,
  },
  {
    id: '3',
    type: 'cab',
    icon: '🚗',
    from: 'Whitefield',
    to: 'Kempegowda Airport',
    date: 'Dec 15, 4:00 AM',
    fare: 680,
    distance: '38 km',
    duration: '55 min',
    status: 'completed',
    captain: 'Anand P.',
    rating: 5,
  },
  {
    id: '4',
    type: 'bike',
    icon: '🏍️',
    from: 'Indiranagar',
    to: 'Ulsoor Lake',
    date: 'Dec 14, 7:00 PM',
    fare: 0,
    distance: '3.1 km',
    duration: '—',
    status: 'cancelled',
    captain: null,
    rating: null,
  },
  {
    id: '5',
    type: 'auto',
    icon: '🛺',
    from: 'BTM Layout 2nd Stage',
    to: 'Forum Mall, Koramangala',
    date: 'Dec 12, 2:15 PM',
    fare: 95,
    distance: '5.3 km',
    duration: '19 min',
    status: 'completed',
    captain: 'Venu G.',
    rating: 4,
  },
];

type Filter = 'all' | 'completed' | 'cancelled';

export const RideHistoryScreen: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const { rideHistory, fetchRideHistory, isLoading } = useRideStore();

  useEffect(() => {
    fetchRideHistory();
  }, []);

  const rideIcons: Record<string, string> = { bike: '🏍️', auto: '🛺', cab: '🚗' };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const now = new Date();
      const isToday = d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
      
      const isYesterday = new Date(now.getTime() - 86400000).getDate() === d.getDate() &&
        new Date(now.getTime() - 86400000).getMonth() === d.getMonth() &&
        new Date(now.getTime() - 86400000).getFullYear() === d.getFullYear();

      const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      
      if (isToday) {
        return `Today, ${timeStr}`;
      } else if (isYesterday) {
        return `Yesterday, ${timeStr}`;
      } else {
        return d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {
      return dateStr;
    }
  };

  const filtered = rideHistory.filter(
    r => filter === 'all' || r.status === filter,
  );

  const completedCount = rideHistory.filter(r => r.status === 'completed').length;
  const cancelledCount = rideHistory.filter(r => r.status === 'cancelled').length;

  const totalSpent = rideHistory.filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.fare, 0);

  const renderItem = ({ item }: { item: RideHistory }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={[styles.typeIcon, item.status === 'cancelled' && styles.cancelledIcon]}>
          <Text style={{ fontSize: 22 }}>{rideIcons[item.rideType] || '🚗'}</Text>
        </View>
        <View style={styles.cardMain}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
            <View style={[styles.statusBadge, item.status === 'cancelled' && styles.cancelledBadge]}>
              <Text style={[styles.statusText, item.status === 'cancelled' && styles.cancelledText]}>
                {item.status === 'completed' ? '✓ Done' : '✕ Cancelled'}
              </Text>
            </View>
          </View>

          <View style={styles.routeRow}>
            <View style={styles.routeDots}>
              <View style={styles.dotPickup} />
              <View style={styles.routeLine} />
              <View style={styles.dotDrop} />
            </View>
            <View style={styles.routeAddresses}>
              <Text style={styles.routeFrom} numberOfLines={1}>{item.pickup?.name || item.pickup?.address || 'Pickup Location'}</Text>
              <Text style={styles.routeTo} numberOfLines={1}>{item.dropoff?.name || item.dropoff?.address || 'Dropoff Location'}</Text>
            </View>
          </View>
        </View>
      </View>

      {item.status === 'completed' && (
        <View style={styles.cardBottom}>
          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>📏 {typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : '—'}</Text>
            <Text style={styles.metaItem}>⏱ {item.duration ? `${Math.round(item.duration)} min` : '—'}</Text>
            {item.captain?.name && <Text style={styles.metaItem}>👤 {item.captain.name}</Text>}
          </View>
          <View style={styles.fareRow}>
            {typeof item.rating === 'number' && item.rating > 0 && (
              <View style={styles.ratingRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Text key={i} style={[styles.star, i < item.rating! && styles.starFilled]}>★</Text>
                ))}
              </View>
            )}
            <Text style={styles.fare}>₹{item.fare}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Rides</Text>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{completedCount}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardAccent]}>
            <Text style={[styles.summaryValue, styles.summaryValueAccent]}>₹{totalSpent}</Text>
            <Text style={styles.summaryLabel}>Total Spent</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{cancelledCount}</Text>
            <Text style={styles.summaryLabel}>Cancelled</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          {(['all', 'completed', 'cancelled'] as Filter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}>
              {filter === f ? (
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  style={StyleSheet.absoluteFill}
                  borderRadius={BorderRadius.full}
                />
              ) : null}
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm }}>No rides found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.surface,
    padding: Spacing['2xl'],
    paddingTop: 54,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Shadow.sm,
  },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, color: Colors.textPrimary, marginBottom: Spacing.lg },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  summaryCard: {
    flex: 1, alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  summaryCardAccent: { borderColor: Colors.primary, backgroundColor: 'rgba(255,90,31,0.08)' },
  summaryValue: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.textPrimary },
  summaryValueAccent: { color: Colors.primary },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  filters: { flexDirection: 'row', gap: Spacing.sm },
  filterBtn: {
    paddingVertical: 8, paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  filterBtnActive: { borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  filterTextActive: { color: Colors.white, fontWeight: FontWeight.bold },
  list: { padding: Spacing.xl, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Shadow.sm,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  cardTop: { flexDirection: 'row', gap: Spacing.md },
  typeIcon: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,90,31,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,90,31,0.2)',
  },
  cancelledIcon: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' },
  cardMain: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardDate: { fontSize: FontSize.xs, color: Colors.textMuted },
  statusBadge: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: BorderRadius.full,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  cancelledBadge: { backgroundColor: 'rgba(239,68,68,0.1)' },
  statusText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semiBold },
  cancelledText: { color: Colors.error },
  routeRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  routeDots: { alignItems: 'center', gap: 2 },
  dotPickup: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  routeLine: { width: 1, height: 16, backgroundColor: Colors.surfaceBorder },
  dotDrop: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textMuted, borderWidth: 1, borderColor: Colors.textSecondary },
  routeAddresses: { flex: 1, gap: 8 },
  routeFrom: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  routeTo: { fontSize: FontSize.sm, color: Colors.textSecondary },
  cardBottom: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
  },
  metaRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  metaItem: { fontSize: FontSize.xs, color: Colors.textMuted },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingRow: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 14, color: Colors.surfaceBorder },
  starFilled: { color: Colors.accent },
  fare: { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.primary },
});

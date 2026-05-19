import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../constants/theme';

const NOTIFICATIONS = [
  { id: 'n1', type: 'promo', icon: '🏷️', title: 'Get 20% off your next ride!', body: 'Use code GOFIRST20. Valid till Dec 31.', time: '2m ago', read: false },
  { id: 'n2', type: 'ride', icon: '✅', title: 'Ride Completed', body: 'Your ride from Koramangala to MG Road is complete. ₹85 paid.', time: '1h ago', read: false },
  { id: 'n3', type: 'wallet', icon: '💰', title: 'Money Added', body: '₹500 added to your GoNow wallet successfully.', time: '2h ago', read: true },
  { id: 'n4', type: 'promo', icon: '🎁', title: 'Referral Bonus Credited!', body: 'Your friend Neha joined GoNow. ₹100 added to your wallet.', time: 'Yesterday', read: true },
  { id: 'n5', type: 'ride', icon: '🔎', title: 'Looking for captain...', body: "We're finding the best captain near you. This may take a moment.", time: 'Yesterday', read: true },
  { id: 'n6', type: 'safety', icon: '🛡️', title: 'Safety Reminder', body: 'Always share your ride details with a trusted contact.', time: 'Dec 14', read: true },
  { id: 'n7', type: 'promo', icon: '🌟', title: "You've earned Gold status!", body: 'Complete 5 more rides to unlock exclusive perks.', time: 'Dec 13', read: true },
];

type NotifType = 'all' | 'rides' | 'promos';

export const NotificationsScreen: React.FC = () => {
  const [filter, setFilter] = useState<NotifType>('all');
  const [items, setItems] = useState(NOTIFICATIONS);

  const typeMap: Record<NotifType, string[]> = {
    all: ['promo', 'ride', 'wallet', 'safety'],
    rides: ['ride'],
    promos: ['promo', 'wallet'],
  };
  const filtered = items.filter(n => typeMap[filter].includes(n.type));
  const unreadCount = items.filter(n => !n.read).length;

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const renderItem = ({ item }: { item: typeof NOTIFICATIONS[0] }) => (
    <TouchableOpacity
      style={[s.card, !item.read && s.cardUnread]}
      onPress={() => markRead(item.id)}
      activeOpacity={0.85}>
      {!item.read && <View style={s.unreadDot} />}
      <View style={s.iconWrapper}>
        <Text style={{ fontSize: 22 }}>{item.icon}</Text>
      </View>
      <View style={s.textContent}>
        <Text style={[s.cardTitle, !item.read && s.cardTitleUnread]}>{item.title}</Text>
        <Text style={s.cardBody} numberOfLines={2}>{item.body}</Text>
        <Text style={s.cardTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.badge}><Text style={s.badgeText}>{unreadCount}</Text></View>
          )}
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={s.markAllBtn}>
              <Text style={s.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={s.tabRow}>
          {(['all', 'rides', 'promos'] as NotifType[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, filter === tab && s.tabActive]}
              onPress={() => setFilter(tab)}>
              {filter === tab && (
                <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={StyleSheet.absoluteFill} borderRadius={BorderRadius.full} />
              )}
              <Text style={[s.tabText, filter === tab && s.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🔔</Text>
            <Text style={s.emptyText}>No notifications here</Text>
          </View>
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.surface, padding: Spacing['2xl'], paddingTop: 54, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, color: Colors.textPrimary, flex: 1 },
  badge: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3, marginRight: Spacing.sm },
  badgeText: { fontSize: FontSize.xs, color: Colors.white, fontWeight: FontWeight.bold },
  markAllBtn: { paddingVertical: 6, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  markAllText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  tabRow: { flexDirection: 'row', gap: Spacing.sm },
  tab: { paddingVertical: 8, paddingHorizontal: Spacing.base, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceElevated, overflow: 'hidden', borderWidth: 1, borderColor: Colors.surfaceBorder },
  tabActive: { borderColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  tabTextActive: { color: Colors.white, fontWeight: FontWeight.bold },
  list: { padding: Spacing.xl, gap: Spacing.sm },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, gap: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, position: 'relative' },
  cardUnread: { borderColor: 'rgba(255,90,31,0.3)', backgroundColor: 'rgba(255,90,31,0.04)' },
  unreadDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  iconWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder, flexShrink: 0 },
  textContent: { flex: 1 },
  cardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary, marginBottom: 4 },
  cardTitleUnread: { color: Colors.textPrimary, fontWeight: FontWeight.bold },
  cardBody: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18, marginBottom: 4 },
  cardTime: { fontSize: FontSize.xs, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: FontSize.base, color: Colors.textMuted },
});

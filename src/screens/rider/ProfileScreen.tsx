import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useCaptainStore } from '../../store/captainStore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { Logo } from '../../components/Logo';

const MENU_ITEMS = [
  { section: 'Account', items: [
    { label: 'Edit Profile', route: 'EditProfile', arrow: true },
    { label: 'Saved Addresses', route: 'SavedAddresses', arrow: true },
  ]},
  { section: 'Support', items: [
    { label: 'Safety', route: 'Support', params: { activeTab: 'safety' }, arrow: true },
    { label: 'Help & Support', route: 'Support', params: { activeTab: 'help' }, arrow: true },
    { label: 'Rate the App', route: 'Support', params: { activeTab: 'rate' }, arrow: true },
    { label: 'Terms & Privacy', route: 'Support', params: { activeTab: 'terms' }, arrow: true },
  ]},
];

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { totalRides, fetchEarnings } = useCaptainStore();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (user?.role === 'captain') {
      fetchEarnings();
    }
  }, [user?.role]);

  const filteredMenuItems = MENU_ITEMS.map(section => {
    if (section.section === 'Account' && user?.role === 'captain') {
      return {
        ...section,
        items: section.items.filter(item => item.route !== 'SavedAddresses')
      };
    }
    return section;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={['#1A0A00', '#0D0D0D']}
          style={styles.header}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary]}
                style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
              </LinearGradient>
              <TouchableOpacity style={styles.editAvatarBtn} onPress={() => navigation.navigate('EditProfile')}>
                <Text style={styles.editAvatarIcon}>✏️</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userPhone}>{user?.phone}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {user?.role === 'rider' ? 'Rider' : 'Captain'}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { value: `${user?.rating || 5.0}⭐`, label: 'Rating' },
              { value: user?.role === 'captain' ? `${totalRides}` : `${user?.totalRides || 0}`, label: 'Rides' },
              { value: user?.memberSince || 'June 2024', label: 'Member Since' },
            ].map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Menu */}
        {filteredMenuItems.map((section, si) => (
          <View key={si} style={styles.menuSection}>
            <Text style={styles.menuSectionLabel}>{section.section}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  onPress={() => {
                    if (item.route) {
                      navigation.navigate(item.route, (item as any).params);
                    }
                  }}
                  style={[
                    styles.menuItem,
                    ii < section.items.length - 1 && styles.menuItemBorder,
                  ]}>
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                  <View style={styles.menuItemRight}>
                    {(item as any).value && (
                      <Text style={styles.menuItemValue}>{(item as any).value}</Text>
                    )}
                    {(item as any).arrow && (
                      <Text style={styles.menuItemArrow}>›</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
          <Logo size={60} style={{ marginTop: 12, opacity: 0.85 }} />
          <Text style={styles.version}>GoNow v1.0.0</Text>
        </View>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 54,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarSection: { alignItems: 'center', paddingHorizontal: Spacing['2xl'], marginBottom: Spacing.xl },
  avatarWrapper: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.glow,
  },
  avatarText: { fontSize: 36, fontWeight: FontWeight.black, color: Colors.white },
  editAvatarBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  editAvatarIcon: { fontSize: 12 },
  userName: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.textPrimary, marginBottom: 4 },
  userPhone: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm },
  roleBadge: {
    backgroundColor: 'rgba(255,90,31,0.15)',
    borderRadius: BorderRadius.full,
    paddingVertical: 4, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,90,31,0.3)',
  },
  roleBadgeText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semiBold },
  verifiedBadge: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: BorderRadius.full,
    paddingVertical: 4, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  verifiedText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semiBold },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  referralBanner: {
    margin: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  referralGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  referralIcon: { fontSize: 28 },
  referralText: { flex: 1 },
  referralTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.accent },
  referralSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  referralArrow: { fontSize: FontSize.xl, color: Colors.accent },
  menuSection: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  menuSectionLabel: {
    fontSize: FontSize.xs, color: Colors.textMuted,
    fontWeight: FontWeight.semiBold, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: Spacing.sm,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.base, gap: Spacing.md,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  menuItemIcon: { fontSize: 18, width: 26 },
  menuItemLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  menuItemValue: { fontSize: FontSize.sm, color: Colors.textMuted },
  menuItemArrow: { fontSize: FontSize.xl, color: Colors.textMuted },
  logoutSection: { alignItems: 'center', gap: Spacing.md },
  logoutBtn: {
    width: '90%',
    backgroundColor: '#EF4444',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 1, borderColor: '#EF4444',
  },
  logoutText: { color: '#FFFFFF', fontWeight: FontWeight.bold, fontSize: FontSize.base },
  version: { fontSize: FontSize.xs, color: Colors.textMuted },
});

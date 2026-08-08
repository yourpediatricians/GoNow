import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/Logo';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const features = [
  { icon: '⚡', label: 'Instant Booking' },
  { icon: '🛡️', label: 'Safe Rides' },
  { icon: '💰', label: 'Affordable Rates' },
];

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero */}
      <View style={styles.hero}>
        <LinearGradient
          colors={['#1A0800', '#0D0D0D']}
          style={StyleSheet.absoluteFill}
        />
        {/* Decorative circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <View style={styles.heroContent}>
          <Logo size={90} style={{ alignSelf: 'flex-start', marginBottom: 16 }} />
          <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.badge}>
            <Text style={styles.badgeText}>🚀 Fast & Convenient Rides</Text>
          </LinearGradient>

          <Text style={styles.heroTitle}>{'Move\nFaster,\nSmarter.'}</Text>

          <View style={styles.statsRow}>
            {[
              { value: '⚡', label: 'Instant Match' },
              { value: '🛡️', label: 'Verified' },
              { value: '📍', label: 'Live Tracking' },
            ].map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
        <View style={styles.handle} />

        <Text style={styles.sheetTitle}>Get Started</Text>
        <Text style={styles.sheetSubtitle}>
          Book bike, auto or cab rides in seconds
        </Text>

        {/* Features */}
        <View style={styles.featuresRow}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureChip}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        <Button
          title="Book a Ride"
          onPress={() => navigation.navigate('PhoneEntry', { role: 'rider' })}
          style={styles.riderBtn}
        />

        <Button
          title="Drive & Earn as Captain"
          onPress={() => navigation.navigate('PhoneEntry', { role: 'captain' })}
          variant="outline"
          style={styles.captainBtn}
        />

        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={styles.link}>Terms of Service</Text> &{' '}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,90,31,0.08)',
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,90,31,0.05)',
    top: 80,
    left: -60,
  },
  heroContent: { paddingHorizontal: Spacing['2xl'] },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  badgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 54,
    fontWeight: FontWeight.black,
    color: Colors.white,
    letterSpacing: -2,
    lineHeight: 56,
    marginBottom: Spacing['2xl'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing['2xl'],
  },
  statItem: { alignItems: 'center' },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  bottomSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceBorder,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  sheetTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sheetSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  featureChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: 4,
  },
  featureIcon: { fontSize: 20 },
  featureLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  riderBtn: { marginBottom: Spacing.md },
  captainBtn: {},
  terms: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 18,
  },
  link: { color: Colors.primary },
});

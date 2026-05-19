import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface IncomingRideProps {
  onAccept?: () => void;
  onReject?: () => void;
}

const MOCK_REQUEST = {
  rider: { name: 'Arjun Sharma', rating: 4.8, totalRides: 142, avatar: 'A' },
  pickup: { address: 'Koramangala 5th Block, Bengaluru', shortName: 'Koramangala' },
  dropoff: { address: 'MG Road Metro Station, Bengaluru', shortName: 'MG Road' },
  distance: 4.2,
  duration: 14,
  fare: 85,
  type: 'bike',
  icon: '🏍️',
  pickupDistance: 0.8,
};

export const IncomingRideScreen: React.FC<IncomingRideProps> = ({ onAccept, onReject }) => {
  const [countdown, setCountdown] = useState(15);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }).start();
    Animated.timing(progressAnim, { toValue: 0, duration: 15000, useNativeDriver: false }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); onReject?.(); return 0; }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={s.overlay}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Timer ring */}
        <View style={s.timerSection}>
          <Animated.View style={[s.timerRing, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={s.timerGrad}>
              <Text style={s.timerValue}>{countdown}</Text>
              <Text style={s.timerUnit}>sec</Text>
            </LinearGradient>
          </Animated.View>
          <Text style={s.newRideLabel}>New Ride Request!</Text>
        </View>

        {/* Progress bar */}
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
          }]} />
        </View>

        {/* Rider info */}
        <View style={s.riderRow}>
          <View style={s.riderAvatar}><Text style={s.riderAvatarText}>{MOCK_REQUEST.rider.avatar}</Text></View>
          <View style={s.riderInfo}>
            <Text style={s.riderName}>{MOCK_REQUEST.rider.name}</Text>
            <Text style={s.riderMeta}>⭐ {MOCK_REQUEST.rider.rating} · {MOCK_REQUEST.rider.totalRides} rides</Text>
          </View>
          <View style={s.fareTag}>
            <Text style={s.fareValue}>₹{MOCK_REQUEST.fare}</Text>
            <Text style={s.fareLabel}>fare</Text>
          </View>
        </View>

        {/* Route */}
        <View style={s.routeCard}>
          <View style={s.routeRow}>
            <View style={s.dotPickup} />
            <View style={s.routeText}>
              <Text style={s.routeAddr}>{MOCK_REQUEST.pickup.shortName}</Text>
              <Text style={s.routeAddrSub} numberOfLines={1}>{MOCK_REQUEST.pickup.address}</Text>
            </View>
          </View>
          <View style={s.routeDivider} />
          <View style={s.routeRow}>
            <View style={s.dotDrop} />
            <View style={s.routeText}>
              <Text style={s.routeAddr}>{MOCK_REQUEST.dropoff.shortName}</Text>
              <Text style={s.routeAddrSub} numberOfLines={1}>{MOCK_REQUEST.dropoff.address}</Text>
            </View>
          </View>
        </View>

        {/* Trip stats */}
        <View style={s.statsRow}>
          {[
            { icon: '📏', label: 'Trip Distance', value: `${MOCK_REQUEST.distance} km` },
            { icon: '⏱', label: 'Duration', value: `${MOCK_REQUEST.duration} min` },
            { icon: '📍', label: 'Pickup in', value: `${MOCK_REQUEST.pickupDistance} km` },
          ].map((stat, i) => (
            <View key={i} style={s.statItem}>
              <Text style={s.statIcon}>{stat.icon}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.rejectBtn} onPress={onReject} activeOpacity={0.9}>
            <Text style={s.rejectText}>✕ Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.acceptBtn} onPress={onAccept} activeOpacity={0.9}>
            <LinearGradient colors={[Colors.success, '#16A34A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.acceptGrad}>
              <Text style={s.acceptText}>✓ Accept Ride</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: Spacing.xl, paddingBottom: 40, ...Shadow.lg },
  timerSection: { alignItems: 'center', marginBottom: Spacing.lg },
  timerRing: { marginBottom: Spacing.sm },
  timerGrad: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', ...Shadow.glow },
  timerValue: { fontSize: FontSize['3xl'], fontWeight: FontWeight.black, color: Colors.white },
  timerUnit: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)' },
  newRideLabel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  progressTrack: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden', marginBottom: Spacing.xl },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  riderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.md },
  riderAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  riderAvatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.white },
  riderInfo: { flex: 1 },
  riderName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  riderMeta: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  fareTag: { alignItems: 'center', backgroundColor: 'rgba(255,90,31,0.1)', borderRadius: BorderRadius.md, padding: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,90,31,0.3)' },
  fareValue: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.primary },
  fareLabel: { fontSize: FontSize.xs, color: Colors.primary },
  routeCard: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  dotPickup: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 4 },
  dotDrop: { width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.textMuted, marginTop: 4 },
  routeDivider: { width: 1, height: 12, backgroundColor: Colors.surfaceBorder, marginLeft: 4.5, marginVertical: 2 },
  routeText: { flex: 1 },
  routeAddr: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  routeAddrSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.surfaceBorder },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statIcon: { fontSize: 16 },
  statValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  actionRow: { flexDirection: 'row', gap: Spacing.md },
  rejectBtn: { flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.3)' },
  rejectText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.error },
  acceptBtn: { flex: 2, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  acceptGrad: { paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', ...Shadow.md },
  acceptText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
});

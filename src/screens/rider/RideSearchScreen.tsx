import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderStackParamList } from '../../types';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';

type Props = NativeStackScreenProps<RiderStackParamList, 'RideSearch'>;
const { width } = Dimensions.get('window');
const MOCK_CAPTAIN = {
  name: 'Rajesh Kumar', avatar: 'R', rating: 4.9, totalRides: 2840,
  vehicle: { make: 'Honda', model: 'Activa 6G', color: 'Black', plateNumber: 'KA 05 AB 1234' },
};

export const RideSearchScreen: React.FC<Props> = ({ navigation }) => {
  const [phase, setPhase] = useState<'searching' | 'matched'>('searching');
  const [dotsCount, setDotsCount] = useState(1);
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const matchScale = useRef(new Animated.Value(0)).current;
  const matchOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dotTimer = setInterval(() => setDotsCount(d => (d % 3) + 1), 500);
    const animPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])).start();
    animPulse(pulse1, 0); animPulse(pulse2, 600); animPulse(pulse3, 1200);
    const matchTimer = setTimeout(() => {
      clearInterval(dotTimer);
      setPhase('matched');
      Animated.parallel([
        Animated.spring(matchScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(matchOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 3000);
    return () => { clearInterval(dotTimer); clearTimeout(matchTimer); };
  }, []);

  const pulseStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.4, 0] }),
  });

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <LinearGradient colors={['#1A0800', Colors.background]} style={s.topGrad} />
      <View style={s.header}>
        <Text style={s.title}>
          {phase === 'searching' ? `Searching for captain${'.'.repeat(dotsCount)}` : '🎉 Captain Found!'}
        </Text>
        <Text style={s.subtitle}>
          {phase === 'searching' ? 'Matching you with the nearest captain' : 'Your captain is on the way'}
        </Text>
      </View>
      <View style={s.pulseContainer}>
        <Animated.View style={[s.pulseRing, pulseStyle(pulse1)]} />
        <Animated.View style={[s.pulseRing, pulseStyle(pulse2)]} />
        <Animated.View style={[s.pulseRing, pulseStyle(pulse3)]} />
        <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={s.pulseCenter}>
          <Text style={{ fontSize: 32 }}>🔍</Text>
        </LinearGradient>
      </View>
      {phase === 'searching' && (
        <View style={s.statsRow}>
          {[{ l: 'Captains nearby', v: '12' }, { l: 'Est. wait', v: '2-3 min' }, { l: 'Distance', v: '4.2 km' }]
            .map((s2, i) => (
              <View key={i} style={s.statItem}>
                <Text style={s.statValue}>{s2.v}</Text>
                <Text style={s.statLabel}>{s2.l}</Text>
              </View>
            ))}
        </View>
      )}
      {phase === 'matched' && (
        <Animated.View style={[s.matchCard, { opacity: matchOpacity, transform: [{ scale: matchScale }] }]}>
          <View style={s.captainRow}>
            <View style={s.avatar}><Text style={s.avatarText}>{MOCK_CAPTAIN.avatar}</Text></View>
            <View style={s.captainInfo}>
              <Text style={s.captainName}>{MOCK_CAPTAIN.name}</Text>
              <Text style={s.captainMeta}>⭐ {MOCK_CAPTAIN.rating} · {MOCK_CAPTAIN.totalRides} rides</Text>
              <Text style={s.vehicleText}>{MOCK_CAPTAIN.vehicle.color} {MOCK_CAPTAIN.vehicle.make} {MOCK_CAPTAIN.vehicle.model}</Text>
            </View>
            <View style={s.etaBadge}>
              <Text style={s.etaValue}>3</Text>
              <Text style={s.etaUnit}>min</Text>
            </View>
          </View>
          <View style={s.plate}><Text style={s.plateText}>{MOCK_CAPTAIN.vehicle.plateNumber}</Text></View>
          <TouchableOpacity style={s.trackBtn} onPress={() => navigation.replace('ActiveRide', { rideId: 'ride_001' })}>
            <LinearGradient colors={[Colors.primaryLight, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.trackBtnGrad}>
              <Text style={s.trackBtnText}>Track Captain →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
      {phase === 'searching' && (
        <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={s.cancelText}>Cancel Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center' },
  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  header: { marginTop: 80, alignItems: 'center', paddingHorizontal: Spacing['2xl'] },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  pulseContainer: { marginTop: 48, width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary },
  pulseCenter: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', ...Shadow.glow },
  statsRow: {
    flexDirection: 'row', marginTop: 48, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl, padding: Spacing.lg, marginHorizontal: Spacing.xl,
    borderWidth: 1, borderColor: Colors.surfaceBorder, width: width - Spacing.xl * 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  matchCard: {
    marginTop: 32, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, marginHorizontal: Spacing.xl, borderWidth: 1,
    borderColor: Colors.surfaceBorder, width: width - Spacing.xl * 2, ...Shadow.lg,
  },
  captainRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  avatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.white },
  captainInfo: { flex: 1 },
  captainName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  captainMeta: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  vehicleText: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  etaBadge: { alignItems: 'center', backgroundColor: 'rgba(255,90,31,0.1)', borderRadius: BorderRadius.md, padding: Spacing.sm, borderWidth: 1, borderColor: 'rgba(255,90,31,0.3)', minWidth: 52 },
  etaValue: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.primary },
  etaUnit: { fontSize: FontSize.xs, color: Colors.primary },
  plate: { alignSelf: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.sm, paddingVertical: 6, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  plateText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, letterSpacing: 2 },
  trackBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  trackBtnGrad: { paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  trackBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.base },
  cancelBtn: { marginTop: 32, paddingVertical: Spacing.md, paddingHorizontal: Spacing['2xl'], borderRadius: BorderRadius.full, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  cancelText: { color: Colors.error, fontWeight: FontWeight.semiBold, fontSize: FontSize.sm },
});

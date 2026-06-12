import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, Dimensions, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderStackParamList, CaptainInfo } from '../../types';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { getSocket, SOCKET_EVENTS } from '../../services/socket.service';
import { useRideStore } from '../../store/rideStore';
import { rideService } from '../../services/ride.service';

type Props = NativeStackScreenProps<RiderStackParamList, 'RideSearch'>;
const { width } = Dimensions.get('window');

export const RideSearchScreen: React.FC<Props> = ({ navigation, route }) => {
  const { rideId } = route.params;
  const [phase, setPhase] = useState<'searching' | 'matched'>('searching');
  const [dotsCount, setDotsCount] = useState(1);
  const [matchedCaptain, setMatchedCaptain] = useState<CaptainInfo | null>(null);
  const [rideOtp, setRideOtp] = useState<string>('');
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const matchScale = useRef(new Animated.Value(0)).current;
  const matchOpacity = useRef(new Animated.Value(0)).current;

  const { setCaptain, setRideStatus, availableCaptains, estimatedDistance, estimatedDuration, cancelRide } = useRideStore();

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const handleRideMatched = (ride: any, captainProfile: any) => {
    if (phaseRef.current === 'matched') return;

    const captain: CaptainInfo = {
      id: ride.captain._id || ride.captain,
      name: ride.captain.name,
      phone: ride.captain.phone,
      rating: ride.captain.rating,
      totalRides: 0,
      vehicle: captainProfile?.vehicle,
      distanceFromPickup: undefined,
    };

    setMatchedCaptain(captain);
    setCaptain(captain);
    setRideOtp(ride.otp);
    setRideStatus('matched');
    setPhase('matched');

    Animated.parallel([
      Animated.spring(matchScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(matchOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const syncRideStatus = async () => {
    try {
      const res = await rideService.getRideById(rideId);
      if (res.success && res.data?.ride) {
        const { ride, captainProfile } = res.data;
        if (ride.status === 'accepted') {
          handleRideMatched(ride, captainProfile);
        } else if (ride.status === 'otp_verified' || ride.status === 'in_progress') {
          navigation.replace('ActiveRide', { rideId });
        } else if (ride.status === 'cancelled') {
          Alert.alert('Ride Cancelled', 'This ride has been cancelled.');
          navigation.goBack();
        }
      }
    } catch (err) {
      console.warn('Error syncing ride status:', err);
    }
  };

  useEffect(() => {
    const dotTimer = setInterval(() => setDotsCount(d => (d % 3) + 1), 500);
    const animPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])).start();
    animPulse(pulse1, 0); animPulse(pulse2, 600); animPulse(pulse3, 1200);

    // Initial check on mount in case it matched while loading
    syncRideStatus();

    // Fallback Polling: poll every 3 seconds while searching
    const pollInterval = setInterval(() => {
      if (phaseRef.current === 'searching') {
        syncRideStatus();
      }
    }, 3000);

    // ── Socket: listen for captain acceptance ─────────────────────────────────
    const socket = getSocket();
    if (socket) {
      socket.on('connect', () => {
        console.log('📡 Socket reconnected. Checking ride status fallback...');
        syncRideStatus();
      });

      socket.on(SOCKET_EVENTS.RIDE_ACCEPTED, (data: any) => {
        clearInterval(dotTimer);
        clearInterval(pollInterval);
        const captain: CaptainInfo = {
          id: data.captain.id,
          name: data.captain.name,
          phone: data.captain.phone,
          rating: data.captain.rating,
          totalRides: 0,
          vehicle: data.captain.vehicle,
          distanceFromPickup: data.captain.distanceFromPickup,
        };
        setMatchedCaptain(captain);
        setCaptain(captain);
        setRideOtp(data.otp);
        setRideStatus('matched');
        setPhase('matched');
        Animated.parallel([
          Animated.spring(matchScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.timing(matchOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      });

      socket.on(SOCKET_EVENTS.RIDE_CANCELLED, () => {
        clearInterval(dotTimer);
        clearInterval(pollInterval);
        navigation.goBack();
      });

      socket.on(SOCKET_EVENTS.RIDE_REJECTED, (data: any) => {
        clearInterval(dotTimer);
        clearInterval(pollInterval);
        Alert.alert('No Captain Found', data.reason || 'No captains accepted your request. Please try again.');
        navigation.goBack();
      });

      socket.on(SOCKET_EVENTS.RIDE_STARTED, () => {
        clearInterval(dotTimer);
        clearInterval(pollInterval);
        navigation.replace('ActiveRide', { rideId });
      });
    }

    return () => {
      clearInterval(dotTimer);
      clearInterval(pollInterval);
      socket?.off('connect');
      socket?.off(SOCKET_EVENTS.RIDE_ACCEPTED);
      socket?.off(SOCKET_EVENTS.RIDE_CANCELLED);
      socket?.off(SOCKET_EVENTS.RIDE_REJECTED);
      socket?.off(SOCKET_EVENTS.RIDE_STARTED);
    };
  }, []);

  const handleCancel = async () => {
    await cancelRide('Cancelled by rider').catch(() => {});
    navigation.goBack();
  };

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
          {[
            { l: 'Captains nearby', v: availableCaptains > 0 ? `${availableCaptains}` : '...' },
            { l: 'Distance', v: estimatedDistance > 0 ? `${estimatedDistance} km` : '...' },
            { l: 'Est. wait', v: estimatedDuration > 0 ? `~${Math.round(estimatedDuration / 3)} min` : '...' },
          ].map((s2, i) => (
            <View key={i} style={s.statItem}>
              <Text style={s.statValue}>{s2.v}</Text>
              <Text style={s.statLabel}>{s2.l}</Text>
            </View>
          ))}
        </View>
      )}

      {phase === 'matched' && matchedCaptain && (
        <Animated.View style={[s.matchCard, { opacity: matchOpacity, transform: [{ scale: matchScale }] }]}>
          <View style={s.captainRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{matchedCaptain.name?.charAt(0) || 'C'}</Text>
            </View>
            <View style={s.captainInfo}>
              <Text style={s.captainName}>{matchedCaptain.name}</Text>
              <Text style={s.captainMeta}>⭐ {matchedCaptain.rating}</Text>
              <Text style={s.vehicleText}>
                {matchedCaptain.vehicle?.color} {matchedCaptain.vehicle?.make} {matchedCaptain.vehicle?.model}
              </Text>
            </View>
            <View style={s.etaBadge}>
              <Text style={s.etaValue}>{matchedCaptain.distanceFromPickup?.toFixed(1) || '?'}</Text>
              <Text style={s.etaUnit}>km</Text>
            </View>
          </View>
          <View style={s.plate}>
            <Text style={s.plateText}>{matchedCaptain.vehicle?.plateNumber}</Text>
          </View>
          {/* Show OTP to share with captain */}
          <View style={s.otpBox}>
            <Text style={s.otpLabel}>Share this OTP with your captain</Text>
            <Text style={s.otpValue}>{rideOtp}</Text>
          </View>
          <TouchableOpacity
            style={s.trackBtn}
            onPress={() => navigation.replace('ActiveRide', { rideId })}>
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.trackBtnGrad}>
              <Text style={s.trackBtnText}>Track Captain →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {phase === 'searching' && (
        <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
          <Text style={s.cancelText}>Cancel Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center' },
  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  header: { alignItems: 'center', paddingTop: 64, paddingHorizontal: Spacing.xl, marginBottom: Spacing['2xl'] },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, color: Colors.textPrimary, textAlign: 'center', letterSpacing: -0.5, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  pulseContainer: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginVertical: Spacing['2xl'] },
  pulseRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: Colors.primary },
  pulseCenter: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', ...Shadow.glow },
  statsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  statItem: {
    flex: 1, alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  matchCard: {
    width: width - 40, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    borderWidth: 1, borderColor: Colors.surfaceBorder, ...Shadow.card,
  },
  captainRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.white },
  captainInfo: { flex: 1 },
  captainName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  captainMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  vehicleText: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  etaBadge: { alignItems: 'center', backgroundColor: 'rgba(255,90,31,0.1)', borderRadius: BorderRadius.md, padding: Spacing.sm, minWidth: 52 },
  etaValue: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.primary },
  etaUnit: { fontSize: FontSize.xs, color: Colors.textMuted },
  plate: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.sm, paddingVertical: 6, paddingHorizontal: Spacing.md, alignSelf: 'flex-start', marginBottom: Spacing.md },
  plateText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, letterSpacing: 2 },
  otpBox: { backgroundColor: 'rgba(255,90,31,0.08)', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,90,31,0.2)' },
  otpLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  otpValue: { fontSize: 32, fontWeight: FontWeight.black, color: Colors.primary, letterSpacing: 8 },
  trackBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  trackBtnGrad: { paddingVertical: Spacing.md, alignItems: 'center' },
  trackBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.base },
  cancelBtn: { marginTop: Spacing['2xl'], paddingVertical: Spacing.md, paddingHorizontal: Spacing['2xl'] },
  cancelText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});

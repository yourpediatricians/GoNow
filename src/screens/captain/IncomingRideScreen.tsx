import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, Dimensions, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { rideService } from '../../services/ride.service';
import { useCaptainStore } from '../../store/captainStore';

const { width, height } = Dimensions.get('window');

const ACCEPTANCE_TIMEOUT = 30; // seconds

interface IncomingRideProps {
  onAccept?: () => void;
  onReject?: () => void;
}

export const IncomingRideScreen: React.FC<IncomingRideProps> = ({ onAccept, onReject }) => {
  const { incomingRequest, setIncomingRequest, setActiveRideId } = useCaptainStore();
  const requestTimeout = incomingRequest?.timeoutSec || 10;
  const [countdown, setCountdown] = useState(requestTimeout);
  const [isProcessing, setIsProcessing] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }).start();
    Animated.timing(progressAnim, { toValue: 0, duration: requestTimeout * 1000, useNativeDriver: false }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          handleReject('timeout');
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAccept = async () => {
    const rideId = incomingRequest?.id || (incomingRequest as any)?.rideId;
    if (!rideId || isProcessing) return;
    setIsProcessing(true);
    try {
      await rideService.acceptRide(rideId);
      setActiveRideId(rideId);
      setIncomingRequest(null);
      onAccept?.();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not accept ride. It may have been taken.');
      setIncomingRequest(null);
      onReject?.();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (reason = 'Captain declined') => {
    const rideId = incomingRequest?.id || (incomingRequest as any)?.rideId;
    if (!rideId || isProcessing) return;
    try {
      await rideService.rejectRide(rideId, reason);
    } catch {} finally {
      setIncomingRequest(null);
      onReject?.();
    }
  };

  const req = incomingRequest;

  useEffect(() => {
    if (req) {
      console.log('🔌 [IncomingRideScreen] Received request payload:', JSON.stringify(req, null, 2));
    }
  }, [req]);

  if (!req) return null;

  const rideIcons: Record<string, string> = { bike: '🏍️', auto: '🛺', cab: '🚗', economy: '⚡🛺' };

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
          <Text style={s.newRideLabel}>New Ride Request! {rideIcons[req.rideType] || '🏍️'}</Text>
        </View>

        {/* Progress bar */}
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
          }]} />
        </View>

        {/* Rider info */}
        <View style={s.riderRow}>
          <View style={s.riderAvatar}>
            <Text style={s.riderAvatarText}>
              {(req as any).rider?.name?.charAt(0) || 'U'}
            </Text>
          </View>
          <View style={s.riderInfo}>
            <Text style={s.riderName}>{(req as any).rider?.name || 'Rider'}</Text>
            <Text style={s.riderMeta}>⭐ {(req as any).rider?.rating || 5.0}</Text>
          </View>
          <View style={s.fareBadge}>
            <Text style={s.fareValue}>₹{req.estimatedFare}</Text>
            <Text style={s.fareLabel}>Est. fare</Text>
          </View>
        </View>

        {/* Route */}
        <View style={s.routeCard}>
          <View style={s.routeRow}>
            <View style={s.dotPickup} />
            <View style={s.routeTexts}>
              <Text style={s.routeLabel}>Pickup</Text>
              <Text style={s.routeAddr} numberOfLines={1}>{req.pickup?.address}</Text>
            </View>
          </View>
          <View style={s.routeLine} />
          <View style={s.routeRow}>
            <View style={s.dotDrop} />
            <View style={s.routeTexts}>
              <Text style={s.routeLabel}>Drop-off</Text>
              <Text style={s.routeAddr} numberOfLines={1}>{req.dropoff?.address}</Text>
            </View>
          </View>
        </View>

        {/* Metrics */}
        <View style={s.metricsRow}>
          {[
            { icon: '📏', label: `${req.estimatedDistance} km` },
            { icon: '⏱', label: `~${req.estimatedDuration} min` },
            { icon: '💰', label: `₹${req.estimatedFare}` },
          ].map((m, i) => (
            <View key={i} style={s.metric}>
              <Text style={s.metricIcon}>{m.icon}</Text>
              <Text style={s.metricValue}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={s.btnRow}>
          <TouchableOpacity
            style={s.rejectBtn}
            onPress={() => handleReject()}
            disabled={isProcessing}>
            <Text style={s.rejectText}>✕ Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.acceptBtn}
            onPress={handleAccept}
            disabled={isProcessing}>
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.acceptGrad}>
              <Text style={s.acceptText}>
                {isProcessing ? 'Accepting...' : '✓ Accept Ride'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', zIndex: 999 },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingBottom: 36 },
  timerSection: { alignItems: 'center', marginBottom: Spacing.md },
  timerRing: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', marginBottom: Spacing.sm, ...Shadow.glow },
  timerGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timerValue: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, color: Colors.white },
  timerUnit: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  newRideLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  progressTrack: { height: 4, backgroundColor: Colors.surfaceElevated, borderRadius: 2, marginBottom: Spacing.xl },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  riderAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  riderAvatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.white },
  riderInfo: { flex: 1 },
  riderName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  riderMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  fareBadge: { alignItems: 'center', backgroundColor: 'rgba(255,90,31,0.1)', borderRadius: BorderRadius.md, padding: Spacing.sm },
  fareValue: { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.primary },
  fareLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  routeCard: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dotPickup: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  dotDrop: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.error },
  routeLine: { width: 2, height: 16, backgroundColor: Colors.surfaceBorder, marginLeft: 4, marginVertical: 2 },
  routeTexts: { flex: 1 },
  routeLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  routeAddr: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  metricsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  metric: { flex: 1, alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.sm },
  metricIcon: { fontSize: 16, marginBottom: 2 },
  metricValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  btnRow: { flexDirection: 'row', gap: Spacing.md },
  rejectBtn: {
    flex: 1, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md,
    alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  rejectText: { color: Colors.error, fontWeight: FontWeight.bold, fontSize: FontSize.base },
  acceptBtn: { flex: 2, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  acceptGrad: { paddingVertical: Spacing.md, alignItems: 'center' },
  acceptText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.base },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a0a0a0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e2e2e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d0d' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const MOCK_CAPTAIN = {
  name: 'Rajesh Kumar',
  rating: 4.9,
  totalRides: 2840,
  vehicle: { type: 'bike', make: 'Honda', model: 'Activa 6G', color: 'Black', plateNumber: 'KA 05 AB 1234' },
  eta: 3,
};

const ROUTE_COORDS = [
  { latitude: 12.9620, longitude: 77.5850 },
  { latitude: 12.9650, longitude: 77.5880 },
  { latitude: 12.9680, longitude: 77.5900 },
  { latitude: 12.9710, longitude: 77.5930 },
  { latitude: 12.9716, longitude: 77.5946 },
];

export const ActiveRideScreen: React.FC = () => {
  const [status, setStatus] = useState<'arriving' | 'in_progress' | 'completed'>('arriving');
  const [eta, setEta] = useState(MOCK_CAPTAIN.eta);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, tension: 60, friction: 10, useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();

    const etaTimer = setInterval(() => {
      setEta(e => {
        if (e <= 1) {
          clearInterval(etaTimer);
          setStatus('in_progress');
          return 0;
        }
        return e - 1;
      });
    }, 3000);

    return () => clearInterval(etaTimer);
  }, []);

  const STATUS_CONFIG = {
    arriving: { label: 'Captain is arriving', color: Colors.warning, emoji: '🏍️' },
    in_progress: { label: 'Ride in progress', color: Colors.success, emoji: '🚀' },
    completed: { label: 'Arrived at destination', color: Colors.primary, emoji: '✅' },
  };

  const config = STATUS_CONFIG[status];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={{
          latitude: 12.9668,
          longitude: 77.5898,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}>
        {/* Route */}
        <Polyline
          coordinates={ROUTE_COORDS}
          strokeColor={Colors.primary}
          strokeWidth={4}
          lineDashPattern={[0]}
        />
        {/* Pickup */}
        <Marker coordinate={ROUTE_COORDS[0]}>
          <View style={styles.pickupPin}>
            <Text style={{ fontSize: 20 }}>📍</Text>
          </View>
        </Marker>
        {/* Captain */}
        <Marker coordinate={ROUTE_COORDS[2]}>
          <Animated.View style={[styles.captainPin, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.captainPinGrad}>
              <Text style={{ fontSize: 16 }}>🏍️</Text>
            </LinearGradient>
          </Animated.View>
        </Marker>
        {/* Dropoff */}
        <Marker coordinate={ROUTE_COORDS[4]}>
          <View style={styles.dropPin}>
            <Text style={{ fontSize: 20 }}>🏁</Text>
          </View>
        </Marker>
      </MapView>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
        <Text style={styles.statusText}>{config.label}</Text>
        {status === 'arriving' && (
          <Text style={styles.etaText}>{eta} min</Text>
        )}
      </View>

      {/* OTP Card */}
      {status === 'arriving' && (
        <View style={styles.otpCard}>
          <Text style={styles.otpLabel}>Share OTP with captain</Text>
          <Text style={styles.otpValue}>4829</Text>
        </View>
      )}

      {/* Bottom Panel */}
      <Animated.View style={[styles.bottomPanel, { transform: [{ translateY: slideAnim }] }]}>
        {/* Captain info */}
        <View style={styles.captainRow}>
          <View style={styles.captainAvatar}>
            <Text style={styles.captainAvatarText}>R</Text>
          </View>
          <View style={styles.captainInfo}>
            <Text style={styles.captainName}>{MOCK_CAPTAIN.name}</Text>
            <View style={styles.captainMeta}>
              <Text style={styles.captainRating}>⭐ {MOCK_CAPTAIN.rating}</Text>
              <Text style={styles.captainRides}> · {MOCK_CAPTAIN.totalRides} rides</Text>
            </View>
            <Text style={styles.vehicleInfo}>
              {MOCK_CAPTAIN.vehicle.color} {MOCK_CAPTAIN.vehicle.make} {MOCK_CAPTAIN.vehicle.model}
            </Text>
          </View>
          <View style={styles.captainActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>💬</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plate */}
        <View style={styles.plateBadge}>
          <Text style={styles.plateText}>{MOCK_CAPTAIN.vehicle.plateNumber}</Text>
        </View>

        {/* Trip info */}
        <View style={styles.tripRow}>
          {[
            { label: 'Distance', value: '4.2 km' },
            { label: 'Duration', value: '18 min' },
            { label: 'Fare', value: '₹85' },
          ].map((item, i) => (
            <View key={i} style={styles.tripItem}>
              <Text style={styles.tripValue}>{item.value}</Text>
              <Text style={styles.tripLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Emergency */}
        <TouchableOpacity style={styles.sosBtn}>
          <Text style={styles.sosBtnText}>🆘 Emergency SOS</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { ...StyleSheet.absoluteFillObject },
  statusBar: {
    position: 'absolute',
    top: 54,
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    ...Shadow.md,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  etaText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  otpCard: {
    position: 'absolute',
    top: 110,
    right: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  otpLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  otpValue: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, color: Colors.primary, letterSpacing: 4 },
  pickupPin: { alignItems: 'center' },
  captainPin: { alignItems: 'center' },
  captainPinGrad: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  dropPin: { alignItems: 'center' },
  bottomPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    ...Shadow.lg,
  },
  captainRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  captainAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  captainAvatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.white },
  captainInfo: { flex: 1 },
  captainName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  captainMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  captainRating: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: FontWeight.semiBold },
  captainRides: { fontSize: FontSize.sm, color: Colors.textMuted },
  vehicleInfo: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  captainActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  actionBtnText: { fontSize: 18 },
  plateBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    paddingVertical: 6, paddingHorizontal: Spacing.lg,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.lg,
  },
  plateText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, letterSpacing: 2 },
  tripRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  tripItem: { flex: 1, alignItems: 'center' },
  tripValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  tripLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  sosBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1, borderColor: Colors.error,
  },
  sosBtnText: { color: Colors.error, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
});

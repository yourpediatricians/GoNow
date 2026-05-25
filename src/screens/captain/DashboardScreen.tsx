import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Dimensions,
  Alert,
  TextInput,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useCaptainStore } from '../../store/captainStore';
import { useAuthStore } from '../../store/authStore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { getSocket, SOCKET_EVENTS, emitLocationUpdate } from '../../services/socket.service';
import Geolocation from '@react-native-community/geolocation';
import { RideRequest } from '../../types';
import { IncomingRideScreen } from './IncomingRideScreen';
import { rideService } from '../../services/ride.service';

const { width } = Dimensions.get('window');

const RECENT_RIDES = [
  { id: '1', from: 'Koramangala', to: 'MG Road', fare: 85, time: '9:15 AM', duration: '14 min', type: '🏍️' },
  { id: '2', from: 'HSR Layout', to: 'Silk Board', fare: 110, time: '8:00 AM', duration: '20 min', type: '🏍️' },
  { id: '3', from: 'BTM Layout', to: 'Jayanagar', fare: 70, time: '7:20 AM', duration: '12 min', type: '🏍️' },
];

export const CaptainDashboardScreen: React.FC = () => {
  const {
    isOnline, toggleOnline, fetchEarnings,
    todayEarnings, todayRides, weeklyEarnings,
    incomingRequest, setIncomingRequest, isLoading,
    activeRideId, setActiveRideId, acceptanceRate,
  } = useCaptainStore();
  const { user } = useAuthStore();

  const [activeRideDetails, setActiveRideDetails] = useState<any>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isRideActionLoading, setIsRideActionLoading] = useState(false);

  const maxEarning = weeklyEarnings.length
    ? Math.max(...weeklyEarnings.map(d => d.amount), 1)
    : 1;

  // Fetch active ride details
  const fetchActiveRide = async () => {
    if (!activeRideId) return;
    try {
      const res = await rideService.getRideById(activeRideId);
      if (res.success && res.data) {
        setActiveRideDetails(res.data.ride);
      }
    } catch (err) {
      console.error('Error fetching active ride details:', err);
    }
  };

  // Fetch earnings on mount
  useEffect(() => {
    fetchEarnings();
  }, []);

  // Fetch active ride details when activeRideId changes
  useEffect(() => {
    if (activeRideId) {
      fetchActiveRide();
    } else {
      setActiveRideDetails(null);
      setOtpCode('');
    }
  }, [activeRideId]);

  // Listen for incoming ride requests and cancellation via Socket.io
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const rideReqHandler = (data: RideRequest) => {
      setIncomingRequest(data);
    };

    const rideCancelHandler = (data: any) => {
      if (activeRideId && data.rideId === activeRideId) {
        Alert.alert('Ride Cancelled', data.reason || 'The rider has cancelled this ride.');
        setActiveRideId(null);
        setActiveRideDetails(null);
      }
    };

    const rideTimeoutHandler = (data: any) => {
      const currentReq = useCaptainStore.getState().incomingRequest;
      if (currentReq && currentReq.id === data.rideId) {
        setIncomingRequest(null);
      }
    };

    socket.on(SOCKET_EVENTS.RIDE_NEW_REQUEST, rideReqHandler);
    socket.on(SOCKET_EVENTS.RIDE_CANCELLED, rideCancelHandler);
    socket.on(SOCKET_EVENTS.RIDE_REQUEST_TIMEOUT, rideTimeoutHandler);

    return () => {
      socket.off(SOCKET_EVENTS.RIDE_NEW_REQUEST, rideReqHandler);
      socket.off(SOCKET_EVENTS.RIDE_CANCELLED, rideCancelHandler);
      socket.off(SOCKET_EVENTS.RIDE_REQUEST_TIMEOUT, rideTimeoutHandler);
    };
  }, [activeRideId]);

  // Periodic location updates when captain is online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      Geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          // Update database location
          useCaptainStore.getState().updateLocationApi(latitude, longitude);

          // Emit location to active rider if applicable
          if (activeRideId && activeRideDetails?.rider?._id) {
            emitLocationUpdate(
              latitude,
              longitude,
              activeRideId,
              activeRideDetails.rider._id
            );
          }
        },
        (error) => console.log('Location update error:', error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }, 10000); // every 10 seconds

    return () => clearInterval(interval);
  }, [isOnline, activeRideId, activeRideDetails]);

  // Request location permission at runtime (required on Android 6+)
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      // First check if already granted
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (alreadyGranted) return true;

      // Not yet granted — ask the user
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'GoNow needs your location to match you with nearby riders.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      // User previously tapped "Don't ask again" or denied — send to Settings
      Alert.alert(
        'Location Permission Required',
        'Please open Settings and enable Location permission for GoNow to go online.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              const { Linking } = require('react-native');
              Linking.openSettings();
            },
          },
        ]
      );
      return false;
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  };

  const handleToggleOnline = useCallback(async () => {
    if (isOnline) {
      toggleOnline(false).catch(err =>
        Alert.alert('Error', err?.response?.data?.message || 'Failed to go offline')
      );
      return;
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    // Helper: wraps getCurrentPosition in a Promise
    const getPosition = (highAccuracy: boolean, timeoutMs: number): Promise<{latitude: number; longitude: number}> =>
      new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: 30000 }
        );
      });

    try {
      let coords: {latitude: number; longitude: number};

      try {
        // Attempt 1: Network/WiFi location — fast, works indoors (low accuracy but good enough)
        coords = await getPosition(false, 8000);
      } catch {
        // Attempt 2: GPS — slower, needs clear sky view
        coords = await getPosition(true, 15000);
      }

      toggleOnline(true, coords.latitude, coords.longitude).catch(err =>
        Alert.alert('Error', err?.response?.data?.message || 'Failed to go online')
      );
    } catch (err) {
      console.warn('Geolocation failed both attempts:', err);
      Alert.alert(
        'Location Unavailable',
        'Could not get your location. Please make sure GPS or Wi-Fi is enabled and try again.',
        [{ text: 'OK' }]
      );
    }
  }, [isOnline]);


  const handleVerifyOtp = async () => {
    if (!activeRideId || otpCode.length < 4 || isRideActionLoading) return;
    setIsRideActionLoading(true);
    try {
      const res = await rideService.verifyRideOtp(activeRideId, otpCode);
      if (res.success) {
        Alert.alert('Ride Started', 'OTP verified! Start driving to drop-off.');
        fetchActiveRide();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Incorrect OTP. Please check with rider.');
    } finally {
      setIsRideActionLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!activeRideId || isRideActionLoading) return;
    setIsRideActionLoading(true);
    try {
      const res = await rideService.completeRide(activeRideId);
      if (res.success) {
        Alert.alert('Ride Completed', `Earning of ₹${res.data?.fare || activeRideDetails?.fare?.estimated} added!`);
        setActiveRideId(null);
        setActiveRideDetails(null);
        fetchEarnings();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to complete ride');
    } finally {
      setIsRideActionLoading(false);
    }
  };

  const handleCancelActiveRide = () => {
    Alert.alert(
      'Cancel Active Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (!activeRideId) return;
            setIsRideActionLoading(true);
            try {
              await rideService.cancelRide(activeRideId, 'Cancelled by captain');
              setActiveRideId(null);
              setActiveRideDetails(null);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel ride');
            } finally {
              setIsRideActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderActiveRidePanel = () => {
    if (!activeRideDetails) return null;

    const rider = activeRideDetails.rider || {};
    const status = activeRideDetails.status;
    const isArriving = status === 'accepted';
    const isProgress = status === 'otp_verified' || status === 'in_progress';
    const rideIcons: Record<string, string> = { bike: '🏍️', auto: '🛺', cab: '🚗' };

    return (
      <View style={styles.activeOverlay}>
        <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.85)" />
        <View style={styles.activeSheet}>
          <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.activeSheetHeader}>
            <Text style={styles.activeSheetTitle}>
              {isArriving ? '🏍️ Head to Pickup' : '🚀 Trip in Progress'}
            </Text>
            <Text style={styles.activeSheetSubtitle}>
              {isArriving ? 'Arrive at customer location and verify OTP' : 'Driving customer to destination'}
            </Text>
          </LinearGradient>

          <View style={styles.riderCard}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderAvatarText}>{rider.name?.charAt(0) || 'U'}</Text>
            </View>
            <View style={styles.riderInfo}>
              <Text style={styles.riderName}>{rider.name || 'Rider'}</Text>
              <Text style={styles.riderMeta}>⭐ {rider.rating || 5.0} · {rideIcons[activeRideDetails.rideType] || '🏍️'}</Text>
            </View>
            <TouchableOpacity
              style={styles.activeCallBtn}
              onPress={() => Alert.alert('Calling Rider', `Dialing: ${rider.phone}`)}>
              <Text style={{ fontSize: 18 }}>📞</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activeRouteCard}>
            <View style={styles.routeRow}>
              <View style={styles.dotPickup} />
              <View style={styles.routeTexts}>
                <Text style={styles.routeLabel}>Pickup Location</Text>
                <Text style={styles.routeAddr} numberOfLines={1}>{activeRideDetails.pickup?.address}</Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeRow}>
              <View style={styles.dotDrop} />
              <View style={styles.routeTexts}>
                <Text style={styles.routeLabel}>Drop-off Location</Text>
                <Text style={styles.routeAddr} numberOfLines={1}>{activeRideDetails.dropoff?.address}</Text>
              </View>
            </View>
          </View>

          <View style={styles.activeMetricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Est. Distance</Text>
              <Text style={styles.metricVal}>{activeRideDetails.distance} km</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Trip Fare</Text>
              <Text style={styles.metricVal}>₹{activeRideDetails.fare?.estimated}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Payment</Text>
              <Text style={styles.metricVal}>{activeRideDetails.paymentMethod?.toUpperCase()}</Text>
            </View>
          </View>

          {isArriving && (
            <View style={styles.otpInputSection}>
              <Text style={styles.otpInputLabel}>Ask customer for OTP to start ride</Text>
              <View style={styles.otpInputRow}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 4-Digit OTP"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={otpCode}
                  onChangeText={setOtpCode}
                />
                <TouchableOpacity
                  style={[styles.verifyButton, otpCode.length < 4 && styles.verifyButtonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={otpCode.length < 4 || isRideActionLoading}>
                  <LinearGradient
                    colors={otpCode.length < 4 ? [Colors.surfaceElevated, Colors.surfaceBorder] : [Colors.success, '#16A34A']}
                    style={styles.verifyButtonGrad}>
                    <Text style={[styles.verifyButtonText, otpCode.length < 4 && { color: Colors.textMuted }]}>
                      {isRideActionLoading ? 'Starting...' : 'Verify & Start'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isProgress && (
            <TouchableOpacity
              style={styles.completeRideBtn}
              onPress={handleCompleteRide}
              disabled={isRideActionLoading}>
              <LinearGradient
                colors={[Colors.success, '#16A34A']}
                style={styles.completeRideBtnGrad}>
                <Text style={styles.completeRideBtnText}>
                  {isRideActionLoading ? 'Completing Ride...' : '✓ Complete Ride'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isArriving && (
            <TouchableOpacity
              style={styles.cancelActiveBtn}
              onPress={handleCancelActiveRide}
              disabled={isRideActionLoading}>
              <Text style={styles.cancelActiveText}>Cancel Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Active Ride Workflow Panel overlay */}
      {renderActiveRidePanel()}

      {/* Incoming ride request overlay */}
      {incomingRequest && !activeRideId && (
        <IncomingRideScreen
          onAccept={() => {}}
          onReject={() => setIncomingRequest(null)}
        />
      )}

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
                onValueChange={handleToggleOnline}
                disabled={isLoading}
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
                <Text style={styles.earningsMetaValue}>{acceptanceRate}</Text>
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

  // Active Ride styles
  activeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end', zIndex: 1000 },
  activeSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, overflow: 'hidden' },
  activeSheetHeader: { padding: Spacing.xl, alignItems: 'center' },
  activeSheetTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.white, marginBottom: 4 },
  activeSheetSubtitle: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  riderCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, gap: Spacing.md },
  riderAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  riderAvatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.white },
  riderInfo: { flex: 1 },
  riderName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  riderMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  activeCallBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  activeRouteCard: { padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, gap: Spacing.sm },
  dotPickup: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  dotDrop: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.error },
  routeLine: { width: 2, height: 16, backgroundColor: Colors.surfaceBorder, marginLeft: 4, marginVertical: 2 },
  routeTexts: { flex: 1 },
  routeLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  routeAddr: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  activeMetricsRow: { flexDirection: 'row', padding: Spacing.xl, alignItems: 'center' },
  metricBox: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  metricVal: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  metricDivider: { width: 1, height: 28, backgroundColor: Colors.surfaceBorder },
  otpInputSection: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  otpInputLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm, textAlign: 'center', fontWeight: FontWeight.semiBold },
  otpInputRow: { flexDirection: 'row', gap: Spacing.md },
  otpInput: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.surfaceBorder, color: Colors.textPrimary, paddingHorizontal: Spacing.md, fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center', letterSpacing: 8, height: 48 },
  verifyButton: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  verifyButtonDisabled: { opacity: 0.5 },
  verifyButtonGrad: { height: 48, alignItems: 'center', justifyContent: 'center' },
  verifyButtonText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.base },
  completeRideBtn: { marginHorizontal: Spacing.xl, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  completeRideBtnGrad: { paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  completeRideBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.lg },
  cancelActiveBtn: { marginHorizontal: Spacing.xl, alignItems: 'center', paddingVertical: Spacing.md },
  cancelActiveText: { color: Colors.error, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
});

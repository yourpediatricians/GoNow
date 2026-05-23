import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import { DummyMap } from '../../components/DummyMap';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useRideStore } from '../../store/rideStore';
import { getSocket, SOCKET_EVENTS } from '../../services/socket.service';
import { rideService } from '../../services/ride.service';

const { width } = Dimensions.get('window');

export const ActiveRideScreen: React.FC<any> = ({ navigation, route }) => {
  const { rideId } = route.params || {};
  const [status, setStatus] = useState<'arriving' | 'in_progress' | 'completed'>('arriving');
  const [rideDetails, setRideDetails] = useState<any>(null);
  const [captainLocation, setCaptainLocation] = useState<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(200)).current;

  const { cancelRide } = useRideStore();

  const fetchRideDetails = async () => {
    if (!rideId) return;
    try {
      const res = await rideService.getRideById(rideId);
      if (res.success && res.data) {
        const ride = res.data.ride;
        setRideDetails(ride);

        // Update status state based on database ride status
        if (ride.status === 'otp_verified' || ride.status === 'in_progress') {
          setStatus('in_progress');
        } else if (ride.status === 'completed') {
          setStatus('completed');
          navigateToComplete(ride);
        } else if (ride.status === 'cancelled') {
          Alert.alert('Ride Cancelled', 'This ride has been cancelled.');
          navigation.navigate('Home');
        }
      }
    } catch (err) {
      console.error('Error fetching active ride details:', err);
    }
  };

  const navigateToComplete = (rideObj: any) => {
    const captainInfo = rideObj.captain || {};
    const formattedRide = {
      id: rideObj._id,
      pickup: {
        address: rideObj.pickup?.address || '',
        latitude: rideObj.pickup?.coordinates?.[1] || 0,
        longitude: rideObj.pickup?.coordinates?.[0] || 0,
      },
      dropoff: {
        address: rideObj.dropoff?.address || '',
        latitude: rideObj.dropoff?.coordinates?.[1] || 0,
        longitude: rideObj.dropoff?.coordinates?.[0] || 0,
      },
      rideType: rideObj.rideType || 'bike',
      fare: rideObj.fare?.actual || rideObj.fare?.estimated || 0,
      distance: rideObj.distance || 0,
      duration: rideObj.actualDuration || rideObj.estimatedDuration || 0,
      status: rideObj.status,
      date: rideObj.createdAt,
      captain: {
        name: captainInfo.name || 'Captain',
        rating: captainInfo.rating || 5.0,
      },
    };
    navigation.replace('RideComplete', { ride: formattedRide });
  };

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

    fetchRideDetails();

    // ── Socket event listeners ───────────────────────────────────────────────
    const socket = getSocket();
    if (socket) {
      socket.on(SOCKET_EVENTS.RIDE_STARTED, (data: any) => {
        setStatus('in_progress');
        fetchRideDetails();
      });

      socket.on(SOCKET_EVENTS.RIDE_COMPLETED, (data: any) => {
        setStatus('completed');
        // Fetch final details first, then navigate
        fetchRideDetails().then(() => {
          if (rideDetails) {
            navigateToComplete({ ...rideDetails, status: 'completed' });
          } else {
            // Fallback navigation with incoming socket data
            navigateToComplete(data.ride || { _id: rideId, status: 'completed' });
          }
        });
      });

      socket.on(SOCKET_EVENTS.RIDE_CANCELLED, (data: any) => {
        Alert.alert('Ride Cancelled', data.reason || 'The captain has cancelled this ride.');
        navigation.reset({ index: 0, routes: [{ name: 'RiderTabs' }] });
      });

      socket.on(SOCKET_EVENTS.CAPTAIN_LOCATION_UPDATE, (data: any) => {
        setCaptainLocation({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      });
    }

    return () => {
      if (socket) {
        socket.off(SOCKET_EVENTS.RIDE_STARTED);
        socket.off(SOCKET_EVENTS.RIDE_COMPLETED);
        socket.off(SOCKET_EVENTS.RIDE_CANCELLED);
        socket.off(SOCKET_EVENTS.CAPTAIN_LOCATION_UPDATE);
      }
    };
  }, [rideId]);

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelRide('Cancelled by rider');
              navigation.reset({ index: 0, routes: [{ name: 'RiderTabs' }] });
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel ride');
            }
          }
        }
      ]
    );
  };

  const STATUS_CONFIG = {
    arriving: { label: 'Captain is arriving', color: Colors.warning, emoji: '🏍️' },
    in_progress: { label: 'Ride in progress', color: Colors.success, emoji: '🚀' },
    completed: { label: 'Arrived at destination', color: Colors.primary, emoji: '✅' },
  };

  const config = STATUS_CONFIG[status];

  // Prepare UI text values
  const captain = rideDetails?.captain || {};
  const vehicle = rideDetails?.captainProfile?.vehicle || captain?.vehicle || {};
  const isBike = rideDetails?.rideType === 'bike';
  const rideEmoji = isBike ? '🏍️' : rideDetails?.rideType === 'auto' ? '🛺' : '🚗';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <DummyMap style={styles.map}>
        {/* Pickup marker */}
        <View style={[styles.pickupPin, { position: 'absolute', top: '60%', left: '20%' }]}>
          <Text style={{ fontSize: 22 }}>📍</Text>
        </View>
        {/* Captain marker */}
        <Animated.View style={[styles.captainPin, { position: 'absolute', top: '38%', left: '44%', transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.captainPinGrad}>
            <Text style={{ fontSize: 16 }}>{rideEmoji}</Text>
          </LinearGradient>
        </Animated.View>
        {/* Drop marker */}
        <View style={[styles.dropPin, { position: 'absolute', top: '20%', left: '68%' }]}>
          <Text style={{ fontSize: 22 }}>🏁</Text>
        </View>
        {/* Fake route line */}
        <View style={styles.fakeRoute} />
      </DummyMap>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
        <Text style={styles.statusText}>{config.label}</Text>
        {status === 'arriving' && (
          <Text style={styles.etaText}>~3 min</Text>
        )}
      </View>

      {/* OTP Card */}
      {status === 'arriving' && rideDetails?.otp && (
        <View style={styles.otpCard}>
          <Text style={styles.otpLabel}>Share OTP with captain</Text>
          <Text style={styles.otpValue}>{rideDetails.otp}</Text>
        </View>
      )}

      {/* Bottom Panel */}
      <Animated.View style={[styles.bottomPanel, { transform: [{ translateY: slideAnim }] }]}>
        {/* Captain info */}
        <View style={styles.captainRow}>
          <View style={styles.captainAvatar}>
            <Text style={styles.captainAvatarText}>{captain.name?.charAt(0) || 'C'}</Text>
          </View>
          <View style={styles.captainInfo}>
            <Text style={styles.captainName}>{captain.name || 'Looking for captain...'}</Text>
            <View style={styles.captainMeta}>
              <Text style={styles.captainRating}>⭐ {captain.rating || 5.0}</Text>
              <Text style={styles.captainRides}> · {captain.totalRides || 120} rides</Text>
            </View>
            <Text style={styles.vehicleInfo}>
              {vehicle.color || ''} {vehicle.make || ''} {vehicle.model || 'Vehicle'}
            </Text>
          </View>
          <View style={styles.captainActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Call Captain', `Dialing: ${captain.phone}`)}>
              <Text style={styles.actionBtnText}>📞</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Plate */}
        {vehicle.plateNumber && (
          <View style={styles.plateBadge}>
            <Text style={styles.plateText}>{vehicle.plateNumber}</Text>
          </View>
        )}

        {/* Trip info */}
        <View style={styles.tripRow}>
          {[
            { label: 'Distance', value: `${rideDetails?.distance || 0} km` },
            { label: 'Duration', value: `${rideDetails?.estimatedDuration || 0} min` },
            { label: 'Fare', value: `₹${rideDetails?.fare?.estimated || 0}` },
          ].map((item, i) => (
            <View key={i} style={styles.tripItem}>
              <Text style={styles.tripValue}>{item.value}</Text>
              <Text style={styles.tripLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Cancel/Emergency */}
        {status === 'arriving' ? (
          <TouchableOpacity style={styles.sosBtn} onPress={handleCancel}>
            <Text style={styles.sosBtnText}>Cancel Ride</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.sosBtn} onPress={() => Alert.alert('Emergency', 'SOS Alert sent to support and emergency contacts!')}>
            <Text style={styles.sosBtnText}>🆘 Emergency SOS</Text>
          </TouchableOpacity>
        )}
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
  fakeRoute: {
    position: 'absolute',
    top: '22%',
    left: '23%',
    width: '55%',
    height: 3,
    backgroundColor: Colors.primary,
    opacity: 0.6,
    borderRadius: 2,
    transform: [{ rotate: '30deg' }],
  },
});

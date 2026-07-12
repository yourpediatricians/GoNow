import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { DummyMap } from '../../components/DummyMap';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderStackParamList, RideType, PaymentMethod } from '../../types';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useRideStore } from '../../store/rideStore';

type Props = NativeStackScreenProps<RiderStackParamList, 'Booking'>;

const { height } = Dimensions.get('window');

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a0a0a0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e2e2e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d0d' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const RIDE_OPTIONS = [
  {
    id: 'bike',
    icon: '🏍️',
    label: 'Bike',
    desc: 'Fastest for solo',
    surgePrice: null,
    capacity: 1,
  },
];

const PAYMENT_METHODS = [
  { id: 'cash', icon: '💵', label: 'Cash' },
  { id: 'upi', icon: '📱', label: 'UPI' },
  { id: 'wallet', icon: '👛', label: 'Wallet  ₹240' },
];

export const BookingScreen: React.FC<Props> = ({ navigation, route }) => {
  const [selectedRide, setSelectedRide] = useState<RideType>(
    route.params?.preSelectedRide || 'bike'
  );
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [isBooking, setIsBooking] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;

  const {
    pickup, dropoff, setPickup, setDropoff, setSelectedRideType, setPaymentMethod,
    fetchEstimate, requestRide,
    estimatedFare, estimatedDistance, estimatedDuration, isSurge, availableCaptains,
    estimatedFares, estimatedDurations, availableCaptainsMap, cancellationFee,
    isLoading,
    error,
  } = useRideStore();

  // Hydrate store on mount if params are passed
  useEffect(() => {
    if (route.params?.pickup) setPickup(route.params.pickup);
    if (route.params?.dropoff) setDropoff(route.params.dropoff);
    if (route.params?.preSelectedRide) {
      setSelectedRide(route.params.preSelectedRide);
    }
  }, [route.params]);

  // Synchronize selections to the store when they change
  useEffect(() => {
    setSelectedRideType(selectedRide);
  }, [selectedRide]);

  useEffect(() => {
    setPaymentMethod(selectedPayment);
  }, [selectedPayment]);

  // Fetch estimates only when pickup or dropoff coordinates change
  useEffect(() => {
    if (pickup?.latitude && dropoff?.latitude) {
      const timer = setTimeout(() => {
        fetchEstimate().catch((err: any) => {
          const msg = err?.response?.data?.message || err?.message || 'Failed to calculate estimate';
          Alert.alert('Route Unavailable', msg);
        });
      }, 300); // 300ms debounce
      return () => clearTimeout(timer);
    }
  }, [pickup?.latitude, pickup?.longitude, dropoff?.latitude, dropoff?.longitude]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleEditLocation = (type: 'pickup' | 'dropoff') => {
    navigation.navigate('SelectLocation', { type });
  };

  const handleBook = async () => {
    if (selectedRide === 'economy') {
      navigation.navigate('EconomyBooking', { direction: 'to_metro' });
      return;
    }
    setIsBooking(true);
    try {
      // Refetch the estimate immediately to get the freshest captain availability
      await fetchEstimate();
      
      const freshCaptains = useRideStore.getState().availableCaptainsMap[selectedRide] || 0;
      if (freshCaptains === 0) {
        Alert.alert('No Captains', 'No captains available in your area. Try again in a moment.');
        setIsBooking(false);
        return;
      }

      setPaymentMethod(selectedPayment);
      const rideId = await requestRide();
      if (rideId) {
        navigation.navigate('RideSearch', { rideId });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to request ride. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const selected = RIDE_OPTIONS.find(r => r.id === selectedRide)!;
  const displayFare = estimatedFares[selectedRide];
  const displayDistance = estimatedDistance || 0;
  const displayDuration = estimatedDurations[selectedRide];

  const mapPickup = pickup ? {
    coordinates: [pickup.longitude, pickup.latitude] as [number, number],
    address: pickup.address,
  } : null;

  const mapDropoff = dropoff ? {
    coordinates: [dropoff.longitude, dropoff.latitude] as [number, number],
    address: dropoff.address,
  } : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <DummyMap
        style={styles.map}
        pickupLocation={mapPickup}
        dropoffLocation={mapDropoff}
        rideType={selectedRide}
      />

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
      {/* Route summary */}
        <View style={styles.routeCard}>
          <TouchableOpacity style={styles.routeRow} onPress={() => handleEditLocation('pickup')} activeOpacity={0.7}>
            <View style={styles.routeDotPickup} />
            <Text style={styles.routeText} numberOfLines={1}>
              {pickup?.address || 'Tap to set pickup location...'}
            </Text>
            <Text style={styles.editArrow}>✏️</Text>
          </TouchableOpacity>
          <View style={styles.routeDivider} />
          <TouchableOpacity style={styles.routeRow} onPress={() => handleEditLocation('dropoff')} activeOpacity={0.7}>
            <View style={styles.routeDotDrop} />
            <Text style={styles.routeText} numberOfLines={1}>
              {dropoff?.address || 'Loading dropoff location...'}
            </Text>
            <Text style={styles.editArrow}>✏️</Text>
          </TouchableOpacity>
          <View style={styles.routeMeta}>
            {!pickup ? (
              <Text style={[styles.routeMetaText, { color: Colors.warning, fontWeight: FontWeight.bold }]}>
                ⚠️ Please select pickup location
              </Text>
            ) : error ? (
              <Text style={[styles.routeMetaText, { color: Colors.error, fontWeight: FontWeight.bold }]}>
                ⚠️ {error}
              </Text>
            ) : (
              <>
                <Text style={styles.routeMetaText}>
                  📏 {displayDistance > 0 ? `${displayDistance} km` : 'Calculating...'}
                </Text>
                <Text style={styles.routeMetaText}>
                  ⏱ ~{displayDuration} min
                </Text>
                {availableCaptains > 0 && (
                  <Text style={styles.routeMetaText}>🚗 {availableCaptains} nearby</Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* Ride selector */}
        <Text style={styles.sectionLabel}>Choose your ride</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rideRow}>
          {RIDE_OPTIONS.filter(r => r.id !== 'cab_xl').map(ride => {
            const dynamicFare = estimatedFares[ride.id];
            const dynamicDuration = estimatedDurations[ride.id];

            return (
              <TouchableOpacity
                key={ride.id}
                style={[styles.rideCard, selectedRide === ride.id && styles.rideCardActive]}
                onPress={() => {
                  setSelectedRide(ride.id as RideType);
                  setSelectedRideType(ride.id as RideType);
                }}>
                {selectedRide === ride.id && (
                  <LinearGradient
                    colors={['rgba(255,90,31,0.15)', 'rgba(255,90,31,0.05)']}
                    style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.md }]}
                  />
                )}
                <Text style={styles.rideIcon}>{ride.icon}</Text>
                <Text style={[styles.rideLabel, selectedRide === ride.id && styles.rideLabelActive]}>
                  {ride.label}
                </Text>
                <Text style={styles.rideDesc}>{ride.desc}</Text>
                <View style={styles.ridePriceRow}>
                  {isSurge && selectedRide === ride.id && (
                    <Text style={styles.rideSurge}>Surge</Text>
                  )}
                  <Text style={styles.ridePrice}>
                    {isLoading ? '...' : dynamicFare ? `₹${dynamicFare}` : `₹ -`}
                  </Text>
                </View>
                <Text style={styles.rideEta}>{dynamicDuration || '-'} min</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
 
        {/* Payment selector */}
        <Text style={styles.sectionLabel}>Payment</Text>
        <View style={styles.paymentRow}>
          {PAYMENT_METHODS.map(pm => (
            <TouchableOpacity
              key={pm.id}
              style={[styles.payChip, selectedPayment === pm.id && styles.payChipActive]}
              onPress={() => {
                setSelectedPayment(pm.id as PaymentMethod);
                setPaymentMethod(pm.id as PaymentMethod);
              }}>
              <Text style={styles.payChipIcon}>{pm.icon}</Text>
              <Text style={[styles.payChipLabel, selectedPayment === pm.id && styles.payChipLabelActive]}>
                {pm.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {cancellationFee > 0 && (
          <View style={styles.cancellationWarning}>
            <Text style={styles.cancellationWarningText}>
              ⚠️ Includes ₹{cancellationFee} outstanding cancellation fee
            </Text>
          </View>
        )}

        {/* Book CTA */}
        <TouchableOpacity
          style={styles.bookBtn}
          activeOpacity={0.9}
          disabled={isBooking || isLoading || !!error || !pickup}
          onPress={handleBook}>
          <LinearGradient
            colors={(!pickup || !!error) ? [Colors.surfaceElevated, Colors.surfaceBorder] : [Colors.primaryLight, Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookBtnGrad}>
            <Text style={[styles.bookBtnText, (!pickup || !!error || isLoading) && { color: Colors.textMuted }]}>
              {isBooking ? 'Booking...' : !pickup ? 'Select Pickup Location' : !!error ? 'Route Unavailable' : isLoading ? 'Calculating...' : `Book ${selected.icon} · ₹${displayFare}`}
            </Text>
            {pickup && !error && !isLoading && <Text style={styles.bookBtnArrow}>→</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { ...StyleSheet.absoluteFillObject },
  backBtn: {
    position: 'absolute',
    top: 54,
    left: Spacing.xl,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  backBtnText: { fontSize: FontSize.xl, color: Colors.textPrimary },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingBottom: 40,
    ...Shadow.lg,
  },
  routeCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  routeDotPickup: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  routeDotDrop: { width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.textMuted },
  routeDivider: { width: 1, height: 12, backgroundColor: Colors.surfaceBorder, marginLeft: 4.5, marginVertical: 2 },
  routeText: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  routeMeta: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder },
  routeMetaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  sectionLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semiBold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: Spacing.sm },
  rideRow: { gap: Spacing.sm, marginBottom: Spacing.lg },
  rideCard: {
    width: 100,
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    gap: 2,
  },
  rideCardActive: { borderColor: Colors.primary },
  rideIcon: { fontSize: 26 },
  rideLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  rideLabelActive: { color: Colors.primary },
  rideDesc: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  ridePriceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rideSurge: { fontSize: FontSize.xs, color: Colors.textMuted, textDecorationLine: 'line-through' },
  ridePrice: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  rideEta: { fontSize: FontSize.xs, color: Colors.success },
  paymentRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  payChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  payChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,90,31,0.08)' },
  payChipIcon: { fontSize: 16 },
  payChipLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  payChipLabelActive: { color: Colors.primary },
  bookBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  bookBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.glow,
  },
  bookBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  bookBtnArrow: { fontSize: FontSize.lg, color: Colors.white },
  editArrow: { fontSize: FontSize.xs, color: Colors.textMuted, marginLeft: Spacing.sm },
  cancellationWarning: {
    backgroundColor: 'rgba(248, 177, 0, 0.1)',
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248, 177, 0, 0.3)',
  },
  cancellationWarningText: {
    color: '#F8B100',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  pickupPin: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,90,31,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  pickupDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  dropPin: { alignItems: 'center' },
});

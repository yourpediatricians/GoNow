import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderStackParamList, Location } from '../../types';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { poolService } from '../../services/pool.service';
import { rideService } from '../../services/ride.service';

type Props = NativeStackScreenProps<RiderStackParamList, 'EconomyBooking'>;

export const EconomyBookingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { direction } = route.params;
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Pre-fill locations as per wireframes (Maujpur & Dilshad Garden Metro)
  const defaultPickup = direction === 'to_metro'
    ? { name: 'Maujpur, Delhi', address: 'Maujpur Main Road, Shahdara, Delhi', latitude: 28.6891, longitude: 77.2715 }
    : { name: 'Dilshad Garden Metro', address: 'Dilshad Garden Metro Station Gate 1, Delhi', latitude: 28.6759, longitude: 77.3216 };

  const defaultDropoff = direction === 'to_metro'
    ? { name: 'Dilshad Garden Metro', address: 'Dilshad Garden Metro Station Gate 1, Delhi', latitude: 28.6759, longitude: 77.3216 }
    : { name: 'Maujpur, Delhi', address: 'Maujpur Main Road, Shahdara, Delhi', latitude: 28.6891, longitude: 77.2715 };

  const [pickup, setPickup] = useState<Location>(defaultPickup);
  const [dropoff, setDropoff] = useState<Location>(defaultDropoff);

  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [isFareLoading, setIsFareLoading] = useState(false);

  useEffect(() => {
    const fetchFareEstimate = async () => {
      if (!pickup || !dropoff) return;
      setIsFareLoading(true);
      try {
        const res = await rideService.getEstimate(
          { latitude: pickup.latitude, longitude: pickup.longitude, address: pickup.address, name: pickup.name },
          { latitude: dropoff.latitude, longitude: dropoff.longitude, address: dropoff.address, name: dropoff.name },
          'economy'
        );
        if (res.success && res.data) {
          setEstimatedFare(res.data.fare);
          setEstimatedDistance(res.data.distance);
        }
      } catch (err) {
        console.warn('Failed to fetch economy fare estimate:', err);
      } finally {
        setIsFareLoading(false);
      }
    };

    fetchFareEstimate();
  }, [pickup?.latitude, pickup?.longitude, dropoff?.latitude, dropoff?.longitude]);

  // Capture selection from SelectLocationScreen
  useEffect(() => {
    if (route.params?.selectedLocation && route.params?.type) {
      const { selectedLocation, type } = route.params;
      if (type === 'pickup') {
        setPickup(selectedLocation);
      } else if (type === 'dropoff') {
        setDropoff(selectedLocation);
      }

      // Clear the params to prevent re-applying old parameters on re-render
      navigation.setParams({
        selectedLocation: undefined,
        type: undefined,
      });
    }
  }, [route.params?.selectedLocation, route.params?.type]);

  // Generate 4 dynamic 10-minute slots starting from the next 10-minute mark
  useEffect(() => {
    const generateSlots = () => {
      const slots: string[] = [];
      const now = new Date();
      let minutes = now.getMinutes();
      // Round up to next 10 minutes
      const startMinutes = Math.ceil(minutes / 10) * 10;
      now.setMinutes(startMinutes, 0, 0);

      for (let i = 0; i < 4; i++) {
        const slotStart = new Date(now.getTime() + i * 10 * 60000);
        const slotEnd = new Date(slotStart.getTime() + 10 * 60000);

        const formatTime = (d: Date) => {
          const h = d.getHours().toString().padStart(2, '0');
          const m = d.getMinutes().toString().padStart(2, '0');
          return `${h}:${m}`;
        };

        slots.push(`${formatTime(slotStart)} - ${formatTime(slotEnd)}`);
      }
      setTimeSlots(slots);
      setSelectedSlot(slots[0]);
    };

    generateSlots();
  }, []);

  const handleBooking = async () => {
    if (!selectedSlot) {
      Alert.alert('Selection Required', 'Please choose a time slot for your ride.');
      return;
    }

    setLoading(true);
    try {
      const result = await poolService.joinPool(
        pickup,
        dropoff,
        selectedSlot,
        direction
      );
      
      const poolId = result.data.pool._id;
      navigation.replace('EconomyMatching', { poolId });

    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to join pool. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <LinearGradient colors={['#1A0800', Colors.background]} style={s.topGrad} />
      
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Economy (Shared Ride)</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Route Details Card */}
        <View style={s.card}>
          <Text style={s.cardLabel}>📍 Ride Route (Tap address to change)</Text>
          <View style={s.routeRow}>
            <View style={s.routeDots}>
              <View style={s.dotPickup} />
              <View style={s.routeLine} />
              <View style={s.dotDrop} />
            </View>
            <View style={s.routeAddresses}>
              <TouchableOpacity
                style={s.addressBlock}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('SelectLocation', {
                  type: 'pickup',
                  originScreen: 'EconomyBooking',
                  direction
                })}>
                <Text style={s.addressTitle}>Where are you coming from? ✎</Text>
                <Text style={s.addressValue} numberOfLines={1}>{pickup.name}</Text>
                <Text style={s.addressSub} numberOfLines={1}>{pickup.address}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.addressBlock}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('SelectLocation', {
                  type: 'dropoff',
                  originScreen: 'EconomyBooking',
                  direction
                })}>
                <Text style={s.addressTitle}>Where do you go? ✎</Text>
                <Text style={s.addressValue} numberOfLines={1}>{dropoff.name}</Text>
                <Text style={s.addressSub} numberOfLines={1}>{dropoff.address}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>



        {/* Fare Summary Card */}
        <View style={s.card}>
          <Text style={s.cardLabel}>💰 Fare Summary</Text>
          <View style={s.fareRow}>
            <View>
              <Text style={s.fareTitle}>Economy Shared Fare</Text>
              <Text style={s.fareDesc}>
                {isFareLoading ? 'Calculating distance...' : `Shared ride · ${estimatedDistance ? estimatedDistance.toFixed(1) + ' km' : 'Connecting...'}`}
              </Text>
            </View>
            <Text style={s.fareValue}>
              {isFareLoading ? '...' : `₹${estimatedFare || 15}`}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Booking Button */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.bookingBtn}
          onPress={handleBooking}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <LinearGradient
              colors={['#FFC72C', '#F8B100']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.bookingBtnGrad}>
              <Text style={s.bookingBtnText}>Find My Shared Ride ➔</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.textPrimary },
  content: { padding: Spacing.xl, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadow.sm,
  },
  cardLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  cardSubLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.md },
  routeRow: { flexDirection: 'row', gap: Spacing.md },
  routeDots: { alignItems: 'center', gap: 2, paddingVertical: 6 },
  dotPickup: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  routeLine: { width: 1, height: 80, backgroundColor: Colors.surfaceBorder },
  dotDrop: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textMuted, borderWidth: 1, borderColor: Colors.textSecondary },
  routeAddresses: { flex: 1, gap: Spacing.lg },
  addressBlock: {},
  addressTitle: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  addressValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: 2 },
  addressSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  slotButton: {
    width: '48%',
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotButtonActive: {
    borderColor: '#F8B100',
  },
  slotText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  slotTextActive: { color: '#1A0800' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  fareDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  fareValue: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.primary },
  footer: {
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  bookingBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  bookingBtnGrad: { paddingVertical: Spacing.md, alignItems: 'center' },
  bookingBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.base },
});

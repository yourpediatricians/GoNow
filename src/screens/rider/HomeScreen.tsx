import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { DummyMap } from '../../components/DummyMap';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useRideStore } from '../../store/rideStore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';

type Props = NativeStackScreenProps<RiderStackParamList, 'RiderTabs'> & { navigation: any };

const { width, height } = Dimensions.get('window');

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a0a0a0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e2e2e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d0d' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const QUICK_DESTINATIONS = [
  { id: '1', icon: '🏠', label: 'Home', address: 'Koramangala, Bengaluru' },
  { id: '2', icon: '💼', label: 'Office', address: 'Whitefield, Bengaluru' },
  { id: '3', icon: '🛒', label: 'Mall', address: 'Phoenix Mall, Whitefield' },
  { id: '4', icon: '✈️', label: 'Airport', address: 'KIAL, Devanahalli' },
];

const RIDE_TYPES = [
  { id: 'bike', icon: '🏍️', label: 'Bike', price: '₹25', eta: '2 min' },
  { id: 'auto', icon: '🛺', label: 'Auto', price: '₹60', eta: '4 min' },
  { id: 'cab', icon: '🚗', label: 'Cab', price: '₹120', eta: '7 min' },
];

export const RiderHomeScreen: React.FC<any> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { setPickup, setDropoff } = useRideStore();
  const [selectedRide, setSelectedRide] = useState('bike');
  const mapRef = useRef<MapView>(null);
  const bottomSheetY = useRef(new Animated.Value(0)).current;

  const handleBook = () => {
    navigation.navigate('Booking', {
      pickup: { latitude: 12.9716, longitude: 77.5946, address: 'Koramangala 5th Block, Bengaluru', name: 'Koramangala' },
      dropoff: { latitude: 12.958, longitude: 77.585, address: 'MG Road Metro Station, Bengaluru', name: 'MG Road' },
    });
  };

  const INITIAL_REGION = {
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Map */}
      <DummyMap style={styles.map}>
        {/* Pins rendered inside dummy map */}
        <View style={[styles.myLocationPin, { position: 'absolute', top: '35%', left: '38%' }]}>
          <View style={styles.myLocationDot} />
        </View>
      </DummyMap>

      {/* Top overlay */}
      <View style={styles.topOverlay}>
        <LinearGradient
          colors={['rgba(13,13,13,0.95)', 'transparent']}
          style={styles.topGradient}
        />
        <View style={styles.topContent}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]} 👋</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0) || 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Locate me button */}
      <TouchableOpacity style={styles.locateBtn}>
        <Text style={styles.locateBtnText}>📍</Text>
      </TouchableOpacity>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {/* Where to? */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.85} onPress={handleBook}>
          <View style={styles.searchDot} />
          <Text style={styles.searchPlaceholder}>Where do you want to go?</Text>
          <View style={styles.searchArrow}>
            <Text style={styles.searchArrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Quick destinations */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}>
          {QUICK_DESTINATIONS.map(dest => (
            <TouchableOpacity key={dest.id} style={styles.quickChip}>
              <Text style={styles.quickIcon}>{dest.icon}</Text>
              <Text style={styles.quickLabel}>{dest.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Ride type selector */}
        <View style={styles.rideTypes}>
          <Text style={styles.sectionLabel}>Choose ride</Text>
          <View style={styles.rideRow}>
            {RIDE_TYPES.map(ride => (
              <TouchableOpacity
                key={ride.id}
                style={[
                  styles.rideCard,
                  selectedRide === ride.id && styles.rideCardActive,
                ]}
                onPress={() => setSelectedRide(ride.id)}>
                {selectedRide === ride.id && (
                  <LinearGradient
                    colors={['rgba(255,90,31,0.15)', 'rgba(255,90,31,0.05)']}
                    style={StyleSheet.absoluteFill}
                    borderRadius={BorderRadius.md}
                  />
                )}
                <Text style={styles.rideIcon}>{ride.icon}</Text>
                <Text
                  style={[
                    styles.rideLabel,
                    selectedRide === ride.id && styles.rideLabelActive,
                  ]}>
                  {ride.label}
                </Text>
                <Text style={styles.ridePrice}>{ride.price}</Text>
                <Text style={styles.rideEta}>{ride.eta}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Book button */}
        <TouchableOpacity style={styles.bookBtn} activeOpacity={0.9} onPress={handleBook}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookBtnGrad}>
            <Text style={styles.bookBtnText}>Book {RIDE_TYPES.find(r => r.id === selectedRide)?.icon} Now</Text>
            <Text style={styles.bookBtnArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { ...StyleSheet.absoluteFillObject },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  topContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: 54,
    paddingBottom: Spacing.md,
  },
  greeting: { fontSize: FontSize.sm, color: Colors.textSecondary },
  userName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  profileBtn: {},
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  myLocationPin: {
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,90,31,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  myLocationDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  locateBtn: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: 320,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  locateBtnText: { fontSize: 18 },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    ...Shadow.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  searchDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  searchPlaceholder: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: FontSize.base,
  },
  searchArrow: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  searchArrowText: { color: Colors.white, fontSize: FontSize.base },
  quickRow: { gap: Spacing.sm, paddingBottom: Spacing.md },
  quickChip: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  quickIcon: { fontSize: 18 },
  quickLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  rideTypes: { marginBottom: Spacing.md },
  sectionLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rideRow: { flexDirection: 'row', gap: Spacing.sm },
  rideCard: {
    flex: 1,
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
  rideIcon: { fontSize: 24 },
  rideLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary },
  rideLabelActive: { color: Colors.primary },
  ridePrice: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  rideEta: { fontSize: FontSize.xs, color: Colors.textMuted },
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
});

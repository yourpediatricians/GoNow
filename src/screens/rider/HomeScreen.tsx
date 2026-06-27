import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Animated,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { DummyMap } from '../../components/DummyMap';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useRideStore } from '../../store/rideStore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { geocodingService } from '../../services/geocoding.service';

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
  { id: '1', icon: '🏠', label: 'Home', address: 'Koramangala, Bengaluru', latitude: 12.9352, longitude: 77.6245 },
  { id: '2', icon: '💼', label: 'Office', address: 'Whitefield, Bengaluru', latitude: 12.9698, longitude: 77.7500 },
  // { id: '3', icon: '🛒', label: 'Mall', address: 'Phoenix Mall, Whitefield, Bengaluru', latitude: 12.9960, longitude: 77.6960 },
  // { id: '4', icon: '✈️', label: 'Airport', address: 'Kempegowda Int\'l Airport, Bengaluru', latitude: 13.1986, longitude: 77.7066 },
];

const SERVICES = [
  {
    id: 'bike',
    icon: '🏍️',
    title: 'Moto',
    tagline: 'Solo Ride',
    desc: 'Avoid traffic jams instantly',
    price: 'From ₹9/km',
    themeColor: '#FF5A1F',
    bgPill: 'rgba(255,90,31,0.12)',
  },
  {
    id: 'economy',
    icon: '🛺',
    title: 'E-Rickshaw',
    tagline: 'Shared Pool',
    desc: 'Eco-friendly shared ride',
    price: 'From ₹15',
    themeColor: '#F8B100',
    bgPill: 'rgba(248,177,0,0.12)',
  },
];

export const RiderHomeScreen: React.FC<any> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { pickup, setPickup, setDropoff } = useRideStore();
  const mapRef = useRef<any>(null);

  // Request location permission & get current location on mount
  useEffect(() => {
    const requestLocation = async () => {
      if (Platform.OS === 'android') {
        try {
          const alreadyGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          if (!alreadyGranted) {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              {
                title: 'Location Permission',
                message: 'GoNow needs location access to set your pickup location.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
              }
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              return;
            }
          }
        } catch (err) {
          console.warn('Location permission check error:', err);
        }
      }

      Geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const address = await geocodingService.reverseGeocode(lat, lng);
          const loc = {
            latitude: lat,
            longitude: lng,
            address,
            name: 'My Location',
          };
          setPickup(loc); // pre-fill pickup in store
        },
        (err) => console.log('Rider location error:', err),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
      );
    };

    requestLocation();
  }, []);

  const handleSearchDropoff = () => {
    navigation.navigate('SelectLocation', { type: 'dropoff' });
  };

  const handleSelectService = (serviceId: string) => {
    if (serviceId === 'economy') {
      navigation.navigate('EconomyBooking', { direction: 'to_metro' });
    } else {
      navigation.navigate('SelectLocation', {
        type: 'dropoff',
        preSelectedRide: serviceId,
      });
    }
  };

  const handleQuickDest = (dest: any) => {
    const { pickup } = useRideStore.getState();
    const activePickup = pickup || {
      latitude: 28.6719,
      longitude: 77.2781,
      address: 'Welcome Metro Station, Welcome, Delhi',
      name: 'Welcome Metro',
    };
    
    setPickup(activePickup);
    const dropoffLoc = {
      latitude: dest.latitude,
      longitude: dest.longitude,
      address: dest.address,
      name: dest.label,
    };
    setDropoff(dropoffLoc);

    navigation.navigate('Booking', {
      pickup: activePickup,
      dropoff: dropoffLoc,
    });
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
      <DummyMap
        style={styles.map}
        latitude={pickup?.latitude || undefined}
        longitude={pickup?.longitude || undefined}
      />

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
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0) || 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>



      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {/* Where to? */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.85} onPress={handleSearchDropoff}>
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
            <TouchableOpacity key={dest.id} style={styles.quickChip} onPress={() => handleQuickDest(dest)}>
              <Text style={styles.quickIcon}>{dest.icon}</Text>
              <Text style={styles.quickLabel}>{dest.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Explore Services */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionLabel}>Explore Services</Text>
          <View style={styles.servicesRow}>
            {SERVICES.map(service => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  { borderColor: service.themeColor + '33' }
                ]}
                activeOpacity={0.85}
                onPress={() => handleSelectService(service.id)}>
                <View style={[styles.serviceIconContainer, { backgroundColor: service.bgPill, borderColor: service.themeColor + '44' }]}>
                  <Text style={styles.serviceIcon}>{service.icon}</Text>
                </View>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <View style={[styles.taglineBadge, { backgroundColor: service.bgPill }]}>
                  <Text style={[styles.taglineText, { color: service.themeColor }]}>{service.tagline}</Text>
                </View>
                <Text style={styles.serviceDesc}>{service.desc}</Text>
                <View style={[styles.pricePill, { backgroundColor: service.themeColor }]}>
                  <Text style={styles.pricePillText}>{service.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>      </View>
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
    bottom: 480,
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
  searchArrowText: { color: Colors.white, fontSize: FontSize.lg },
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
  
  servicesSection: { marginBottom: Spacing.md },
  sectionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.semiBold,
    marginBottom: Spacing.sm,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  servicesRow: { flexDirection: 'row', gap: Spacing.sm },
  serviceCard: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    gap: 4,
  },
  serviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  serviceIcon: { fontSize: 22 },
  serviceTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  serviceDesc: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
    height: 24,
    marginBottom: 4,
  },
  taglineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  taglineText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  pricePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricePillText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  bannersSection: {},
  bannersRow: { gap: Spacing.md, paddingRight: Spacing.xl },
  bannerCard: {
    width: 220,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    gap: 4,
    minHeight: 80,
  },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 1 },
  bannerEmoji: { fontSize: 16 },
  bannerTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  bannerDesc: {
    fontSize: 9,
    color: Colors.textSecondary,
    zIndex: 1,
  },
  poolingSection: {
    marginVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  poolingLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.semiBold,
    marginBottom: Spacing.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  poolingCardsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  poolingCard: {
    flex: 1,
    height: 90,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    justifyContent: 'space-between',
    ...Shadow.sm,
    overflow: 'hidden',
  },
  metroCard: {
    backgroundColor: '#F8B100',
  },
  homeCard: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  poolingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    zIndex: 1,
  },
  poolingCardIcon: {
    fontSize: 20,
  },
  poolingCardTitleMetro: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.black,
    color: '#1A0800',
  },
  poolingCardTitleHome: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
  },
  poolingCardDescMetro: {
    fontSize: 11,
    color: 'rgba(26,8,0,0.8)',
    fontWeight: FontWeight.medium,
    zIndex: 1,
  },
  poolingCardDescHome: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    zIndex: 1,
  },
});

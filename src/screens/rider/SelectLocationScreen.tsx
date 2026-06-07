import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  PermissionsAndroid,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useRideStore } from '../../store/rideStore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { GOOGLE_MAPS_API_KEY } from '../../config/api.config';
import Geolocation from '@react-native-community/geolocation';
import axios from 'axios';

const RECENT_SEARCHES = [
  { id: '1', icon: '🕐', label: 'MG Road Metro', sub: 'MG Road, Bengaluru', latitude: 12.9756, longitude: 77.6068 },
  { id: '2', icon: '🕐', label: 'Whitefield', sub: 'Whitefield, Bengaluru', latitude: 12.9698, longitude: 77.7500 },
  { id: '3', icon: '🕐', label: 'Kempegowda Airport', sub: 'KIAL, Devanahalli', latitude: 13.1986, longitude: 77.7066 },
];

const POPULAR_PLACES = [
  { id: 'p1', icon: '🛍️', label: 'Phoenix Mall', sub: 'Whitefield', latitude: 12.9960, longitude: 77.6960 },
  { id: 'p2', icon: '🏥', label: 'Manipal Hospital', sub: 'Old Airport Rd', latitude: 12.9592, longitude: 77.6436 },
  { id: 'p3', icon: '🎓', label: 'IIM Bangalore', sub: 'Bannerghatta Rd', latitude: 12.8950, longitude: 77.5996 },
  { id: 'p4', icon: '🏟️', label: 'Chinnaswamy Stadium', sub: 'MG Road', latitude: 12.9784, longitude: 77.5994 },
  { id: 'p5', icon: '🌿', label: 'Lalbagh Botanical Garden', sub: 'South Bengaluru', latitude: 12.9507, longitude: 77.5848 },
  { id: 'p6', icon: '✈️', label: 'Bangalore Airport', sub: 'Devanahalli', latitude: 13.1986, longitude: 77.7066 },
];

export const SelectLocationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { setPickup, setDropoff } = useRideStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const type: 'pickup' | 'dropoff' = route.params?.type || 'dropoff';
  const preSelectedRide = route.params?.preSelectedRide;
  const placeholder = type === 'pickup' ? 'Enter pickup location...' : 'Where to? Search location...';

  // Fetch suggestions when query changes
  useEffect(() => {
    if (query.trim().length <= 1) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      searchPlaces(query);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const searchPlaces = async (text: string) => {
    setIsLoading(true);
    // If no key or placeholder, run local mock search
    if (!GOOGLE_MAPS_API_KEY) {
      const filtered = POPULAR_PLACES.filter(p =>
        p.label.toLowerCase().includes(text.toLowerCase()) ||
        p.sub.toLowerCase().includes(text.toLowerCase())
      ).map(p => ({
        id: p.id,
        label: p.label,
        sub: p.sub,
        icon: p.icon,
        latitude: p.latitude,
        longitude: p.longitude,
        isGoogle: false,
      }));
      setResults(filtered);
      setIsLoading(false);
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_API_KEY}&components=country:in`;
      const response = await axios.get(url);
      if (response.data?.status === 'OK' && response.data.predictions) {
        const mapped = response.data.predictions.map((p: any) => ({
          id: p.place_id,
          label: p.structured_formatting?.main_text || p.description,
          sub: p.structured_formatting?.secondary_text || '',
          icon: '📍',
          isGoogle: true,
        }));
        setResults(mapped);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.warn('Google Places Autocomplete error:', err);
      // fallback to local list on error
      const filtered = POPULAR_PLACES.filter(p =>
        p.label.toLowerCase().includes(text.toLowerCase())
      ).map(p => ({
        id: p.id,
        label: p.label,
        sub: p.sub,
        icon: p.icon,
        latitude: p.latitude,
        longitude: p.longitude,
        isGoogle: false,
      }));
      setResults(filtered);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlace = async (place: any) => {
    setIsLoading(true);
    let lat = place.latitude || 12.9716;
    let lng = place.longitude || 77.5946;

    if (place.isGoogle && GOOGLE_MAPS_API_KEY) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.id}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await axios.get(url);
        if (response.data?.result?.geometry?.location) {
          const loc = response.data.result.geometry.location;
          lat = loc.lat;
          lng = loc.lng;
        }
      } catch (err) {
        console.warn('Google Place Details error:', err);
      }
    }

    const selectedLoc = {
      address: `${place.label}${place.sub ? `, ${place.sub}` : ''}`,
      name: place.label,
      latitude: lat,
      longitude: lng,
    };

    setIsLoading(false);

    const originScreen = route.params?.originScreen;
    if (originScreen === 'EconomyBooking') {
      navigation.navigate('EconomyBooking', {
        selectedLocation: selectedLoc,
        type,
        direction: route.params?.direction,
      });
      return;
    }

    if (type === 'pickup') {
      setPickup(selectedLoc);
    } else {
      setDropoff(selectedLoc);
    }

    // If both are set, navigate to Booking, else just pop back
    const state = useRideStore.getState();
    if (state.pickup && state.dropoff) {
      navigation.navigate('Booking', {
        pickup: state.pickup,
        dropoff: state.dropoff,
        preSelectedRide,
      });
    } else {
      navigation.goBack();
    }
  };

  const handleCustomAddress = () => {
    const { pickup, dropoff } = useRideStore.getState();
    let lat = 12.9716;
    let lng = 77.5946;

    // Apply offset from the other point so haversineDistance is valid & not 0/NaN
    if (type === 'pickup' && dropoff) {
      lat = dropoff.latitude - 0.015;
      lng = dropoff.longitude - 0.015;
    } else if (type === 'dropoff' && pickup) {
      lat = pickup.latitude + 0.015;
      lng = pickup.longitude + 0.015;
    }

    const customLoc = {
      address: query.trim(),
      name: query.trim().split(',')[0],
      latitude: lat,
      longitude: lng,
    };

    const originScreen = route.params?.originScreen;
    if (originScreen === 'EconomyBooking') {
      navigation.navigate('EconomyBooking', {
        selectedLocation: customLoc,
        type,
        direction: route.params?.direction,
      });
      return;
    }

    if (type === 'pickup') {
      setPickup(customLoc);
    } else {
      setDropoff(customLoc);
    }

    const state = useRideStore.getState();
    if (state.pickup && state.dropoff) {
      navigation.navigate('Booking', {
        pickup: state.pickup,
        dropoff: state.dropoff,
        preSelectedRide,
      });
    } else {
      navigation.goBack();
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsLoading(true);
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
              message: 'GoNow needs your location to set the pickup spot.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Current location permission check error:', err);
      }
    }

    Geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const currentLoc = {
          address: 'Current Location (GPS)',
          name: 'My Location',
          latitude: lat,
          longitude: lng,
        };

        setIsLoading(false);

        const originScreen = route.params?.originScreen;
        if (originScreen === 'EconomyBooking') {
          navigation.navigate('EconomyBooking', {
            selectedLocation: currentLoc,
            type,
            direction: route.params?.direction,
          });
          return;
        }

        if (type === 'pickup') {
          setPickup(currentLoc);
        } else {
          setDropoff(currentLoc);
        }

        const state = useRideStore.getState();
        if (state.pickup && state.dropoff) {
          navigation.navigate('Booking', {
            pickup: state.pickup,
            dropoff: state.dropoff,
            preSelectedRide,
          });
        } else {
          navigation.goBack();
        }
      },
      (err) => {
        setIsLoading(false);
        console.warn('Geolocation current location error:', err);
        Alert.alert('GPS Error', 'Could not retrieve your location. Ensure GPS is enabled.');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={s.searchBar}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder={placeholder}
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {isLoading && <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 4 }} />}
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={s.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Use current location */}
        <TouchableOpacity style={s.currentLocationRow} onPress={handleUseCurrentLocation} activeOpacity={0.8}>
          <View style={s.currentLocationIcon}>
            <Text style={{ fontSize: 18 }}>📍</Text>
          </View>
          <View>
            <Text style={s.currentLocationTitle}>Use current location</Text>
            <Text style={s.currentLocationSub}>Detect via GPS</Text>
          </View>
        </TouchableOpacity>
        <View style={s.divider} />

        {/* Custom typed address fallback */}
        {query.trim().length > 1 && (
          <TouchableOpacity style={s.customRow} onPress={handleCustomAddress} activeOpacity={0.8}>
            <View style={s.customIcon}><Text style={{ fontSize: 20 }}>➕</Text></View>
            <View style={s.placeInfo}>
              <Text style={s.placeName}>Use typed address</Text>
              <Text style={s.placeSub} numberOfLines={1}>{query}</Text>
            </View>
            <Text style={s.arrowIcon}>→</Text>
          </TouchableOpacity>
        )}

        {/* Search results */}
        {query.trim().length > 1 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>RESULTS</Text>
            {results.length > 0 ? results.map((p, idx) => (
              <TouchableOpacity key={p.id + idx} style={s.placeRow} onPress={() => handleSelectPlace(p)} activeOpacity={0.7}>
                <View style={s.placeIcon}><Text style={{ fontSize: 20 }}>{p.icon}</Text></View>
                <View style={s.placeInfo}>
                  <Text style={s.placeName}>{p.label}</Text>
                  <Text style={s.placeSub} numberOfLines={1}>{p.sub}</Text>
                </View>
                <Text style={s.arrowIcon}>→</Text>
              </TouchableOpacity>
            )) : !isLoading && (
              <Text style={s.emptyText}>No results found. Tap "Use typed address" to select "{query}"</Text>
            )}
          </View>
        ) : (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>RECENT</Text>
              {RECENT_SEARCHES.map(r => (
                <TouchableOpacity key={r.id} style={s.placeRow} onPress={() => handleSelectPlace(r)} activeOpacity={0.7}>
                  <View style={s.placeIcon}><Text style={{ fontSize: 20 }}>{r.icon}</Text></View>
                  <View style={s.placeInfo}>
                    <Text style={s.placeName}>{r.label}</Text>
                    <Text style={s.placeSub}>{r.sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.section}>
              <Text style={s.sectionTitle}>POPULAR PLACES</Text>
              {POPULAR_PLACES.map(p => (
                <TouchableOpacity key={p.id} style={s.placeRow} onPress={() => handleSelectPlace(p)} activeOpacity={0.7}>
                  <View style={s.placeIcon}><Text style={{ fontSize: 20 }}>{p.icon}</Text></View>
                  <View style={s.placeInfo}>
                    <Text style={s.placeName}>{p.label}</Text>
                    <Text style={s.placeSub}>{p.sub}</Text>
                  </View>
                  <Text style={s.arrowIcon}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.surface, padding: Spacing.xl, paddingTop: 54, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  backBtnText: { fontSize: FontSize.xl, color: Colors.textPrimary },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, flex: 1, minHeight: 48 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: FontSize.base, color: '#FFFFFF', paddingVertical: Platform.OS === 'ios' ? 12 : 8, paddingHorizontal: 0, margin: 0 },
  clearBtn: { fontSize: 14, color: Colors.textMuted, padding: 4 },
  currentLocationRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  currentLocationIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,90,31,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,90,31,0.2)' },
  currentLocationTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semiBold, color: Colors.primary },
  currentLocationSub: { fontSize: FontSize.xs, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.surfaceBorder, marginHorizontal: Spacing.xl },
  customRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  customIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: 'rgba(34,197,94,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  section: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  sectionTitle: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semiBold, letterSpacing: 1, marginBottom: Spacing.md },
  placeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  placeIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  placeInfo: { flex: 1 },
  placeName: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  placeSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  arrowIcon: { fontSize: FontSize.base, color: Colors.textMuted },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.xl },
});

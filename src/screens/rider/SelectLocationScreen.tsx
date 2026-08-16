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
import { geocodingService } from '../../services/geocoding.service';
import { metroService, MetroStation, calculateDistanceKm, formatDistanceString } from '../../services/metro.service';

export const SelectLocationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { setPickup, setDropoff, pickup } = useRideStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // User GPS coordinates state for dynamic proximity sorting
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: pickup?.latitude || 28.6719,
    longitude: pickup?.longitude || 77.2781,
  });

  const [nearestMetros, setNearestMetros] = useState<MetroStation[]>([]);

  const type: 'pickup' | 'dropoff' = route.params?.type || 'dropoff';
  const preSelectedRide = route.params?.preSelectedRide;
  const placeholder = type === 'pickup' ? 'Enter pickup location...' : 'Where to? Search location...';

  // 1. On mount: Fetch live GPS location & calculate nearest Metro stations sorted by proximity
  useEffect(() => {
    // If store already has pickup location, use it immediately
    if (pickup?.latitude && pickup?.longitude) {
      const coords = { latitude: pickup.latitude, longitude: pickup.longitude };
      setCurrentCoords(coords);
      setNearestMetros(metroService.getNearestMetroStations(coords.latitude, coords.longitude, '', 10));
    }

    // Also request active GPS location
    fetchCurrentLocation();
  }, []);

  const fetchCurrentLocation = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (!granted) {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        }
      } catch (err) {
        console.warn('Permission error:', err);
      }
    }

    Geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCurrentCoords(coords);
        // Calculate nearest metro stations sorted from closest to farthest
        const sorted = metroService.getNearestMetroStations(coords.latitude, coords.longitude, '', 10);
        setNearestMetros(sorted);
      },
      (err) => {
        console.log('Location fetch fallback:', err);
        // Fallback calculation using currentCoords
        setNearestMetros(metroService.getNearestMetroStations(currentCoords.latitude, currentCoords.longitude, '', 10));
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
    );
  };

  // 2. Fetch suggestions when query changes
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

    // Filter matching metro stations sorted by proximity
    const matchingMetros = metroService.getNearestMetroStations(
      currentCoords.latitude,
      currentCoords.longitude,
      text,
      5
    ).map(m => ({
      id: m.id,
      label: m.name,
      sub: `${m.address} • ${m.formattedDistance}`,
      icon: '🚇',
      latitude: m.latitude,
      longitude: m.longitude,
      isGoogle: false,
    }));

    if (!GOOGLE_MAPS_API_KEY) {
      setResults(matchingMetros);
      setIsLoading(false);
      return;
    }

    try {
      // Pass location bias (location & radius) so Google Places returns nearby results first
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&location=${currentCoords.latitude},${currentCoords.longitude}&radius=10000&key=${GOOGLE_MAPS_API_KEY}&components=country:in`;
      const response = await axios.get(url);

      if (response.data?.status === 'OK' && response.data.predictions) {
        const mapped = response.data.predictions.map((p: any) => ({
          id: p.place_id,
          label: p.structured_formatting?.main_text || p.description,
          sub: p.structured_formatting?.secondary_text || '',
          icon: p.description?.toLowerCase().includes('metro') ? '🚇' : '📍',
          isGoogle: true,
        }));

        // Combine nearest matching metros at top + Google places
        const combined = [...matchingMetros, ...mapped.filter((g: any) => !matchingMetros.some(m => m.label.toLowerCase() === g.label.toLowerCase()))];
        setResults(combined);
      } else {
        setResults(matchingMetros);
      }
    } catch (err) {
      console.warn('Google Places Autocomplete error:', err);
      setResults(matchingMetros);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlace = async (place: any) => {
    setIsLoading(true);
    let lat = place.latitude || currentCoords.latitude;
    let lng = place.longitude || currentCoords.longitude;

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
      address: `${place.label}${place.sub ? `, ${place.sub.split('•')[0].trim()}` : ''}`,
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

    // If dropoff is set, navigate to Booking, else just pop back
    const state = useRideStore.getState();
    if (state.dropoff) {
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
    const { pickup: storePickup, dropoff: storeDropoff } = useRideStore.getState();
    let lat = currentCoords.latitude;
    let lng = currentCoords.longitude;

    if (type === 'pickup' && storeDropoff) {
      lat = storeDropoff.latitude - 0.015;
      lng = storeDropoff.longitude - 0.015;
    } else if (type === 'dropoff' && storePickup) {
      lat = storePickup.latitude + 0.015;
      lng = storePickup.longitude + 0.015;
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
    if (state.dropoff) {
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
    Geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = await geocodingService.reverseGeocode(lat, lng);
        const currentLoc = {
          address,
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
        if (state.dropoff) {
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

        {/* Search Results */}
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
          /* Default Suggestions: Nearest Metro Stations sorted from closest to farthest */
          <View style={s.section}>
            <View style={s.metroSectionHeader}>
              <Text style={s.sectionTitle}>🚇 NEAREST METRO STATIONS</Text>
              <Text style={s.metroBadge}>Sorted by Proximity</Text>
            </View>

            {nearestMetros.map((metro) => (
              <TouchableOpacity
                key={metro.id}
                style={s.metroCard}
                onPress={() => handleSelectPlace({
                  label: metro.name,
                  sub: metro.address,
                  latitude: metro.latitude,
                  longitude: metro.longitude,
                })}
                activeOpacity={0.75}>
                <View style={s.metroIconBox}>
                  <Text style={{ fontSize: 22 }}>🚇</Text>
                </View>
                <View style={s.placeInfo}>
                  <View style={s.metroTitleRow}>
                    <Text style={s.metroName}>{metro.name}</Text>
                    {metro.lineColor && (
                      <View style={[s.lineIndicator, { backgroundColor: metro.lineColor }]} />
                    )}
                  </View>
                  <Text style={s.placeSub} numberOfLines={1}>{metro.address}</Text>
                </View>
                <View style={s.distanceBadge}>
                  <Text style={s.distanceText}>📍 {metro.formattedDistance}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.surface, padding: Spacing.xl, paddingTop: 54, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  searchIcon: { fontSize: 16, marginRight: Spacing.xs },
  searchInput: { flex: 1, height: 48, fontSize: FontSize.md, color: Colors.textPrimary },
  clearBtn: { fontSize: 16, color: Colors.textMuted, padding: Spacing.xs },
  currentLocationRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md, backgroundColor: Colors.surface },
  currentLocationIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,90,31,0.15)', alignItems: 'center', justifyContent: 'center' },
  currentLocationTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.primary },
  currentLocationSub: { fontSize: FontSize.xs, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.surfaceBorder, marginHorizontal: Spacing.xl },
  customRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md, backgroundColor: 'rgba(255,90,31,0.05)', borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  customIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  section: { padding: Spacing.xl },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  metroSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  metroBadge: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.primary, backgroundColor: 'rgba(255,90,31,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  metroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  metroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metroName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  lineIndicator: { width: 8, height: 8, borderRadius: 4 },
  placeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, gap: Spacing.md },
  placeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  placeInfo: { flex: 1 },
  placeName: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  placeSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  distanceBadge: { backgroundColor: 'rgba(255,90,31,0.12)', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.md },
  distanceText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary },
  arrowIcon: { fontSize: 16, color: Colors.textMuted },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic', marginTop: Spacing.md },
});

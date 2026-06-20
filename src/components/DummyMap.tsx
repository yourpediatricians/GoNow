/**
 * DummyMapView — replaces react-native-maps placeholder with a real live MapView.
 * Uses react-native-maps to render a beautiful dark styled map centered around Delhi hubs
 * and supports real live Marker tracking and routing.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';

interface DummyMapProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  latitude?: number;
  longitude?: number;
  latitudeDelta?: number;
  longitudeDelta?: number;

  // Real live location tracking props
  captainLocation?: { latitude: number; longitude: number } | null;
  pickupLocation?: { coordinates: [number, number]; address: string } | null;
  dropoffLocation?: { coordinates: [number, number]; address: string } | null;
  rideType?: string;
}

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

export const DummyMap: React.FC<DummyMapProps> = ({
  style,
  children,
  latitude = 28.6759, // Delhi Dilshad Garden default coordinate
  longitude = 77.3216,
  latitudeDelta = 0.03,
  longitudeDelta = 0.03,
  captainLocation,
  pickupLocation,
  dropoffLocation,
  rideType,
}) => {
  const mapRef = useRef<MapView>(null);

  const initialRegion = {
    latitude: captainLocation?.latitude || latitude,
    longitude: captainLocation?.longitude || longitude,
    latitudeDelta,
    longitudeDelta,
  };

  useEffect(() => {
    if (mapRef.current && (pickupLocation || dropoffLocation || captainLocation)) {
      const coords: { latitude: number; longitude: number }[] = [];
      if (pickupLocation?.coordinates) {
        coords.push({
          latitude: pickupLocation.coordinates[1],
          longitude: pickupLocation.coordinates[0],
        });
      }
      if (dropoffLocation?.coordinates) {
        coords.push({
          latitude: dropoffLocation.coordinates[1],
          longitude: dropoffLocation.coordinates[0],
        });
      }
      if (captainLocation?.latitude) {
        coords.push({
          latitude: captainLocation.latitude,
          longitude: captainLocation.longitude,
        });
      }

      if (coords.length > 0) {
        // Run on next tick to ensure MapView layout has occurred
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 120, right: 80, bottom: 340, left: 80 },
            animated: true,
          });
        }, 300);
      }
    }
  }, [captainLocation, pickupLocation, dropoffLocation]);
 
  // Animate to latitude/longitude when they change and no active ride/booking coordinates are present
  useEffect(() => {
    if (mapRef.current && !pickupLocation && !dropoffLocation && !captainLocation) {
      mapRef.current.animateToRegion({
        latitude,
        longitude,
        latitudeDelta,
        longitudeDelta,
      }, 1000);
    }
  }, [latitude, longitude, pickupLocation, dropoffLocation, captainLocation]);

  const isBike = rideType === 'bike';
  const rideEmoji = isBike ? '🏍️' : rideType === 'auto' || rideType === 'economy' ? '🛺' : '🚗';

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={initialRegion}
      >
        {pickupLocation?.coordinates && (
          <Marker
            coordinate={{
              latitude: pickupLocation.coordinates[1],
              longitude: pickupLocation.coordinates[0],
            }}
            title="Pickup Location"
            description={pickupLocation.address}
          >
            <View style={styles.pickupPin}>
              <Text style={{ fontSize: 24 }}>📍</Text>
            </View>
          </Marker>
        )}

        {dropoffLocation?.coordinates && (
          <Marker
            coordinate={{
              latitude: dropoffLocation.coordinates[1],
              longitude: dropoffLocation.coordinates[0],
            }}
            title="Dropoff Location"
            description={dropoffLocation.address}
          >
            <View style={styles.dropPin}>
              <Text style={{ fontSize: 24 }}>🏁</Text>
            </View>
          </Marker>
        )}

        {captainLocation?.latitude && (
          <Marker
            coordinate={{
              latitude: captainLocation.latitude,
              longitude: captainLocation.longitude,
            }}
            title="Captain Location"
          >
            <View style={styles.captainPin}>
              <View style={styles.captainPinGrad}>
                <Text style={{ fontSize: 16 }}>{rideEmoji}</Text>
              </View>
            </View>
          </Marker>
        )}

        {pickupLocation?.coordinates && dropoffLocation?.coordinates && (
          <Polyline
            coordinates={[
              {
                latitude: pickupLocation.coordinates[1],
                longitude: pickupLocation.coordinates[0],
              },
              {
                latitude: dropoffLocation.coordinates[1],
                longitude: dropoffLocation.coordinates[0],
              },
            ]}
            strokeColor="#FF5A1F"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141414',
    overflow: 'hidden',
  },
  pickupPin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropPin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captainPin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captainPinGrad: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF5A1F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
});

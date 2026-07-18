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
  rideStatus?: 'arriving' | 'in_progress' | 'completed';
  shuttleRouteStops?: any[];
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

const decodePolyline = (encoded: string) => {
  const points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: (lat / 1e5),
      longitude: (lng / 1e5),
    });
  }
  return points;
};

import { GOOGLE_MAPS_API_KEY } from '../config/api.config';

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
  rideStatus,
  shuttleRouteStops,
}) => {
  const mapRef = useRef<MapView>(null);
  const [routeCoordinates, setRouteCoordinates] = React.useState<{ latitude: number; longitude: number }[]>([]);

  useEffect(() => {
    if (rideType === 'economy' && shuttleRouteStops && shuttleRouteStops.length > 0) {
      const points = shuttleRouteStops.map(stop => ({
        latitude: stop.location.coordinates[1],
        longitude: stop.location.coordinates[0],
      }));
      setRouteCoordinates(points);
      return;
    }

    const fetchRoute = async () => {
      let origin = '';
      let destination = '';

      if (rideStatus === 'arriving' && captainLocation?.latitude && pickupLocation?.coordinates) {
        origin = `${captainLocation.latitude},${captainLocation.longitude}`;
        destination = `${pickupLocation.coordinates[1]},${pickupLocation.coordinates[0]}`;
      } else if (rideStatus === 'in_progress' && captainLocation?.latitude && dropoffLocation?.coordinates) {
        origin = `${captainLocation.latitude},${captainLocation.longitude}`;
        destination = `${dropoffLocation.coordinates[1]},${dropoffLocation.coordinates[0]}`;
      } else if (!rideStatus && pickupLocation?.coordinates && dropoffLocation?.coordinates) {
        origin = `${pickupLocation.coordinates[1]},${pickupLocation.coordinates[0]}`;
        destination = `${dropoffLocation.coordinates[1]},${dropoffLocation.coordinates[0]}`;
      }

      if (!origin || !destination) {
        setRouteCoordinates([]);
        return;
      }

      if (!GOOGLE_MAPS_API_KEY) {
        const coords = [
          {
            latitude: parseFloat(origin.split(',')[0]),
            longitude: parseFloat(origin.split(',')[1]),
          },
          {
            latitude: parseFloat(destination.split(',')[0]),
            longitude: parseFloat(destination.split(',')[1]),
          },
        ];
        setRouteCoordinates(coords);
        return;
      }

      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK' && data.routes?.[0]?.overview_polyline?.points) {
          const points = decodePolyline(data.routes[0].overview_polyline.points);
          setRouteCoordinates(points);
        } else {
          const coords = [
            {
              latitude: parseFloat(origin.split(',')[0]),
              longitude: parseFloat(origin.split(',')[1]),
            },
            {
              latitude: parseFloat(destination.split(',')[0]),
              longitude: parseFloat(destination.split(',')[1]),
            },
          ];
          setRouteCoordinates(coords);
        }
      } catch (err) {
        console.warn('Failed to fetch route directions:', err);
      }
    };

    fetchRoute();
  }, [captainLocation?.latitude, captainLocation?.longitude, pickupLocation?.coordinates, dropoffLocation?.coordinates, rideStatus]);

  const initialRegion = {
    latitude: captainLocation?.latitude || latitude,
    longitude: captainLocation?.longitude || longitude,
    latitudeDelta,
    longitudeDelta,
  };

  useEffect(() => {
    if (mapRef.current && (pickupLocation || dropoffLocation || captainLocation)) {
      const coords: { latitude: number; longitude: number }[] = [];
      
      if (rideStatus === 'arriving') {
        if (pickupLocation?.coordinates) {
          coords.push({
            latitude: pickupLocation.coordinates[1],
            longitude: pickupLocation.coordinates[0],
          });
        }
        if (captainLocation?.latitude) {
          coords.push({
            latitude: captainLocation.latitude,
            longitude: captainLocation.longitude,
          });
        }
      } else if (rideStatus === 'in_progress') {
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
      } else {
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
  }, [captainLocation, pickupLocation, dropoffLocation, rideStatus]);
 
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
        {rideType === 'economy' && shuttleRouteStops && shuttleRouteStops.map((stop, idx) => {
          const lat = stop.location?.coordinates?.[1];
          const lng = stop.location?.coordinates?.[0];
          if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return null;

          const isPickup = pickupLocation?.coordinates && Math.abs(pickupLocation.coordinates[1] - lat) < 0.0001 && Math.abs(pickupLocation.coordinates[0] - lng) < 0.0001;
          const isDropoff = dropoffLocation?.coordinates && Math.abs(dropoffLocation.coordinates[1] - lat) < 0.0001 && Math.abs(dropoffLocation.coordinates[0] - lng) < 0.0001;
          if (isPickup || isDropoff) return null;

          return (
            <Marker
              key={stop._id || idx}
              coordinate={{ latitude: lat, longitude: lng }}
              title={stop.name}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.shuttleStopMarker}>
                <View style={styles.shuttleStopInner} />
              </View>
            </Marker>
          );
        })}

        {!pickupLocation?.coordinates && latitude && longitude && !isNaN(latitude) && !isNaN(longitude) && (
          <Marker
            coordinate={{ latitude, longitude }}
            title="My Location"
            anchor={{ x: 0.5, y: 0.5 }}
            flat
          >
            <View style={styles.userLocationMarker}>
              <View style={styles.userLocationHalo} />
              <View style={styles.userLocationDot} />
            </View>
          </Marker>
        )}

        {pickupLocation?.coordinates &&
         typeof pickupLocation.coordinates[1] === 'number' &&
         typeof pickupLocation.coordinates[0] === 'number' &&
         !isNaN(pickupLocation.coordinates[1]) &&
         !isNaN(pickupLocation.coordinates[0]) && (
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

        {dropoffLocation?.coordinates &&
         typeof dropoffLocation.coordinates[1] === 'number' &&
         typeof dropoffLocation.coordinates[0] === 'number' &&
         !isNaN(dropoffLocation.coordinates[1]) &&
         !isNaN(dropoffLocation.coordinates[0]) && (
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

        {captainLocation?.latitude &&
         captainLocation?.longitude &&
         !isNaN(captainLocation.latitude) &&
         !isNaN(captainLocation.longitude) && (
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

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={rideStatus === 'arriving' ? '#007AFF' : '#FF5A1F'}
            strokeWidth={5}
            lineDashPattern={!rideStatus ? [5, 5] : undefined}
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
  userLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
  },
  userLocationHalo: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.25)',
  },
  userLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 4,
  },
  shuttleStopMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 90, 31, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FF5A1F',
  },
  shuttleStopInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5A1F',
  },
});

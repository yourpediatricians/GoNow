/**
 * DummyMapView — replaces react-native-maps placeholder with a real live MapView.
 * Uses react-native-maps to render a beautiful dark styled map center around Delhi hubs.
 */
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

interface DummyMapProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  latitude?: number;
  longitude?: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
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
}) => {
  const initialRegion = {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={initialRegion}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141414',
    overflow: 'hidden',
  },
});

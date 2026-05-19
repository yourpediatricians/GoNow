/**
 * DummyMapView — replaces react-native-maps for development.
 * Shows a dark styled placeholder with a grid overlay so screens look realistic.
 */
import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '../constants/theme';

interface DummyMapProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const DummyMap: React.FC<DummyMapProps> = ({ style, children }) => (
  <View style={[styles.map, style]}>
    {/* Grid lines to mimic a map */}
    {Array.from({ length: 8 }).map((_, i) => (
      <View key={`h${i}`} style={[styles.hLine, { top: `${i * 14}%` as any }]} />
    ))}
    {Array.from({ length: 6 }).map((_, i) => (
      <View key={`v${i}`} style={[styles.vLine, { left: `${i * 20}%` as any }]} />
    ))}
    {/* Road-like stripes */}
    <View style={styles.roadH} />
    <View style={styles.roadV} />
    <View style={[styles.roadH, { top: '65%' }]} />
    <View style={[styles.roadV, { left: '70%' }]} />
    {/* Label */}
    <View style={styles.label}>
      <Text style={styles.labelText}>🗺️  Map Preview</Text>
      <Text style={styles.labelSub}>Live map needs Google Maps API key</Text>
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  map: {
    backgroundColor: '#141414',
    overflow: 'hidden',
  },
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  vLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  roadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '35%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  roadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '40%',
    width: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  label: {
    position: 'absolute',
    bottom: '45%',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 4,
  },
  labelText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '600',
  },
  labelSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.1)',
  },
});

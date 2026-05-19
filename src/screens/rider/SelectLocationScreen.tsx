import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, TextInput, FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';

const RECENT_SEARCHES = [
  { id: '1', icon: '🕐', label: 'MG Road Metro', sub: 'MG Road, Bengaluru' },
  { id: '2', icon: '🕐', label: 'Whitefield', sub: 'Whitefield, Bengaluru' },
  { id: '3', icon: '🕐', label: 'Kempegowda Airport', sub: 'KIAL, Devanahalli' },
];

const POPULAR_PLACES = [
  { id: 'p1', icon: '🛍️', label: 'Phoenix Mall', sub: 'Whitefield' },
  { id: 'p2', icon: '🏥', label: 'Manipal Hospital', sub: 'Old Airport Rd' },
  { id: 'p3', icon: '🎓', label: 'IIM Bangalore', sub: 'Bannerghatta Rd' },
  { id: 'p4', icon: '🏟️', label: 'Chinnaswamy Stadium', sub: 'MG Road' },
  { id: 'p5', icon: '🌿', label: 'Lalbagh Botanical Garden', sub: 'South Bengaluru' },
  { id: 'p6', icon: '✈️', label: 'Bangalore Airport', sub: 'Devanahalli' },
];

interface Props {
  onSelect?: (place: { address: string; name: string; latitude: number; longitude: number }) => void;
  onBack?: () => void;
  placeholder?: string;
}

export const SelectLocationScreen: React.FC<Props> = ({ onSelect, onBack, placeholder = 'Search for a location...' }) => {
  const [query, setQuery] = useState('');
  const filtered = query.length > 1
    ? POPULAR_PLACES.filter(p => p.label.toLowerCase().includes(query.toLowerCase()) || p.sub.toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleSelect = (name: string, sub: string) => {
    onSelect?.({ address: `${name}, ${sub}`, name, latitude: 12.9716, longitude: 77.5946 });
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
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
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={s.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Use current location */}
        <TouchableOpacity style={s.currentLocationRow} onPress={() => handleSelect('Current Location', 'GPS')}>
          <View style={s.currentLocationIcon}>
            <Text style={{ fontSize: 18 }}>📍</Text>
          </View>
          <View>
            <Text style={s.currentLocationTitle}>Use current location</Text>
            <Text style={s.currentLocationSub}>Detect via GPS</Text>
          </View>
        </TouchableOpacity>
        <View style={s.divider} />

        {/* Search results */}
        {query.length > 1 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>RESULTS</Text>
            {filtered.length > 0 ? filtered.map(p => (
              <TouchableOpacity key={p.id} style={s.placeRow} onPress={() => handleSelect(p.label, p.sub)}>
                <View style={s.placeIcon}><Text style={{ fontSize: 20 }}>{p.icon}</Text></View>
                <View style={s.placeInfo}>
                  <Text style={s.placeName}>{p.label}</Text>
                  <Text style={s.placeSub}>{p.sub}</Text>
                </View>
                <Text style={s.arrowIcon}>→</Text>
              </TouchableOpacity>
            )) : (
              <Text style={s.emptyText}>No places found for "{query}"</Text>
            )}
          </View>
        ) : (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>RECENT</Text>
              {RECENT_SEARCHES.map(r => (
                <TouchableOpacity key={r.id} style={s.placeRow} onPress={() => handleSelect(r.label, r.sub)}>
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
                <TouchableOpacity key={p.id} style={s.placeRow} onPress={() => handleSelect(p.label, p.sub)}>
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
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: FontSize.base, color: Colors.textPrimary, paddingVertical: 4 },
  clearBtn: { fontSize: 14, color: Colors.textMuted, padding: 4 },
  currentLocationRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  currentLocationIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,90,31,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,90,31,0.2)' },
  currentLocationTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semiBold, color: Colors.primary },
  currentLocationSub: { fontSize: FontSize.xs, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.surfaceBorder, marginHorizontal: Spacing.xl },
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

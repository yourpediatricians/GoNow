import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Animated, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderStackParamList } from '../../types';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { rideService } from '../../services/ride.service';

type Props = NativeStackScreenProps<RiderStackParamList, 'RideComplete'>;
const { width } = Dimensions.get('window');

export const RideCompleteScreen: React.FC<Props> = ({ navigation, route }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [tipSelected, setTipSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkScale = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const ride = route.params.ride;
  const TIPS = [10, 20, 30, 50];

  useEffect(() => {
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleDone = async () => {
    if (rating > 0 && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await rideService.rateRide(ride._id, rating, '', tipSelected || 0);
      } catch (err) {
        console.warn('Failed to submit ride rating:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
    navigation.reset({ index: 0, routes: [{ name: 'RiderTabs' }] });
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Success animation */}
        <View style={s.successSection}>
          <LinearGradient colors={['#0D1A00', Colors.background]} style={s.successGrad} />
          <Animated.View style={[s.checkCircle, { transform: [{ scale: checkScale }] }]}>
            <LinearGradient colors={[Colors.success, '#16A34A']} style={s.checkGrad}>
              <Text style={s.checkIcon}>✓</Text>
            </LinearGradient>
          </Animated.View>
          <Text style={s.successTitle}>Ride Complete!</Text>
          <Text style={s.successSub}>You've arrived safely at your destination</Text>
        </View>

        <Animated.View style={[s.content, { opacity: fadeAnim }]}>
          {/* Trip summary */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Trip Summary</Text>
            <View style={s.routeRow}>
              <View style={s.routeDots}>
                <View style={s.dotPickup} />
                <View style={s.routeLine} />
                <View style={s.dotDrop} />
              </View>
              <View style={s.routeAddresses}>
                <Text style={s.routeAddr}>{ride.pickup.address}</Text>
                <Text style={s.routeAddr2}>{ride.dropoff.address}</Text>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.metaGrid}>
              {[
                { label: 'Distance', value: `${ride.distance} km` },
                { label: 'Duration', value: `${ride.duration} min` },
                { label: 'Ride Type', value: ride.rideType.charAt(0).toUpperCase() + ride.rideType.slice(1) },
                { label: 'Payment', value: 'UPI' },
              ].map((m, i) => (
                <View key={i} style={s.metaItem}>
                  <Text style={s.metaLabel}>{m.label}</Text>
                  <Text style={s.metaValue}>{m.value}</Text>
                </View>
              ))}
            </View>
            <View style={s.divider} />
            <View style={s.fareRow}>
              <Text style={s.fareLabel}>Total Fare</Text>
              <Text style={s.fareValue}>₹{ride.fare}</Text>
            </View>
          </View>

          {/* Rate captain */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Rate Your Experience</Text>
            {ride.captain && (
              <View style={s.captainRow}>
                <View style={s.captainAvatar}><Text style={s.captainAvatarText}>{ride.captain.name.charAt(0)}</Text></View>
                <View>
                  <Text style={s.captainName}>{ride.captain.name}</Text>
                  <Text style={s.captainSub}>Your captain today</Text>
                </View>
              </View>
            )}
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                  <Text style={[s.star, (hoverRating || rating) >= star && s.starFilled]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={s.ratingLabel}>
                {['', 'Poor 😞', 'Fair 😐', 'Good 🙂', 'Great 😊', 'Excellent 🤩'][rating]}
              </Text>
            )}
          </View>

          {/* Tip */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Add a Tip 🙏</Text>
            <Text style={s.tipSub}>Show your appreciation to your captain</Text>
            <View style={s.tipsRow}>
              {TIPS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.tipChip, tipSelected === t && s.tipChipActive]}
                  onPress={() => setTipSelected(tipSelected === t ? null : t)}>
                  <Text style={[s.tipText, tipSelected === t && s.tipTextActive]}>₹{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Done button */}
          <TouchableOpacity 
            style={[s.doneBtn, isSubmitting && { opacity: 0.6 }]} 
            onPress={handleDone} 
            disabled={isSubmitting}
            activeOpacity={0.9}>
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.doneBtnGrad}>
              <Text style={s.doneBtnText}>
                {isSubmitting ? 'Submitting Rating...' : 'Done · Back to Home'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },
  successSection: { alignItems: 'center', paddingTop: 70, paddingBottom: Spacing['2xl'] },
  successGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  checkCircle: { marginBottom: Spacing.lg },
  checkGrad: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', ...Shadow.glow },
  checkIcon: { fontSize: 40, color: Colors.white, fontWeight: FontWeight.black },
  successTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.black, color: Colors.textPrimary, marginBottom: 6 },
  successSub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  content: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.surfaceBorder },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  routeRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'stretch' },
  routeDots: { alignItems: 'center', gap: 2, paddingTop: 4 },
  dotPickup: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  routeLine: { width: 1, flex: 1, backgroundColor: Colors.surfaceBorder, minHeight: 20, marginVertical: 2 },
  dotDrop: { width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.textMuted },
  routeAddresses: { flex: 1, justifyContent: 'space-between', gap: Spacing.md },
  routeAddr: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  routeAddr2: { fontSize: FontSize.sm, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.surfaceBorder, marginVertical: Spacing.md },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  metaItem: { width: '45%' },
  metaLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2 },
  metaValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semiBold },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareLabel: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  fareValue: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, color: Colors.primary },
  captainRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  captainAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  captainAvatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.white },
  captainName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  captainSub: { fontSize: FontSize.xs, color: Colors.textMuted },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  star: { fontSize: 36, color: Colors.surfaceBorder },
  starFilled: { color: '#FFD700' },
  ratingLabel: { textAlign: 'center', fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
  tipSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.md },
  tipsRow: { flexDirection: 'row', gap: Spacing.sm },
  tipChip: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceElevated, borderWidth: 1.5, borderColor: Colors.surfaceBorder },
  tipChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(255,90,31,0.1)' },
  tipText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  tipTextActive: { color: Colors.primary },
  doneBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.sm },
  doneBtnGrad: { paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center', ...Shadow.glow },
  doneBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
});

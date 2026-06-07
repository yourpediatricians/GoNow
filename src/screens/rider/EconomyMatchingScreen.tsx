import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RiderStackParamList, CaptainInfo } from '../../types';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { getSocket } from '../../services/socket.service';
import { poolService } from '../../services/pool.service';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<RiderStackParamList, 'EconomyMatching'>;
const { width } = Dimensions.get('window');

export const EconomyMatchingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { poolId } = route.params;
  const [status, setStatus] = useState<'waiting' | 'matched' | 'started'>('waiting');
  const [ridersCount, setRidersCount] = useState<number>(1);
  const [timerStartAt, setTimerStartAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>('Waiting for others...');
  const [matchedCaptain, setMatchedCaptain] = useState<CaptainInfo | null>(null);
  const [pickupPointName, setPickupPointName] = useState<string>('');
  const [myRideId, setMyRideId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const matchScale = useRef(new Animated.Value(0)).current;
  const matchOpacity = useRef(new Animated.Value(0)).current;

  // Pulse animation for waiting status
  useEffect(() => {
    if (status === 'waiting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [status]);

  // Fetch pool details and subscribe to socket
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const result = await poolService.getPoolDetails(poolId);
        const p = result.data.pool;
        setRidersCount(p.riders.length);
        
        if (p.status === 'pending_accept') {
          setStatus('waiting');
          setCountdown('Waiting for driver to accept co-ride...');
        } else {
          setStatus(p.status);
        }

        if (p.timerStartAt) setTimerStartAt(new Date(p.timerStartAt));

        if (p.status === 'matched' || p.status === 'started') {
          setMatchedCaptain(p.captain);
          const currentUser = useAuthStore.getState().user;
          if (result.data.rides) {
            const myRide = result.data.rides.find((r: any) => r.riderId === currentUser?.id);
            if (myRide) {
              setMyRideId(myRide.rideId);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching pool details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();

    const socket = getSocket();
    if (socket) {
      socket.emit('pool:join_room', { poolId });

      socket.on('pool:updated', (data: any) => {
        setRidersCount(data.ridersCount);
        setStatus(data.status === 'pending_accept' ? 'waiting' : data.status);
        if (data.status === 'pending_accept') {
          setCountdown('Waiting for driver to accept co-ride...');
        }
        if (data.timerStartAt) {
          setTimerStartAt(new Date(data.timerStartAt));
        }
      });

      socket.on('pool:matched', (data: any) => {
        setStatus('matched');
        const currentUser = useAuthStore.getState().user;
        const myRide = data.rides.find((r: any) => r.riderId === currentUser?.id);
        if (myRide) {
          setMyRideId(myRide.rideId);
        }
        
        // Map captain info
        const cap = {
          id: data.captain.id,
          name: data.captain.name,
          phone: data.captain.phone,
          rating: data.captain.rating,
          vehicle: data.captain.vehicle,
        };
        setMatchedCaptain(cap);
        setPickupPointName(data.pickupPoint);

        Animated.parallel([
          Animated.spring(matchScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.timing(matchOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      });

      socket.on('pool:started', (data: any) => {
        setStatus('started');
        Alert.alert('Ride Started', 'Your shared e-rickshaw trip has started!', [
          {
            text: 'OK',
            onPress: () => {
              if (myRideId) {
                navigation.replace('ActiveRide', { rideId: myRideId });
              }
            }
          }
        ]);
      });

      socket.on('pool:rerouted', (data: any) => {
        console.log(`🔄 Rerouted from pool ${data.oldPoolId} to ${data.newPoolId}`);
        socket.emit('pool:join_room', { poolId: data.newPoolId });
        navigation.setParams({ poolId: data.newPoolId });
      });

      socket.on('pool:cancelled', (data: any) => {
        Alert.alert(
          'No Captains Available',
          data.reason || 'No available E-Rickshaws nearby at this time. Please try booking again.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('RiderTabs');
              }
            }
          ]
        );
      });
    }

    return () => {
      if (socket) {
        socket.off('pool:updated');
        socket.off('pool:matched');
        socket.off('pool:started');
        socket.off('pool:rerouted');
        socket.off('pool:cancelled');
      }
    };
  }, [poolId, myRideId]);

  // Wait timer countdown logic
  useEffect(() => {
    if (!timerStartAt || status !== 'waiting') return;

    const interval = setInterval(() => {
      const totalWaitMs = ridersCount === 2 ? 180000 : 120000;
      const elapsedMs = new Date().getTime() - timerStartAt.getTime();
      const remainingMs = totalWaitMs - elapsedMs;

      if (remainingMs <= 0) {
        setCountdown('Assigning Driver...');
        clearInterval(interval);
      } else {
        const secs = Math.ceil(remainingMs / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        setCountdown(`Starting in ${m}:${s.toString().padStart(2, '0')} wait`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStartAt, ridersCount, status]);

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Shared Ride?',
      'Are you sure you want to leave this shared pool?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await poolService.leavePool(poolId);
              navigation.navigate('RiderTabs');
            } catch (err) {
              Alert.alert('Error', 'Failed to leave pool.');
            }
          },
        },
      ]
    );
  };

  const getSeatColor = (index: number) => {
    return index < ridersCount ? '#F8B100' : 'rgba(255,255,255,0.06)';
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <LinearGradient colors={['#1A0800', Colors.background]} style={s.topGrad} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>
          {status === 'waiting' ? 'Matching Shared Pool...' : '🎉 Driver Assigned!'}
        </Text>
      </View>

      <View style={s.main}>
        {status === 'waiting' ? (
          <View style={s.matchingBox}>
            <Animated.View style={[s.pulseRing, { opacity: pulseAnim }]} />
            <View style={s.centerBadge}>
              <Text style={{ fontSize: 40 }}>🛺</Text>
            </View>

            <Text style={s.statusTitle}>Great! You're in a shared pool</Text>
            <Text style={s.statusDesc}>
              We are matching you with other riders going your way.
            </Text>

            {/* Seat Visualizer */}
            <View style={s.seatsRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[s.seatDot, { backgroundColor: getSeatColor(i) }]}>
                  <Text style={s.seatText}>👤</Text>
                </View>
              ))}
            </View>

            <Text style={s.seatsLabel}>
              {ridersCount} / 4 Seats Filled
            </Text>
            
            <View style={s.timerBox}>
              <Text style={s.timerText}>{countdown}</Text>
            </View>
          </View>
        ) : (
          matchedCaptain && (
            <Animated.View style={[s.matchCard, { opacity: matchOpacity, transform: [{ scale: matchScale }] }]}>
              <Text style={s.matchSuccessLabel}>POOL MATCHED</Text>
              
              <View style={s.captainRow}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{matchedCaptain.name?.charAt(0) || 'C'}</Text>
                </View>
                <View style={s.captainInfo}>
                  <Text style={s.captainName}>{matchedCaptain.name}</Text>
                  <Text style={s.captainMeta}>⭐ {matchedCaptain.rating || '4.8'}</Text>
                  <Text style={s.vehicleText}>
                    {matchedCaptain.vehicle?.color} {matchedCaptain.vehicle?.make || 'E-Rickshaw'} {matchedCaptain.vehicle?.model}
                  </Text>
                </View>
              </View>

              <View style={s.plate}>
                <Text style={s.plateText}>{matchedCaptain.vehicle?.plateNumber || 'DL 1ER 1234'}</Text>
              </View>

              <View style={s.pickupPointCard}>
                <Text style={s.pickupPointLabel}>BOARDING PICKUP POINT</Text>
                <Text style={s.pickupPointValue}>📍 {pickupPointName || 'Metro Station Gate 1'}</Text>
              </View>

              <TouchableOpacity
                style={s.trackBtn}
                onPress={() => {
                  if (myRideId) {
                    navigation.replace('ActiveRide', { rideId: myRideId });
                  } else {
                    // Fallback to fetch
                    Alert.alert('Fetching active ride details...');
                  }
                }}>
                <LinearGradient
                  colors={['#FFC72C', '#F8B100']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.trackBtnGrad}>
                  <Text style={s.trackBtnText}>Track Captain →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )
        )}
      </View>

      {status === 'waiting' && (
        <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
          <Text style={s.cancelText}>Leave Pool / Cancel Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center' },
  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  header: { paddingTop: 64, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  headerTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, color: Colors.textPrimary },
  main: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingHorizontal: Spacing.xl },
  matchingBox: { alignItems: 'center', width: '100%' },
  pulseRing: {
    position: 'absolute',
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(248,177,0,0.15)',
  },
  centerBadge: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: '#F8B100',
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.glow,
    marginBottom: Spacing.xl,
  },
  statusTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  statusDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, paddingHorizontal: Spacing.xl },
  seatsRow: { flexDirection: 'row', gap: Spacing.md, marginVertical: Spacing.xl },
  seatDot: {
    width: 48, height: 48,
    borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  seatText: { fontSize: FontSize.lg },
  seatsLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  timerBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.sm,
    paddingVertical: 6, paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  timerText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  cancelBtn: { marginVertical: Spacing['2xl'], paddingVertical: Spacing.md },
  cancelText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  
  matchCard: {
    width: width - 40,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadow.card,
  },
  matchSuccessLabel: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  captainRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F8B100', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: '#1A0800' },
  captainInfo: { flex: 1 },
  captainName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  captainMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  vehicleText: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  plate: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.sm, paddingVertical: 6, paddingHorizontal: Spacing.md, alignSelf: 'flex-start', marginBottom: Spacing.md },
  plateText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, letterSpacing: 2 },
  pickupPointCard: {
    backgroundColor: 'rgba(248,177,0,0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(248,177,0,0.2)',
  },
  pickupPointLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  pickupPointValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: 4 },
  trackBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  trackBtnGrad: { paddingVertical: Spacing.md, alignItems: 'center' },
  trackBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.base },
});

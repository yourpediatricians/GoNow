import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Dimensions,
  Alert,
  TextInput,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useCaptainStore } from '../../store/captainStore';
import { useAuthStore } from '../../store/authStore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { getSocket, connectSocket, SOCKET_EVENTS, emitLocationUpdate } from '../../services/socket.service';
import Geolocation from '@react-native-community/geolocation';
import { RideRequest } from '../../types';
import { IncomingRideScreen } from './IncomingRideScreen';
import { rideService } from '../../services/ride.service';
import { poolService } from '../../services/pool.service';
import { captainService } from '../../services/captain.service';
import { DummyMap } from '../../components/DummyMap';

const { width } = Dimensions.get('window');

export const CaptainDashboardScreen: React.FC = () => {
  const {
    isOnline, toggleOnline, fetchEarnings,
    todayEarnings, todayRides, weeklyEarnings,
    incomingRequest, setIncomingRequest, isLoading,
    activeRideId, setActiveRideId, acceptanceRate,
  } = useCaptainStore();
  const { user } = useAuthStore();

  const [activeRideDetails, setActiveRideDetails] = useState<any>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isRideActionLoading, setIsRideActionLoading] = useState(false);

  // E-Rickshaw Pool Local States
  const [incomingPoolRequest, setIncomingPoolRequest] = useState<any>(null);
  const [activePoolDetails, setActivePoolDetails] = useState<any>(null);
  const [activePoolId, setActivePoolId] = useState<string | null>(null);
  const [pendingRiderRequest, setPendingRiderRequest] = useState<any>(null);
  const [activePoolRides, setActivePoolRides] = useState<any[]>([]);
  const [verifyingRideId, setVerifyingRideId] = useState<string | null>(null);
  const [poolOtpCode, setPoolOtpCode] = useState<string>('');
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [captainLocation, setCaptainLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const formatIncomingPoolRequest = async (payload: any) => {
    if (!payload || !payload.poolId) return payload;
    try {
      const res = await poolService.getPoolDetails(payload.poolId);
      if (res.success && res.data?.pool) {
        const pool = res.data.pool;
        return {
          ...payload,
          riders: pool.riders || [],
        };
      }
    } catch (err) {
      console.warn('Error formatting incoming pool request:', err);
    }
    return payload;
  };

  const maxEarning = weeklyEarnings.length
    ? Math.max(...weeklyEarnings.map(d => d.amount), 1)
    : 1;

  // Fetch active ride details
  const fetchActiveRide = async () => {
    if (!activeRideId) return;
    try {
      const res = await rideService.getRideById(activeRideId);
      if (res.success && res.data) {
        setActiveRideDetails(res.data.ride);
      }
    } catch (err) {
      console.error('Error fetching active ride details:', err);
    }
  };

  // Fetch active pool details
  const fetchActivePool = async () => {
    try {
      const res = await poolService.getActivePool();
      if (res.success && res.data?.pool) {
        // Auto-complete pool if all rides are completed/cancelled and status is started
        if (res.data.pool.status === 'started' && res.data.rides) {
          const allCompleted = res.data.rides.every((r: any) => r.status === 'completed' || r.status === 'cancelled');
          if (allCompleted) {
            console.log('⚡ All rides completed on fetch. Auto-completing pool:', res.data.pool._id);
            try {
              await poolService.completePool(res.data.pool._id);
              setActivePoolDetails(null);
              setActivePoolId(null);
              setActivePoolRides([]);
              return null;
            } catch (completeErr) {
              console.error('Failed to auto-complete pool:', completeErr);
            }
          }
        }

        setActivePoolDetails(res.data.pool);
        setActivePoolId(res.data.pool._id);
        setActivePoolRides(res.data.rides || []);

        // Join socket room
        const socket = getSocket();
        if (socket) {
          socket.emit('pool:join_room', { poolId: res.data.pool._id });
        }
        return res.data;
      } else {
        setActivePoolDetails(null);
        setActivePoolId(null);
        setActivePoolRides([]);
        return null;
      }
    } catch (err) {
      console.error('Error fetching active pool details:', err);
      return null;
    }
  };

  // Fetch active dispatches/invitations from Redis
  const fetchActiveInvitation = async () => {
    try {
      const res = await captainService.getActiveInvitation();
      if (res.success && res.data) {
        const { type, payload } = res.data;
        if (type === 'ride') {
          console.log('📡 Recovered active standard ride dispatch:', payload);
          setIncomingRequest(payload);
        } else if (type === 'pool') {
          console.log('📡 Recovered active economy pool dispatch:', payload);
          formatIncomingPoolRequest(payload).then((formatted) => {
            setIncomingPoolRequest(formatted);
          });
        } else if (type === 'co_rider') {
          console.log('📡 Recovered active pool co-rider dispatch:', payload);
          setPendingRiderRequest(payload);
        }
      }
    } catch (err) {
      console.error('Error fetching active invitation:', err);
    }
  };

  const fetchRecentRides = async () => {
    try {
      const res = await captainService.getRideHistory(1, 5);
      if (res.success && res.data) {
        const list = res.data.history || res.data;
        if (Array.isArray(list)) {
          setRecentRides(list);
        }
      }
    } catch (err) {
      console.warn('Error fetching recent rides:', err);
    }
  };

  const getRideTypeEmoji = (type: string) => {
    switch (type) {
      case 'bike': return '🏍️';
      case 'economy': return '🛺';
      case 'auto': return '🛺';
      case 'cab': return '🚗';
      default: return '🏍️';
    }
  };

  const getRideTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Fetch earnings, active pool, and active invitations on mount
  useEffect(() => {
    fetchEarnings();
    fetchActivePool();
    fetchActiveInvitation();
    fetchRecentRides();
  }, []);

  // Fetch active ride details when activeRideId changes
  useEffect(() => {
    if (activeRideId) {
      fetchActiveRide();
    } else {
      setActiveRideDetails(null);
      setOtpCode('');
    }
  }, [activeRideId]);

  // Listen for incoming ride requests and cancellation via Socket.io
  useEffect(() => {
    let active = true;
    let socketInstance: any = null;

    const rideReqHandler = (data: RideRequest) => {
      console.log('📡 [DashboardScreen] Received ride request socket data:', JSON.stringify(data, null, 2));
      setIncomingRequest(data);
    };

    const rideCancelHandler = (data: any) => {
      if (activeRideId && data.rideId === activeRideId) {
        Alert.alert('Ride Cancelled', data.reason || 'The rider has cancelled this ride.');
        setActiveRideId(null);
        setActiveRideDetails(null);
      }
    };

    const rideTimeoutHandler = (data: any) => {
      const currentReq = useCaptainStore.getState().incomingRequest;
      if (currentReq && currentReq.id === data.rideId) {
        setIncomingRequest(null);
      }
    };

    const poolReqHandler = (data: any) => {
      formatIncomingPoolRequest(data).then((formatted) => {
        setIncomingPoolRequest(formatted);
      });
    };

    const poolCancelHandler = (data: any) => {
      if (activePoolId && data.poolId === activePoolId) {
        Alert.alert('Pool Cancelled', 'This shared pool has been cancelled.');
        setActivePoolId(null);
        setActivePoolDetails(null);
        setActivePoolRides([]);
        setVerifyingRideId(null);
        setPoolOtpCode('');
        setPendingRiderRequest(null);
      }
    };

    const poolUpdatedHandler = (data: any) => {
      if (activePoolId && data.poolId === activePoolId) {
        fetchActivePool();
      }
    };

    const addRiderReqHandler = (data: any) => {
      setPendingRiderRequest(data);
    };

    const addRiderCancelledHandler = (data: any) => {
      setPendingRiderRequest((current: any) => {
        if (current && current.poolId === data.poolId && current.rider?.id === data.riderId) {
          return null;
        }
        return current;
      });
    };

    const initSocketConnection = async () => {
      try {
        const sock = isOnline ? await connectSocket() : getSocket();
        if (!active || !sock) return;
        socketInstance = sock;

        if (isOnline && !sock.connected) {
          sock.connect();
        }

        // Re-join pool room on reconnect to prevent room membership loss
        sock.on('connect', () => {
          if (activePoolId) {
            sock.emit('pool:join_room', { poolId: activePoolId });
          }
          fetchActivePool();
          fetchActiveInvitation();
        });

        sock.on(SOCKET_EVENTS.RIDE_NEW_REQUEST, rideReqHandler);
        sock.on(SOCKET_EVENTS.RIDE_CANCELLED, rideCancelHandler);
        sock.on(SOCKET_EVENTS.RIDE_REQUEST_TIMEOUT, rideTimeoutHandler);
        sock.on('pool:new_request', poolReqHandler);
        sock.on('pool:cancelled', poolCancelHandler);
        sock.on('pool:updated', poolUpdatedHandler);
        sock.on('pool:add_rider_request', addRiderReqHandler);
        sock.on('pool:add_rider_cancelled', addRiderCancelledHandler);
      } catch (err) {
        console.warn('Socket listener init failed:', err);
      }
    };

    initSocketConnection();

    return () => {
      active = false;
      if (socketInstance) {
        socketInstance.off('connect');
        socketInstance.off(SOCKET_EVENTS.RIDE_NEW_REQUEST, rideReqHandler);
        socketInstance.off(SOCKET_EVENTS.RIDE_CANCELLED, rideCancelHandler);
        socketInstance.off(SOCKET_EVENTS.RIDE_REQUEST_TIMEOUT, rideTimeoutHandler);
        socketInstance.off('pool:new_request', poolReqHandler);
        socketInstance.off('pool:cancelled', poolCancelHandler);
        socketInstance.off('pool:updated', poolUpdatedHandler);
        socketInstance.off('pool:add_rider_request', addRiderReqHandler);
        socketInstance.off('pool:add_rider_cancelled', addRiderCancelledHandler);
      }
    };
  }, [isOnline, activeRideId, activePoolId]);

  // Periodic location updates when captain is online
  useEffect(() => {
    if (!isOnline) return;

    const updateLoc = () => {
      Geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCaptainLocation({ latitude, longitude });
          // Update database location
          useCaptainStore.getState().updateLocationApi(latitude, longitude);

          // Emit location to active rider if applicable
          if (activeRideId && activeRideDetails?.rider?._id) {
            emitLocationUpdate(
              latitude,
              longitude,
              activeRideId,
              activeRideDetails.rider._id
            );
          }

          // Emit location to active pool riders if applicable
          if (activePoolId && activePoolDetails?.riders) {
            activePoolDetails.riders.forEach((r: any) => {
              if (r.user?._id) {
                emitLocationUpdate(
                  latitude,
                  longitude,
                  activePoolId,
                  r.user._id
                );
              }
            });
          }
        },
        (error) => console.log('Location update error:', error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    updateLoc(); // Run immediately
    const interval = setInterval(updateLoc, 10000); // every 10 seconds

    return () => clearInterval(interval);
  }, [isOnline, activeRideId, activeRideDetails, activePoolId, activePoolDetails]);

  // Request location permission at runtime (required on Android 6+)
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      // First check if already granted
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (alreadyGranted) return true;

      // Not yet granted — ask the user
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'GoNow needs your location to match you with nearby riders.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      // User previously tapped "Don't ask again" or denied — send to Settings
      Alert.alert(
        'Location Permission Required',
        'Please open Settings and enable Location permission for GoNow to go online.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              const { Linking } = require('react-native');
              Linking.openSettings();
            },
          },
        ]
      );
      return false;
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  };

  const handleToggleOnline = useCallback(async () => {
    if (isOnline) {
      toggleOnline(false).catch(err =>
        Alert.alert('Error', err?.response?.data?.message || 'Failed to go offline')
      );
      return;
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    // Helper: wraps getCurrentPosition in a Promise
    const getPosition = (highAccuracy: boolean, timeoutMs: number): Promise<{latitude: number; longitude: number}> =>
      new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: 30000 }
        );
      });

    try {
      let coords: {latitude: number; longitude: number};

      try {
        // Attempt 1: Network/WiFi location — fast, works indoors (low accuracy but good enough)
        coords = await getPosition(false, 8000);
      } catch {
        // Attempt 2: GPS — slower, needs clear sky view
        coords = await getPosition(true, 15000);
      }

      // Ensure socket is connected before toggling online in DB
      const sock = await connectSocket().catch(err => {
        console.warn('Socket connection failed on toggle online:', err);
        return null;
      });

      if (sock && !sock.connected) {
        console.log('⏳ Waiting for socket to connect before going online in DB...');
        await new Promise<void>((resolve) => {
          const connectTimeout = setTimeout(() => {
            console.log('⏱️ Socket connection wait timed out.');
            resolve();
          }, 5000);

          sock.once('connect', () => {
            clearTimeout(connectTimeout);
            console.log('✅ Socket connected, proceeding to toggle online.');
            resolve();
          });
        });
      }

      toggleOnline(true, coords.latitude, coords.longitude).then(() => {
        fetchActiveInvitation();
      }).catch(err =>
        Alert.alert('Error', err?.response?.data?.message || 'Failed to go online')
      );
    } catch (err) {
      console.warn('Geolocation failed both attempts:', err);
      Alert.alert(
        'Location Unavailable',
        'Could not get your location. Please make sure GPS or Wi-Fi is enabled and try again.',
        [{ text: 'OK' }]
      );
    }
  }, [isOnline]);


  const handleVerifyOtp = async () => {
    if (!activeRideId || otpCode.length < 4 || isRideActionLoading) return;
    setIsRideActionLoading(true);
    try {
      const res = await rideService.verifyRideOtp(activeRideId, otpCode);
      if (res.success) {
        Alert.alert('Ride Started', 'OTP verified! Start driving to drop-off.');
        fetchActiveRide();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Incorrect OTP. Please check with rider.');
    } finally {
      setIsRideActionLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!activeRideId || isRideActionLoading) return;
    setIsRideActionLoading(true);
    try {
      const res = await rideService.completeRide(activeRideId);
      if (res.success) {
        Alert.alert('Ride Completed', `Earning of ₹${res.data?.fare || activeRideDetails?.fare?.estimated} added!`);
        setActiveRideId(null);
        setActiveRideDetails(null);
        fetchEarnings();
        fetchRecentRides();
      }
    } catch (err: any) {
      // Self-healing: Check if the ride was actually completed on the server
      try {
        const res = await rideService.getRideById(activeRideId);
        if (res.success && res.data && (res.data.ride?.status === 'completed' || res.data.ride?.status === 'cancelled')) {
          Alert.alert('Ride Completed', `Earning of ₹${res.data.ride.fare?.actual || activeRideDetails?.fare?.estimated} added (recovered)!`);
          setActiveRideId(null);
          setActiveRideDetails(null);
          fetchEarnings();
          fetchRecentRides();
          return;
        }
      } catch (recoveryErr) {
        console.warn('Recovery check failed in handleCompleteRide:', recoveryErr);
      }

      Alert.alert('Error', err?.response?.data?.message || 'Failed to complete ride');
    } finally {
      setIsRideActionLoading(false);
    }
  };

  const handleAcceptPool = async () => {
    if (!incomingPoolRequest) return;
    setIsRideActionLoading(true);
    try {
      const res = await poolService.acceptPool(incomingPoolRequest.poolId);
      if (res.success) {
        setIncomingPoolRequest(null);
        setActivePoolId(res.data.pool._id);
        fetchActivePool();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to accept pool.');
      setIncomingPoolRequest(null);
    } finally {
      setIsRideActionLoading(false);
    }
  };

  const handleAcceptAdditionalRider = async () => {
    if (!pendingRiderRequest) return;
    setIsRideActionLoading(true);
    try {
      const res = await poolService.acceptAdditionalRider(
        pendingRiderRequest.poolId,
        pendingRiderRequest.rider.id
      );
      if (res.success) {
        setPendingRiderRequest(null);
        fetchActivePool();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to accept co-rider.');
      setPendingRiderRequest(null);
    } finally {
      setIsRideActionLoading(false);
    }
  };

  const handleDeclineAdditionalRider = async () => {
    if (!pendingRiderRequest) return;
    setIsRideActionLoading(true);
    try {
      await poolService.declineAdditionalRider(
        pendingRiderRequest.poolId,
        pendingRiderRequest.rider.id
      );
      setPendingRiderRequest(null);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to decline co-rider.');
      setPendingRiderRequest(null);
    } finally {
      setIsRideActionLoading(false);
    }
  };

  const handleVerifyPoolRiderOtp = async (rideId: string) => {
    if (poolOtpCode.length < 4 || isRideActionLoading) return;
    setIsRideActionLoading(true);
    try {
      const res = await rideService.verifyRideOtp(rideId, poolOtpCode);
      if (res.success) {
        setVerifyingRideId(null);
        setPoolOtpCode('');
        fetchActivePool();
        Alert.alert('Success', 'Rider OTP verified successfully!');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsRideActionLoading(false);
    }
  };

  const handleStartPool = async () => {
    if (!activePoolId) return;
    setIsRideActionLoading(true);
    try {
      const res = await poolService.startPool(activePoolId);
      if (res.success) {
        fetchActivePool();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to start pool.');
    } finally {
      setIsRideActionLoading(false);
    }
  };

  const handleCompletePool = async () => {
    if (!activePoolId || isRideActionLoading) return;
    setIsRideActionLoading(true);
    const targetPoolId = activePoolId;

    // Optimistically clear states first
    setActivePoolId(null);
    setActivePoolDetails(null);
    setActivePoolRides([]);

    try {
      await poolService.completePool(targetPoolId);
      Alert.alert('Pool Completed', 'Total earnings for the pool added to your account!');
      fetchEarnings(); // refresh dashboard stats
      fetchRecentRides();
    } catch (err) {
      console.warn('Manual completePool failed, self-healing will sync:', err);
      Alert.alert('Pool Completed', 'Pool trip ended.');
      fetchEarnings();
      fetchRecentRides();
    } finally {
      setIsRideActionLoading(false);
    }
  };

  const handleCompleteRiderRide = async (rideId: string) => {
    setIsRideActionLoading(true);
    try {
      const res = await rideService.completeRide(rideId);
      if (res.success) {
        Alert.alert('Success', 'Rider\'s ride completed successfully!');
        
        // Refresh pool and check if all rides are completed
        const poolData = await fetchActivePool();
        fetchEarnings(); // refresh dashboard stats/earnings
        fetchRecentRides();
        
        if (poolData && poolData.rides) {
          const allCompleted = poolData.rides.every((r: any) => r.status === 'completed' || r.status === 'cancelled');
          if (allCompleted && poolData.pool?._id) {
            // All riders completed! Optimistically clear active pool states on the client side first
            console.log('⚡ All riders completed. Optimistically completing pool:', poolData.pool._id);
            const targetPoolId = poolData.pool._id;
            setActivePoolId(null);
            setActivePoolDetails(null);
            setActivePoolRides([]);
            Alert.alert('Pool Completed', 'All passenger rides completed! Pool trip ended.');
            
            // Trigger completePool in the background (fire-and-forget)
            poolService.completePool(targetPoolId).catch(completeErr => {
              console.warn('Background pool completion failed:', completeErr);
            });
          }
        }
      }
    } catch (err: any) {
      // Self-healing check: check if the ride is already completed/cancelled on the server
      try {
        const poolData = await fetchActivePool();
        if (poolData && poolData.rides) {
          const currentRide = poolData.rides.find((r: any) => r._id === rideId);
          if (currentRide && (currentRide.status === 'completed' || currentRide.status === 'cancelled')) {
            Alert.alert('Success', 'Rider\'s ride completed successfully (recovered)!');
            fetchEarnings(); // refresh dashboard stats/earnings
            fetchRecentRides();
            
            const allCompleted = poolData.rides.every((r: any) => r.status === 'completed' || r.status === 'cancelled');
            if (allCompleted && poolData.pool?._id) {
              console.log('⚡ All rides completed on recovery. Optimistically completing pool:', poolData.pool._id);
              const targetPoolId = poolData.pool._id;
              setActivePoolId(null);
              setActivePoolDetails(null);
              setActivePoolRides([]);
              Alert.alert('Pool Completed', 'All passenger rides completed! Pool trip ended.');
              
              // Trigger completePool in the background
              poolService.completePool(targetPoolId).catch(completeErr => {
                console.warn('Background pool completion failed on recovery:', completeErr);
              });
            }
            return; // Successful recovery!
          }
        }
      } catch (recoveryErr) {
        console.warn('Recovery check failed in handleCompleteRiderRide:', recoveryErr);
      }

      Alert.alert('Error', err?.response?.data?.message || 'Failed to complete rider\'s ride.');
      // Fallback check: refresh pool and check if all rides are completed (in case of network timeout or state mismatch)
      try {
        const poolData = await fetchActivePool();
        if (poolData && poolData.rides) {
          const allCompleted = poolData.rides.every((r: any) => r.status === 'completed' || r.status === 'cancelled');
          if (allCompleted && poolData.pool?._id) {
            console.log('⚡ All rides completed on error fallback. Optimistically completing pool:', poolData.pool._id);
            const targetPoolId = poolData.pool._id;
            setActivePoolId(null);
            setActivePoolDetails(null);
            setActivePoolRides([]);
            Alert.alert('Pool Completed', 'All passenger rides completed! Pool trip ended.');
            
            // Trigger completePool in the background
            poolService.completePool(targetPoolId).catch(completeErr => {
              console.warn('Background pool completion failed on fallback:', completeErr);
            });
          }
        }
      } catch (fallbackErr) {
        console.warn('Failed in handleCompleteRiderRide fallback:', fallbackErr);
      }
    } finally {
      setIsRideActionLoading(false);
    }
  };

  const renderIncomingPoolRequestModal = () => {
    if (!incomingPoolRequest) return null;
    return (
      <View style={styles.activeOverlay}>
        <View style={styles.activeSheet}>
          <LinearGradient colors={['#FFC72C', '#F8B100']} style={styles.activeSheetHeader}>
            <Text style={[styles.activeSheetTitle, { color: '#1A0800' }]}>🛺 New Pool Assignment</Text>
            <Text style={[styles.activeSheetSubtitle, { color: 'rgba(26,8,0,0.8)' }]}>
              {incomingPoolRequest.ridersCount} Passengers Ready for Booking
            </Text>
          </LinearGradient>

          <View style={styles.poolRequestDetails}>
            {incomingPoolRequest.riders && incomingPoolRequest.riders.length > 0 ? (
              <ScrollView style={{ maxHeight: 200, marginBottom: Spacing.xs }} showsVerticalScrollIndicator={false}>
                {incomingPoolRequest.riders.map((r: any, i: number) => (
                  <View key={i} style={{ marginBottom: Spacing.sm, paddingBottom: Spacing.xs, borderBottomWidth: i < incomingPoolRequest.riders.length - 1 ? 1 : 0, borderBottomColor: Colors.surfaceBorder }}>
                    <Text style={[styles.poolReqDetailLabel, { fontSize: 11, color: Colors.primary }]}>
                      PASSENGER {i + 1}: {r.user?.name || 'Rider'}
                    </Text>
                    <Text style={[styles.poolReqDetailLabel, { marginTop: 2, fontSize: 10 }]}>PICKUP</Text>
                    <Text style={[styles.poolReqDetailVal, { fontSize: FontSize.sm }]} numberOfLines={1}>{r.pickup?.address}</Text>
                    <Text style={[styles.poolReqDetailLabel, { marginTop: 2, fontSize: 10 }]}>DROP-OFF</Text>
                    <Text style={[styles.poolReqDetailVal, { fontSize: FontSize.sm }]} numberOfLines={1}>{r.dropoff?.address}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <>
                <Text style={styles.poolReqDetailLabel}>ROUTE</Text>
                <Text style={styles.poolReqDetailVal}>{incomingPoolRequest.route}</Text>
                
                <Text style={[styles.poolReqDetailLabel, { marginTop: Spacing.md }]}>BOARDING PICKUP POINT</Text>
                <Text style={styles.poolReqDetailVal}>{incomingPoolRequest.pickupPoint}</Text>
              </>
            )}

            <Text style={[styles.poolReqDetailLabel, { marginTop: Spacing.sm }]}>ESTIMATED EARNINGS</Text>
            <Text style={[styles.poolReqDetailVal, { fontSize: FontSize.lg, color: Colors.success, fontWeight: FontWeight.black }]}>
              ₹{incomingPoolRequest.earnings}
            </Text>
          </View>

          <View style={styles.poolReqActions}>
            <TouchableOpacity 
              style={[styles.poolBtn, styles.poolBtnReject]} 
              onPress={() => setIncomingPoolRequest(null)}>
              <Text style={styles.poolBtnTextReject}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.poolBtn, styles.poolBtnAccept]} 
              onPress={handleAcceptPool}>
              <LinearGradient
                colors={['#FFC72C', '#F8B100']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.poolBtnTextAccept}>Accept Pool ➔</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderPendingRiderRequestModal = () => {
    if (!pendingRiderRequest) return null;
    const { rider } = pendingRiderRequest;
    return (
      <View style={styles.activeOverlay}>
        <View style={styles.activeSheet}>
          <LinearGradient colors={['#FF5A1F', '#FF7A45']} style={styles.activeSheetHeader}>
            <Text style={styles.activeSheetTitle}>🛺 Co-Rider Request</Text>
            <Text style={styles.activeSheetSubtitle}>
              A passenger wants to join your E-Rickshaw route!
            </Text>
          </LinearGradient>

          <View style={styles.poolRequestDetails}>
            <Text style={styles.poolReqDetailLabel}>PASSENGER</Text>
            <Text style={styles.poolReqDetailVal}>{rider.name || 'Co-Rider'}</Text>
            
            <Text style={[styles.poolReqDetailLabel, { marginTop: Spacing.md }]}>PICKUP</Text>
            <Text style={styles.poolReqDetailVal}>{rider.pickup.address}</Text>

            <Text style={[styles.poolReqDetailLabel, { marginTop: Spacing.md }]}>DROP OFF</Text>
            <Text style={styles.poolReqDetailVal}>{rider.dropoff.address}</Text>

            <Text style={[styles.poolReqDetailLabel, { marginTop: Spacing.md }]}>ESTIMATED EXTRA EARNINGS</Text>
            <Text style={[styles.poolReqDetailVal, { fontSize: FontSize.lg, color: Colors.success, fontWeight: FontWeight.black }]}>
              +₹15
            </Text>
          </View>

          <View style={styles.poolReqActions}>
            <TouchableOpacity 
              style={[styles.poolBtn, styles.poolBtnReject]} 
              onPress={handleDeclineAdditionalRider}>
              <Text style={styles.poolBtnTextReject}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.poolBtn, styles.poolBtnAccept]} 
              onPress={handleAcceptAdditionalRider}>
              <LinearGradient
                colors={['#FF5A1F', '#FF7A45']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.poolBtnTextAccept}>Accept Rider ➔</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderActivePoolPanel = () => {
    if (!activePoolDetails) return null;
    const status = activePoolDetails.status;
    const isMatched = status === 'matched';
    const isStarted = status === 'started';

    const maujpurCoords: [number, number] = [77.2715, 28.6891];
    const metroCoords: [number, number] = [77.3216, 28.6759];

    const poolPickup = {
      coordinates: activePoolDetails.direction === 'to_home' ? metroCoords : maujpurCoords,
      address: activePoolDetails.direction === 'to_home' ? 'Dilshad Garden Metro' : 'Maujpur, Delhi',
    };

    const poolDropoff = {
      coordinates: activePoolDetails.direction === 'to_home' ? maujpurCoords : metroCoords,
      address: activePoolDetails.direction === 'to_home' ? 'Maujpur, Delhi' : 'Dilshad Garden Metro',
    };

    return (
      <View style={styles.activeOverlay}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <DummyMap
          style={StyleSheet.absoluteFillObject}
          captainLocation={captainLocation}
          pickupLocation={poolPickup}
          dropoffLocation={poolDropoff}
          rideType="economy"
          rideStatus={isMatched ? 'arriving' : 'in_progress'}
        />
        <View style={styles.activeSheet}>
          <LinearGradient colors={['#1A0800', '#0D0D0D']} style={styles.activeSheetHeader}>
            <Text style={styles.activeSheetTitle}>
              {isMatched ? '🛺 Pool Assigned' : '🚀 Shared Trip in Progress'}
            </Text>
            <Text style={styles.activeSheetSubtitle}>
              {isMatched ? 'Head to boarding pickup point' : 'Dropping off passengers sequence'}
            </Text>
          </LinearGradient>

          <View style={styles.poolInfoCard}>
            <Text style={styles.poolInfoId}>Pool ID: P#{activePoolDetails._id?.slice(-4).toUpperCase()}</Text>
            <Text style={styles.poolInfoSeats}>💺 {activePoolDetails.riders?.length} / 4 Seats</Text>
          </View>

          <ScrollView style={styles.ridersList} contentContainerStyle={{ gap: Spacing.sm }}>
            {activePoolDetails.riders?.map((rider: any, idx: number) => {
              const riderRide = activePoolRides.find(
                (r: any) => r.riderId === (rider.user?._id || rider.user)
              );
              const isOtpVerified = riderRide
                ? (riderRide.status === 'otp_verified' || riderRide.status === 'in_progress' || riderRide.status === 'completed')
                : false;
              const isCompleted = riderRide ? (riderRide.status === 'completed') : false;

              return (
                <View key={idx} style={styles.riderListItem}>
                  <View style={styles.riderListAvatar}>
                    <Text style={styles.riderListAvatarText}>👤</Text>
                  </View>
                  <View style={styles.riderListInfo}>
                    <Text style={styles.riderListName}>{rider.user?.name || 'Rider'}</Text>
                    <Text style={styles.riderListPickup} numberOfLines={1}>📍 {rider.pickup?.address}</Text>
                    <Text style={styles.riderListDrop} numberOfLines={1}>🏁 {rider.dropoff?.address}</Text>
                  </View>
                  <View style={styles.riderListActions}>
                    {riderRide && isMatched && (
                      isOtpVerified ? (
                        <Text style={styles.boardedText}>🟢 Boarded</Text>
                      ) : (
                        verifyingRideId === riderRide.rideId ? (
                          <View style={styles.inlineOtpRow}>
                            <TextInput
                              style={styles.inlineOtpInput}
                              placeholder="OTP"
                              placeholderTextColor={Colors.textMuted}
                              keyboardType="number-pad"
                              maxLength={4}
                              value={poolOtpCode}
                              onChangeText={poolOtpText => setPoolOtpCode(poolOtpText)}
                            />
                            <TouchableOpacity
                              style={styles.inlineVerifyBtn}
                              onPress={() => handleVerifyPoolRiderOtp(riderRide.rideId)}>
                              <Text style={styles.inlineVerifyBtnText}>Go</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.inlineCancelBtn}
                              onPress={() => {
                                setVerifyingRideId(null);
                                setPoolOtpCode('');
                              }}>
                              <Text style={styles.inlineCancelBtnText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.verifyOtpBtn}
                            onPress={() => {
                              setVerifyingRideId(riderRide.rideId);
                              setPoolOtpCode('');
                            }}>
                            <Text style={styles.verifyOtpBtnText}>Verify OTP</Text>
                          </TouchableOpacity>
                        )
                      )
                    )}
                    {isStarted && (
                      isCompleted ? (
                        <Text style={styles.boardedText}>✅ Completed</Text>
                      ) : (
                        <TouchableOpacity
                          style={styles.completeRiderBtn}
                          onPress={() => {
                            if (riderRide?.rideId) {
                              handleCompleteRiderRide(riderRide.rideId);
                            }
                          }}
                          disabled={isRideActionLoading}>
                          <Text style={styles.completeRiderBtnText}>Complete</Text>
                        </TouchableOpacity>
                      )
                    )}
                    <TouchableOpacity
                      style={styles.riderListCallBtn}
                      onPress={() => Alert.alert('Calling Rider', `Dialing: ${rider.user?.phone || rider.phone}`)}>
                      <Text style={{ fontSize: 14 }}>📞</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {isMatched && (
            <View style={styles.pickupPointBox}>
              <Text style={styles.pickupPointLabel}>BOARDING PICKUP POINT</Text>
              <Text style={styles.pickupPointVal}>📍 {activePoolDetails.direction === 'to_home' 
                ? `${activePoolDetails.zone?.metroStation?.name} (Gate 1)` 
                : 'Collect riders from locations'}</Text>
            </View>
          )}

          {isMatched && (
            <TouchableOpacity
              style={styles.poolActionBtn}
              onPress={handleStartPool}
              disabled={isRideActionLoading || !activePoolDetails.riders?.length || !activePoolDetails.riders.every((rider: any) => {
                const rRide = activePoolRides.find((r: any) => r.riderId === (rider.user?._id || rider.user));
                return rRide ? (rRide.status === 'otp_verified' || rRide.status === 'in_progress') : false;
              })}>
              <LinearGradient
                colors={
                  (!activePoolDetails.riders?.length || !activePoolDetails.riders.every((rider: any) => {
                    const rRide = activePoolRides.find((r: any) => r.riderId === (rider.user?._id || rider.user));
                    return rRide ? (rRide.status === 'otp_verified' || rRide.status === 'in_progress') : false;
                  }))
                    ? [Colors.surfaceElevated, Colors.surfaceBorder]
                    : ['#FFC72C', '#F8B100']
                }
                style={styles.poolActionBtnGrad}>
                <Text style={[
                  styles.poolActionBtnText,
                  (!activePoolDetails.riders?.length || !activePoolDetails.riders.every((rider: any) => {
                    const rRide = activePoolRides.find((r: any) => r.riderId === (rider.user?._id || rider.user));
                    return rRide ? (rRide.status === 'otp_verified' || rRide.status === 'in_progress') : false;
                  })) && { color: Colors.textMuted }
                ]}>
                  {isRideActionLoading ? 'Starting Pool...' : 'Start Trip ➔'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isStarted && (
            <View style={{ padding: Spacing.md, alignItems: 'center' }}>
              <Text style={{ fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic' }}>
                Trip in progress. Complete each passenger's ride in the list above.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  function handleCancelActiveRide() {
    Alert.alert(
      'Cancel Active Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (!activeRideId) return;
            setIsRideActionLoading(true);
            try {
              await rideService.cancelRide(activeRideId, 'Cancelled by captain');
              setActiveRideId(null);
              setActiveRideDetails(null);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel ride');
            } finally {
              setIsRideActionLoading(false);
            }
          }
        }
      ]
    );
  }

  const renderActiveRidePanel = () => {
    if (!activeRideDetails) return null;

    const rider = activeRideDetails.rider || {};
    const status = activeRideDetails.status;
    const isArriving = status === 'accepted';
    const isProgress = status === 'otp_verified' || status === 'in_progress';
    const rideIcons: Record<string, string> = { bike: '🏍️', auto: '🛺', cab: '🚗', economy: '⚡🛺' };

    return (
      <View style={styles.activeOverlay}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <DummyMap
          style={StyleSheet.absoluteFillObject}
          captainLocation={captainLocation}
          pickupLocation={activeRideDetails.pickup}
          dropoffLocation={activeRideDetails.dropoff}
          rideType={activeRideDetails.rideType}
          rideStatus={isArriving ? 'arriving' : 'in_progress'}
        />
        <View style={styles.activeSheet}>
          <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.activeSheetHeader}>
            <Text style={styles.activeSheetTitle}>
              {isArriving ? '🏍️ Head to Pickup' : '🚀 Trip in Progress'}
            </Text>
            <Text style={styles.activeSheetSubtitle}>
              {isArriving ? 'Arrive at customer location and verify OTP' : 'Driving customer to destination'}
            </Text>
          </LinearGradient>

          <View style={styles.riderCard}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderAvatarText}>{rider.name?.charAt(0) || 'U'}</Text>
            </View>
            <View style={styles.riderInfo}>
              <Text style={styles.riderName}>{rider.name || 'Rider'}</Text>
              <Text style={styles.riderMeta}>⭐ {rider.rating || 5.0} · {rideIcons[activeRideDetails.rideType] || '🏍️'}</Text>
            </View>
            <TouchableOpacity
              style={styles.activeCallBtn}
              onPress={() => Alert.alert('Calling Rider', `Dialing: ${rider.phone}`)}>
              <Text style={{ fontSize: 18 }}>📞</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activeRouteCard}>
            <View style={styles.routeRow}>
              <View style={styles.dotPickup} />
              <View style={styles.routeTexts}>
                <Text style={styles.routeLabel}>Pickup Location</Text>
                <Text style={styles.routeAddr} numberOfLines={1}>{activeRideDetails.pickup?.address}</Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeRow}>
              <View style={styles.dotDrop} />
              <View style={styles.routeTexts}>
                <Text style={styles.routeLabel}>Drop-off Location</Text>
                <Text style={styles.routeAddr} numberOfLines={1}>{activeRideDetails.dropoff?.address}</Text>
              </View>
            </View>
          </View>

          <View style={styles.activeMetricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Est. Distance</Text>
              <Text style={styles.metricVal}>{activeRideDetails.distance} km</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Trip Fare</Text>
              <Text style={styles.metricVal}>₹{activeRideDetails.fare?.estimated}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Payment</Text>
              <Text style={styles.metricVal}>{activeRideDetails.paymentMethod?.toUpperCase()}</Text>
            </View>
          </View>

          {isArriving && (
            <View style={styles.otpInputSection}>
              <Text style={styles.otpInputLabel}>Ask customer for OTP to start ride</Text>
              <View style={styles.otpInputRow}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 4-Digit OTP"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={otpCode}
                  onChangeText={setOtpCode}
                />
                <TouchableOpacity
                  style={[styles.verifyButton, otpCode.length < 4 && styles.verifyButtonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={otpCode.length < 4 || isRideActionLoading}>
                  <LinearGradient
                    colors={otpCode.length < 4 ? [Colors.surfaceElevated, Colors.surfaceBorder] : [Colors.success, '#16A34A']}
                    style={styles.verifyButtonGrad}>
                    <Text style={[styles.verifyButtonText, otpCode.length < 4 && { color: Colors.textMuted }]}>
                      {isRideActionLoading ? 'Starting...' : 'Verify & Start'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isProgress && (
            <TouchableOpacity
              style={styles.completeRideBtn}
              onPress={handleCompleteRide}
              disabled={isRideActionLoading}>
              <LinearGradient
                colors={[Colors.success, '#16A34A']}
                style={styles.completeRideBtnGrad}>
                <Text style={styles.completeRideBtnText}>
                  {isRideActionLoading ? 'Completing Ride...' : '✓ Complete Ride'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isArriving && (
            <TouchableOpacity
              style={styles.cancelActiveBtn}
              onPress={handleCancelActiveRide}
              disabled={isRideActionLoading}>
              <Text style={styles.cancelActiveText}>Cancel Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Active Ride Workflow Panel overlay */}
      {renderActiveRidePanel()}

      {/* Active Pool Workflow Panel overlay */}
      {renderActivePoolPanel()}

      {/* Incoming ride request overlay */}
      {incomingRequest && !activeRideId && (
        <IncomingRideScreen
          onAccept={() => {}}
          onReject={() => setIncomingRequest(null)}
        />
      )}

      {/* Incoming pool request overlay */}
      {incomingPoolRequest && !activePoolId && renderIncomingPoolRequestModal()}

      {/* Dynamic co-rider request overlay */}
      {pendingRiderRequest && renderPendingRiderRequestModal()}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={['#1A0A00', '#0D0D0D']}
          style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Captain Dashboard</Text>
              <Text style={styles.captainName}>{user?.name}</Text>
            </View>
            <View style={styles.onlineToggle}>
              <Text style={[styles.onlineLabel, isOnline && styles.onlineLabelActive]}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </Text>
              <Switch
                value={isOnline}
                onValueChange={handleToggleOnline}
                disabled={isLoading}
                trackColor={{ false: Colors.surfaceBorder, true: 'rgba(255,90,31,0.3)' }}
                thumbColor={isOnline ? Colors.primary : Colors.textMuted}
              />
            </View>
          </View>

          {/* Status Banner */}
          <View style={[styles.statusBanner, isOnline ? styles.statusBannerOnline : styles.statusBannerOffline]}>
            <Text style={styles.statusBannerText}>
              {isOnline
                ? '✅ You are online and accepting rides'
                : '⏸️ Go online to start accepting rides'}
            </Text>
          </View>
        </LinearGradient>

        {/* Today's Stats */}
        <View style={styles.statsSection}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.earningsCard}>
            <View style={styles.earningsRow}>
              <View>
                <Text style={styles.earningsLabel}>Today's Earnings</Text>
                <Text style={styles.earningsValue}>₹{todayEarnings.toLocaleString()}</Text>
              </View>
              <View style={styles.earningsIcon}>
                <Text style={{ fontSize: 28 }}>💰</Text>
              </View>
            </View>
            <View style={styles.earningsMeta}>
              <View style={styles.earningsMetaItem}>
                <Text style={styles.earningsMetaValue}>{todayRides}</Text>
                <Text style={styles.earningsMetaLabel}>Rides</Text>
              </View>
              <View style={styles.earningsMetaDivider} />
              <View style={styles.earningsMetaItem}>
                <Text style={styles.earningsMetaValue}>4.9⭐</Text>
                <Text style={styles.earningsMetaLabel}>Rating</Text>
              </View>
              <View style={styles.earningsMetaDivider} />
              <View style={styles.earningsMetaItem}>
                <Text style={styles.earningsMetaValue}>{acceptanceRate}</Text>
                <Text style={styles.earningsMetaLabel}>Acceptance</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Earnings</Text>
          <View style={styles.chart}>
            {weeklyEarnings.map((day, i) => (
              <View key={i} style={styles.chartBar}>
                <Text style={styles.chartValue}>₹{(day.amount / 1000).toFixed(1)}k</Text>
                <View style={styles.barContainer}>
                  <LinearGradient
                    colors={
                      day.date === 'Sat'
                        ? [Colors.primaryLight, Colors.primary]
                        : [Colors.surfaceElevated, Colors.surfaceBorder]
                    }
                    style={[styles.bar, { height: (day.amount / maxEarning) * 100 }]}
                  />
                </View>
                <Text style={styles.chartDay}>{day.date}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Rides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Rides</Text>
          <View style={styles.recentList}>
            {recentRides.length > 0 ? (
              recentRides.map((ride: any) => {
                const isDbRide = !!ride.pickup;
                const emoji = isDbRide ? getRideTypeEmoji(ride.rideType) : '🏍️';
                const fromLabel = isDbRide ? (ride.pickup.name || ride.pickup.address.split(',')[0]) : '';
                const toLabel = isDbRide ? (ride.dropoff.name || ride.dropoff.address.split(',')[0]) : '';
                const timeLabel = isDbRide ? getRideTime(ride.date || ride.createdAt) : '';
                const durationLabel = isDbRide ? `${ride.duration || 10} min` : '';
                const fareLabel = isDbRide ? (ride.actualFare || ride.fare) : '';

                return (
                  <View key={ride.id || ride._id} style={styles.recentCard}>
                    <View style={styles.recentIcon}>
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    </View>
                    <View style={styles.recentInfo}>
                      <Text style={styles.recentRoute} numberOfLines={1}>{fromLabel} → {toLabel}</Text>
                      <Text style={styles.recentMeta}>{timeLabel} · {durationLabel}</Text>
                    </View>
                    <Text style={styles.recentFare}>₹{fareLabel}</Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyRecentCard}>
                <Text style={styles.emptyRecentText}>No recent rides completed.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: '💳', label: 'Withdraw', sub: 'Instant transfer' },
              { icon: '📊', label: 'Analytics', sub: 'View reports' },
              { icon: '🛠️', label: 'Vehicle', sub: 'Manage vehicle' },
              { icon: '🎯', label: 'Incentives', sub: 'View offers' },
            ].map((action, i) => (
              <TouchableOpacity key={i} style={styles.actionCard}>
                <Text style={styles.actionIcon}>{action.icon}</Text>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionSub}>{action.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    padding: Spacing['2xl'],
    paddingTop: 54,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  greeting: { fontSize: FontSize.sm, color: Colors.textMuted, letterSpacing: 0.5 },
  captainName: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.textPrimary },
  onlineToggle: { alignItems: 'flex-end', gap: 4 },
  onlineLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  onlineLabelActive: { color: Colors.success },
  statusBanner: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statusBannerOnline: { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  statusBannerOffline: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  statusBannerText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  statsSection: { padding: Spacing.xl },
  earningsCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.glow,
  },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  earningsLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  earningsValue: { fontSize: FontSize['4xl'], fontWeight: FontWeight.black, color: Colors.white },
  earningsIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  earningsMeta: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  earningsMetaItem: { flex: 1, alignItems: 'center' },
  earningsMetaValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
  earningsMetaLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  earningsMetaDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    height: 160,
    gap: 4,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  chartBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  chartValue: { fontSize: 8, color: Colors.textMuted },
  barContainer: { width: '100%', height: 100, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  chartDay: { fontSize: FontSize.xs, color: Colors.textMuted },
  recentList: { gap: Spacing.sm },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  recentIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,90,31,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  recentInfo: { flex: 1 },
  recentRoute: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  recentMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  recentFare: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
  emptyRecentCard: {
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  emptyRecentText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionCard: {
    width: (width - Spacing.xl * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  actionIcon: { fontSize: 24, marginBottom: Spacing.sm },
  actionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  actionSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  // Active Ride styles
  activeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', justifyContent: 'flex-end', zIndex: 1000 },
  activeSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, overflow: 'hidden' },
  activeSheetHeader: { padding: Spacing.xl, alignItems: 'center' },
  activeSheetTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.white, marginBottom: 4 },
  activeSheetSubtitle: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  riderCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, gap: Spacing.md },
  riderAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  riderAvatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.white },
  riderInfo: { flex: 1 },
  riderName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  riderMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  activeCallBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  activeRouteCard: { padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, gap: Spacing.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dotPickup: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  dotDrop: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.error },
  routeLine: { width: 2, height: 16, backgroundColor: Colors.surfaceBorder, marginLeft: 4, marginVertical: 2 },
  routeTexts: { flex: 1 },
  routeLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  routeAddr: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  activeMetricsRow: { flexDirection: 'row', padding: Spacing.xl, alignItems: 'center' },
  metricBox: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  metricVal: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  metricDivider: { width: 1, height: 28, backgroundColor: Colors.surfaceBorder },
  otpInputSection: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  otpInputLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm, textAlign: 'center', fontWeight: FontWeight.semiBold },
  otpInputRow: { flexDirection: 'row', gap: Spacing.md },
  otpInput: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.surfaceBorder, color: Colors.textPrimary, paddingHorizontal: Spacing.md, fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center', letterSpacing: 8, height: 48 },
  verifyButton: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  verifyButtonDisabled: { opacity: 0.5 },
  verifyButtonGrad: { height: 48, alignItems: 'center', justifyContent: 'center' },
  verifyButtonText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.base },
  completeRideBtn: { marginHorizontal: Spacing.xl, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  completeRideBtnGrad: { paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  completeRideBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.lg },
  cancelActiveBtn: { marginHorizontal: Spacing.xl, alignItems: 'center', paddingVertical: Spacing.md },
  cancelActiveText: { color: Colors.error, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  
  // Shared Pool styles
  poolInfoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  poolInfoId: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  poolInfoSeats: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  ridersList: {
    maxHeight: 180,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  riderListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  riderListAvatar: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,90,31,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  riderListAvatarText: {
    fontSize: 14,
  },
  riderListInfo: {
    flex: 1,
  },
  riderListName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  riderListDrop: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  riderListPickup: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  completeRiderBtn: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#16A34A',
    marginRight: 4,
  },
  completeRiderBtnText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#16A34A',
  },
  riderListCallBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  pickupPointBox: {
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: 'rgba(248,177,0,0.06)',
  },
  pickupPointLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  pickupPointVal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  poolActionBtn: {
    margin: Spacing.xl,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  poolActionBtnGrad: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolActionBtnText: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.lg,
  },
  poolRequestDetails: {
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: 4,
  },
  poolReqDetailLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  poolReqDetailVal: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  poolReqActions: {
    flexDirection: 'row',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  poolBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  poolBtnReject: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  poolBtnAccept: {
    position: 'relative',
  },
  poolBtnTextReject: {
    color: Colors.error,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.base,
  },
  poolBtnTextAccept: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.base,
    zIndex: 1,
  },
  riderListActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  boardedText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  verifyOtpBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  verifyOtpBtnText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  inlineOtpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineOtpInput: {
    width: 50,
    height: 30,
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontSize: 12,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  inlineVerifyBtn: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  inlineVerifyBtnText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  inlineCancelBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  inlineCancelBtnText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});

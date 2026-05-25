import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../config/api.config';
import { STORAGE_KEYS } from './api';

let socket: Socket | null = null;

/**
 * Connect to the Socket.io server using the stored access token.
 * Call this after login and on app startup if user is authenticated.
 */
export const connectSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;

  const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('🔌 Socket error:', err.message);
  });

  return socket;
};

/**
 * Get current socket instance (must call connectSocket first).
 */
export const getSocket = (): Socket | null => socket;

/**
 * Disconnect and clear the socket.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket disconnected manually');
  }
};

/**
 * Captain: Send current GPS location via socket (lightweight, frequent updates).
 */
export const emitLocationUpdate = (
  latitude: number,
  longitude: number,
  rideId?: string,
  riderId?: string
) => {
  socket?.emit('captain:update_location', { latitude, longitude, rideId, riderId });
};

// ── Event name constants (shared between app and backend) ─────────────────────
export const SOCKET_EVENTS = {
  // Ride events received by RIDER
  RIDE_ACCEPTED: 'ride:accepted',
  RIDE_REJECTED: 'ride:rejected',
  RIDE_STARTED: 'ride:started',
  RIDE_COMPLETED: 'ride:completed',
  RIDE_CANCELLED: 'ride:cancelled',
  CAPTAIN_LOCATION_UPDATE: 'captain:location_update',

  // Ride events received by CAPTAIN
  RIDE_NEW_REQUEST: 'ride:new_request',
  RIDE_REQUEST_TIMEOUT: 'ride:request_timeout',

  // Sent by CAPTAIN
  CAPTAIN_UPDATE_LOCATION: 'captain:update_location',
} as const;

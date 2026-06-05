/**
 * ─── GoNow API Configuration ──────────────────────────────────────────────────
 *
 * To switch between dev and production:
 *   1. Change BASE_URL to your deployed server URL
 *   2. Change SOCKET_URL to the same server (no /api suffix)
 *
 * Android emulator uses 10.0.2.2 to reach host machine's localhost.
 * Physical device: replace with your machine's local IP (e.g. 192.168.1.10)
 */

// ── Dev (local backend) ────────────────────────────────────────────────────────
// const DEV_BASE_URL = 'http://10.79.10.38:5000/api';
// const DEV_SOCKET_URL = 'http://10.79.10.38:5000';
const DEV_BASE_URL = 'https://go-now-backend.vercel.app/api';
const DEV_SOCKET_URL = 'https://go-now-backend.vercel.app';

import { Platform } from 'react-native';

// — Dev (local backend) ———————————————————
const DEV_HOST = '10.79.10.243';
const PORT = '5000';
// const DEV_BASE_URL = `http://${DEV_HOST}:${PORT}/api`;
// const DEV_SOCKET_URL = `http://${DEV_HOST}:${PORT}`;

// ── Production (replace with your deployed URL) ────────────────────────────────
const PROD_BASE_URL = 'https://go-now-backend.vercel.app/api'; // 👈 change this when deploying
const PROD_SOCKET_URL = 'https://go-now-backend.vercel.app';   // 👈 change this when deploying

// ── Active config (flip __DEV__ flag or change manually) ───────────────────────
const IS_DEV = __DEV__;  // React Native's built-in flag (true in dev mode)

export const BASE_URL = IS_DEV ? DEV_BASE_URL : PROD_BASE_URL;
export const SOCKET_URL = IS_DEV ? DEV_SOCKET_URL : PROD_SOCKET_URL;

// API timeout in milliseconds
export const API_TIMEOUT = 15000;

// Google Maps API Key placeholder (replace with your actual key for autocomplete)
export const GOOGLE_MAPS_API_KEY = 'AIzaSyBPdowXJwFfcybbHYp8O30_xFh26OHVlbc';

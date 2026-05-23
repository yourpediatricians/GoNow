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
// const DEV_BASE_URL = 'http://10.65.63.38:5000/api';
// const DEV_SOCKET_URL = 'http://10.65.63.38:5000';

import { Platform } from 'react-native';

// — Dev (local backend) ———————————————————
const DEV_HOST = 'localhost';
const DEV_BASE_URL = `http://${DEV_HOST}:5001/api`;
const DEV_SOCKET_URL = `http://${DEV_HOST}:5001`;

// ── Production (replace with your deployed URL) ────────────────────────────────
const PROD_BASE_URL = 'https://api.gonow.app/api'; // 👈 change this when deploying
const PROD_SOCKET_URL = 'https://api.gonow.app';   // 👈 change this when deploying

// ── Active config (flip __DEV__ flag or change manually) ───────────────────────
const IS_DEV = __DEV__;  // React Native's built-in flag (true in dev mode)

export const BASE_URL = IS_DEV ? DEV_BASE_URL : PROD_BASE_URL;
export const SOCKET_URL = IS_DEV ? DEV_SOCKET_URL : PROD_SOCKET_URL;

// API timeout in milliseconds
export const API_TIMEOUT = 15000;

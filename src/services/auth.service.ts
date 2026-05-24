import api from './api';
import { UserRole } from '../types';

export const authService = {
  /**
   * Verify the Firebase ID Token received from native Firebase SDK with the GoNow backend
   */
  firebaseVerify: async (idToken: string, role: UserRole) => {
    const { data } = await api.post('/auth/firebase-verify', { idToken, role });
    return data; // { success, isNewUser, data: { accessToken, refreshToken, user } }
  },

  /**
   * Refresh access token using stored refresh token.
   */
  refreshToken: async (refreshToken: string) => {
    const { data } = await api.post('/auth/refresh', { refreshToken });
    return data; // { success, data: { accessToken } }
  },

  /**
   * Logout - invalidates the refresh token on the server.
   */
  logout: async (refreshToken: string) => {
    const { data } = await api.post('/auth/logout', { refreshToken });
    return data;
  },
};

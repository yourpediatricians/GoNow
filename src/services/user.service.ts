import api from './api';

export const userService = {
  /**
   * Update rider profile details on the backend (name, email, profilePhoto).
   */
  updateProfile: async (updates: { name: string; email?: string }) => {
    const { data } = await api.put('/user/profile', updates);
    return data; // { success: true, message: 'Profile updated', data: { user } }
  },
};

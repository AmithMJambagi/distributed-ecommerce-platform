import api from './client';

export const userApi = {
  /**
   * Fetch current user's profile
   */
  getProfile: async () => {
    const response = await api.get('/api/v1/users/profile');
    return response.data;
  },

  /**
   * Update current user's profile details & shipping address
   * @param {Object} data { fullName, phoneNumber, age, gender, address }
   */
  updateProfile: async (data) => {
    const response = await api.put('/api/v1/users/profile', data);
    return response.data;
  },

  /**
   * Change current user's password
   * @param {string} newPassword
   */
  changePassword: async (newPassword) => {
    const response = await api.put('/api/v1/users/password', { newPassword });
    return response.data;
  }
};

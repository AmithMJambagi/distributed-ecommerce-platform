import api from './client';

export const authApi = {
  /**
   * Request 6-digit OTP to email (for both login and account setup)
   * @param {string} email
   * @param {string} type 'login' | 'register'
   */
  sendOtp: async (email, type = 'login') => {
    const response = await api.post('/api/v1/auth/otp/send', { email, type });
    return response.data;
  },

  /**
   * Login using 6-digit OTP
   * @param {Object} data { email, otp }
   */
  loginWithOtp: async (data) => {
    const response = await api.post('/api/v1/auth/otp/login', data);
    return response.data;
  },

  /**
   * Register / Setup new account with Email, verified OTP, and Full Name
   * Password is completely optional and can be set in user profile.
   * @param {Object} data { email, otp, fullName }
   */
  register: async (data) => {
    const response = await api.post('/api/v1/auth/register', data);
    return response.data;
  },

  /**
   * Standard password-based login (optional for users who set a password)
   * @param {Object} data { email, password }
   */
  login: async (data) => {
    const response = await api.post('/api/v1/auth/login', data);
    return response.data;
  }
};

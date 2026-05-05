import apiClient from '../apiClient';

const authService = {
  login: async (credentials) => {
    // credentials usually includes idToken from Firebase Client SDK
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  }
};

export default authService;

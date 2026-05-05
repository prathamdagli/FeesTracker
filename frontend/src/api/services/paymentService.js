import apiClient from '../apiClient';

const paymentService = {
  getAll: async () => {
    const response = await apiClient.get('/payments');
    return response.data;
  },

  record: async (paymentData) => {
    const response = await apiClient.post('/payments/record', paymentData);
    return response.data;
  },

  getHistory: async (studentId) => {
    const response = await apiClient.get(`/payments/student/${studentId}`);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/payments/${id}`);
    return response.data;
  },
};

export default paymentService;

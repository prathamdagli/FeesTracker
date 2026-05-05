import apiClient from '../apiClient';

const feeService = {
  getAll: async () => {
    const response = await apiClient.get('/fees');
    return response.data;
  },

  create: async (feeData) => {
    const response = await apiClient.post('/fees', feeData);
    return response.data;
  },

  update: async (id, updateData) => {
    const response = await apiClient.put(`/fees/${id}`, updateData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/fees/${id}`);
    return response.data;
  },

  reApplyAll: async () => {
    const response = await apiClient.post('/fees/re-apply');
    return response.data;
  },
};

export default feeService;

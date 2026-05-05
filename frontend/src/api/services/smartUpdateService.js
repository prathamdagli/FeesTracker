import apiClient from '../apiClient';

const smartUpdateService = {
  preview: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/smart-update/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  commit: async (newRecords, updatedRecords) => {
    const response = await apiClient.post('/smart-update/commit', { newRecords, updatedRecords });
    return response.data;
  }
};

export default smartUpdateService;

import apiClient from '../apiClient';

const studentService = {
  getAll: async () => {
    const response = await apiClient.get('/students');
    return response.data;
  },

  create: async (studentData) => {
    const response = await apiClient.post('/students', studentData);
    return response.data;
  },

  update: async (id, updateData) => {
    const response = await apiClient.put(`/students/${id}`, updateData);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/students/${id}`);
    return response.data;
  },

  normalizeSchools: async () => {
    const response = await apiClient.post('/students/normalize-schools');
    return response.data;
  },
};

export default studentService;

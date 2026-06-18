import apiClient from './client';

export const getCategories = async () => {
  const response = await apiClient.get('/categories/');
  return response.data;
};

export const createCategory = async (data) => {
  const response = await apiClient.post('/categories/', data);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await apiClient.delete(`/categories/${id}`);
  return response.data;
};

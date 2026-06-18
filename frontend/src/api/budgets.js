import apiClient from './client';

export const setupBudget = async (data) => {
  const response = await apiClient.post('/budgets/setup', data);
  return response.data;
};

export const getCurrentBudget = async (month, year) => {
  const params = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const response = await apiClient.get('/budgets/current', { params });
  return response.data;
};

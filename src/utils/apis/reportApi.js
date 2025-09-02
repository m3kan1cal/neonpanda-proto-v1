import { getApiUrl, authenticatedFetch } from './apiConfig';

// List weekly reports for a user
export const getWeeklyReports = async (userId, options = {}) => {
  const params = new URLSearchParams();
  if (options.fromDate) params.append('fromDate', options.fromDate);
  if (options.toDate) params.append('toDate', options.toDate);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.sortOrder) params.append('sortOrder', options.sortOrder);

  const url = `${getApiUrl('')}/users/${userId}/reports/weekly${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await authenticatedFetch(url, { method: 'GET' });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
};

// Get a specific weekly report by weekId
export const getWeeklyReport = async (userId, weekId) => {
  const url = `${getApiUrl('')}/users/${userId}/reports/weekly/${weekId}`;
  const response = await authenticatedFetch(url, { method: 'GET' });
  if (!response.ok) {
    if (response.status === 404) throw new Error('Weekly report not found');
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
};

export default {
  getWeeklyReports,
  getWeeklyReport,
};


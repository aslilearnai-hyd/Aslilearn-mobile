import api from './api';

const getDashboard = async () => {
  const response = await api.get('/api/teacher/dashboard');
  return response?.data;
};

const getStudentsPerformance = async () => {
  const response = await api.get('/api/teacher/students/performance');
  return response?.data;
};

const getHomeworkSubmissions = async () => {
  const response = await api.get('/api/teacher/homework-submissions');
  return response?.data;
};

export default {
  getDashboard,
  getStudentsPerformance,
  getHomeworkSubmissions,
};

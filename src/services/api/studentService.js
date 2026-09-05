import api from './api';

const getAttendance = async () => {
  const response = await api.get('/api/student/session-time');
  return response?.data;
};

const getAssignments = async () => {
  const response = await api.get('/api/student/homework-submissions');
  return response?.data;
};

const getProfile = async () => {
  const response = await api.get('/api/auth/me');
  return response?.data;
};

export default {
  getAttendance,
  getAssignments,
  getProfile,
};

import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { username: string; email: string; password: string; nickname?: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

export const postAPI = {
  getPosts: (params?: { page?: number; limit?: number; tagId?: string }) =>
    api.get('/posts', { params }),
  getPost: (id: string) => api.get(`/posts/${id}`),
  createPost: (data: { title: string; content: string; isAnonymous: boolean; tagIds?: string[] }) =>
    api.post('/posts', data),
  createReply: (postId: string, data: { content: string }) =>
    api.post(`/posts/${postId}/reply`, data),
  likePost: (id: string) => api.post(`/posts/${id}/like`),
  getTags: () => api.get('/posts/tags')
};

export const counselorAPI = {
  apply: (data: { realName: string; certificateNumber: string; certificateImage: string; expertise: string[]; introduction?: string; hourlyRate: number }) =>
    api.post('/counselors/apply', data),
  getPending: () => api.get('/counselors/pending'),
  reviewCounselor: (id: string, data: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
    api.post(`/counselors/${id}/review`, data),
  getApproved: (params?: { tagId?: string }) =>
    api.get('/counselors/approved', { params }),
  getCounselor: (id: string) => api.get(`/counselors/${id}`),
  createSchedule: (data: { date: string; startTime: string; endTime: string }) =>
    api.post('/counselors/schedule', data),
  getSchedules: (id: string) => api.get(`/counselors/${id}/schedules`),
  deleteSchedule: (id: string) => api.delete(`/counselors/schedule/${id}`)
};

export const appointmentAPI = {
  create: (data: { scheduleId: string; title: string; description?: string }) =>
    api.post('/appointments', data),
  getMyAppointments: () => api.get('/appointments/my'),
  getAppointment: (id: string) => api.get(`/appointments/${id}`),
  confirm: (id: string) => api.post(`/appointments/${id}/confirm`),
  cancel: (id: string) => api.post(`/appointments/${id}/cancel`),
  complete: (id: string) => api.post(`/appointments/${id}/complete`),
  pay: (id: string) => api.post(`/appointments/${id}/pay`)
};

export const groupAPI = {
  getGroups: (params?: { page?: number; limit?: number }) =>
    api.get('/groups', { params }),
  getMyGroups: () => api.get('/groups/my'),
  getGroup: (id: string) => api.get(`/groups/${id}`),
  createGroup: (data: { name: string; description: string; topic: string; maxMembers?: number; meetingTime?: string; meetingFrequency?: string }) =>
    api.post('/groups', data),
  joinGroup: (id: string) => api.post(`/groups/${id}/join`),
  sendMessage: (groupId: string, data: { content: string }) =>
    api.post(`/groups/${groupId}/messages`, data),
  createCheckInTemplate: (groupId: string, data: { title: string; description?: string; reminderTime: string }) =>
    api.post(`/groups/${groupId}/checkin-templates`, data),
  submitCheckIn: (templateId: string, data: { status: 'COMPLETED' | 'MISSED'; response?: string; moodRating?: number }) =>
    api.post(`/groups/checkin/${templateId}`, data)
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  getAppointments: () => api.get('/users/appointments'),
  getFavorites: () => api.get('/users/favorites'),
  toggleFavorite: (postId: string) => api.post(`/users/favorites/${postId}`),
  getGroups: () => api.get('/users/groups'),
  getNotifications: () => api.get('/users/notifications'),
  markNotificationRead: (id: string) => api.post(`/users/notifications/${id}/read`),
  getMyPosts: () => api.get('/users/posts')
};

export const crisisAPI = {
  getHotline: () => api.get('/crisis/hotline'),
  getAlerts: (params?: { page?: number; limit?: number; isResolved?: boolean }) =>
    api.get('/crisis/alerts', { params }),
  getAlert: (id: string) => api.get(`/crisis/alerts/${id}`),
  resolveAlert: (id: string) => api.post(`/crisis/alerts/${id}/resolve`)
};

export default api;

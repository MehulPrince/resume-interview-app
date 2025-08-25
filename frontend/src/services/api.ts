import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

// Add request interceptor to include auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    axios.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    axios.post('/auth/login', data),
  
  getMe: () => axios.get('/auth/me'),
};

export const resumeAPI = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return axios.post('/resume/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  getAll: () => axios.get('/resume'),
  
  getById: (id: string) => axios.get(`/resume/${id}`),
  
  delete: (id: string) => axios.delete(`/resume/${id}`),
};

export const interviewAPI = {
  create: (resumeId: string) =>
    axios.post('/interview/create', { resumeId }),
  
  getById: (id: string) => axios.get(`/interview/${id}`),
  
  getCurrentQuestion: (id: string) => axios.get(`/interview/${id}/current-question`),
  
  getAll: () => axios.get('/interview'),
  
  submitAnswer: (id: string, data: {
    transcript: string;
    questionId: string;
    duration: number;
    audio?: File | Blob;
    video?: File | Blob;
  }) => {
    const formData = new FormData();
    formData.append('transcript', data.transcript);
    formData.append('questionId', data.questionId);
    formData.append('duration', data.duration.toString());
    
    if (data.audio) {
      formData.append('audio', data.audio);
    }
    if (data.video) {
      formData.append('video', data.video);
    }
    
    return axios.post(`/interview/${id}/submit-answer`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  start: (id: string) => axios.post(`/interview/${id}/start`),
};

export const evaluationAPI = {
  evaluate: (data: {
    interviewId: string;
    questionId: string;
    transcript: string;
    duration: number;
  }) => axios.post('/evaluation/evaluate', data),
  
  generateReport: (interviewId: string) =>
    axios.post(`/evaluation/${interviewId}/generate-report`),
  
  getReport: (reportId: string) =>
    axios.get(`/evaluation/report/${reportId}`),
  
  getSummary: (interviewId: string) =>
    axios.get(`/evaluation/${interviewId}/summary`),
};

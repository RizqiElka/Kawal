import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sigap_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Jangan redirect jika sedang proses logout (AuthContext yang menangani)
      if ((window as any).__sigap_logging_out) {
        return Promise.reject(error);
      }

      const loginSource = localStorage.getItem('kawal_login_source');
      localStorage.removeItem('sigap_token');
      localStorage.removeItem('sigap_user');
      localStorage.removeItem('kawal_login_source');

      if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/portal')) {
        const sipegUrl = import.meta.env.VITE_SIPEG_URL || 'http://localhost:8000';
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('XSRF-TOKEN='))
          ?.split('=').slice(1).join('=');
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${sipegUrl}/logout`;
        if (csrfToken) {
          const inp = document.createElement('input');
          inp.type = 'hidden'; inp.name = '_token';
          inp.value = decodeURIComponent(csrfToken);
          form.appendChild(inp);
        }
        document.body.appendChild(form);
        form.submit();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

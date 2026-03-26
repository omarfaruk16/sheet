import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const ADMIN_TOKEN_KEY = 'leafsheets_admin_token';
const ADMIN_INFO_KEY = 'leafsheets_admin_info';

// ─── Token helpers ────────────────────────────────────────────────────────────
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminSession(token: string, adminInfo: object) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(adminInfo));
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_INFO_KEY);
}

export function getAdminInfo(): { username: string; email: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ADMIN_INFO_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken();
}

// ─── Axios headers helper ─────────────────────────────────────────────────────
export function getAdminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Pre-configured axios instance for admin API calls ────────────────────────
export const adminAxios = axios.create({ baseURL: API_URL });

adminAxios.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If a request returns 401, clear session and redirect to login
adminAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAdminSession();
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

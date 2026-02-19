const API_BASE = 'http://localhost:5000/api';

// ── Token management ─────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('rcms_token');
}

export function setToken(token: string): void {
  localStorage.setItem('rcms_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('rcms_token');
}

// ── Fetch wrapper ────────────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  // Handle blob responses (PDF downloads)
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return res.blob();
  }

  return res.json();
}

// ── Auth API ─────────────────────────────────────────────────────────

export const authAPI = {
  login: (email: string, password: string) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  signup: (data: { name: string; email: string; password: string; role: string; department: string }) =>
    apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),

  verifyGoogleToken: (token: string) =>
    apiFetch('/auth/google/verify-token', { method: 'POST', body: JSON.stringify({ token }) }),

  sendOtp: (email: string, name?: string) =>
    apiFetch('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email, name }) }),

  verifyOtp: (email: string, otp: string) =>
    apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),

  me: () => apiFetch('/auth/me'),

  updateProfile: (data: { name?: string; password?: string }) =>
    apiFetch('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),

  listUsers: (params?: { role?: string; department?: string; search?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch(`/auth/users${qs ? '?' + qs : ''}`);
  },

  createUser: (data: { name: string; email: string; password: string; role: string; department: string }) =>
    apiFetch('/auth/users', { method: 'POST', body: JSON.stringify(data) }),

  toggleUser: (userId: number) =>
    apiFetch(`/auth/users/${userId}/toggle`, { method: 'PUT' }),

  deleteUser: (userId: number) =>
    apiFetch(`/auth/users/${userId}`, { method: 'DELETE' }),
};

// ── Circulars API ────────────────────────────────────────────────────

export const circularsAPI = {
  list: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/circulars${qs ? '?' + qs : ''}`);
  },

  get: (id: number) => apiFetch(`/circulars/${id}`),

  create: (formData: FormData) =>
    apiFetch('/circulars', { method: 'POST', body: formData }),

  update: (id: number, data: Record<string, any>) =>
    apiFetch(`/circulars/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: number) =>
    apiFetch(`/circulars/${id}`, { method: 'DELETE' }),

  downloadUrl: (id: number) => `${API_BASE}/circulars/${id}/download`,

  categorySummary: () => apiFetch('/circulars/categories/summary'),
};

// ── Submissions API ──────────────────────────────────────────────────

export const submissionsAPI = {
  list: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/submissions${qs ? '?' + qs : ''}`);
  },

  get: (id: number) => apiFetch(`/submissions/${id}`),

  create: (formData: FormData) =>
    apiFetch('/submissions', { method: 'POST', body: formData }),

  review: (id: number, action: 'approve' | 'reject', remarks?: string) =>
    apiFetch(`/submissions/${id}/review`, {
      method: 'PUT', body: JSON.stringify({ action, remarks }),
    }),

  mine: () => apiFetch('/submissions/mine'),

  downloadUrl: (id: number) => `${API_BASE}/submissions/${id}/download`,
};

// ── Notifications API ────────────────────────────────────────────────

export const notificationsAPI = {
  list: (unread?: boolean) =>
    apiFetch(`/notifications${unread ? '?unread=true' : ''}`),

  markRead: (id: number) =>
    apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),

  markAllRead: () =>
    apiFetch('/notifications/read-all', { method: 'PUT' }),

  unreadCount: () => apiFetch('/notifications/unread-count'),

  delete: (id: number) =>
    apiFetch(`/notifications/${id}`, { method: 'DELETE' }),
};

// ── Chat API ─────────────────────────────────────────────────────────

export const chatAPI = {
  sendMessage: (data: { receiver_id?: number; group_name?: string; message: string }) =>
    apiFetch('/chat', { method: 'POST', body: JSON.stringify(data) }),

  sendFile: (data: { receiver_id?: number; group_name?: string; message?: string; file: File }) => {
    const formData = new FormData();
    if (data.receiver_id) formData.append('receiver_id', String(data.receiver_id));
    if (data.group_name) formData.append('group_name', data.group_name);
    if (data.message) formData.append('message', data.message);
    formData.append('file', data.file);
    return apiFetch('/chat', { method: 'POST', body: formData });
  },

  downloadUrl: (messageId: number) => `${API_BASE}/chat/download/${messageId}`,

  directMessages: (userId: number) =>
    apiFetch(`/chat/direct/${userId}`),

  groupMessages: (groupName: string) =>
    apiFetch(`/chat/group/${encodeURIComponent(groupName)}`),

  contacts: () => apiFetch('/chat/contacts'),

  groups: () => apiFetch('/chat/groups'),
};

// ── Dashboard API ────────────────────────────────────────────────────

export const dashboardAPI = {
  stats: () => apiFetch('/dashboard/stats'),
  accreditation: () => apiFetch('/dashboard/accreditation'),
  activity: (page?: number) =>
    apiFetch(`/dashboard/activity${page ? '?page=' + page : ''}`),
};

// ── Reports API ──────────────────────────────────────────────────────

export const reportsAPI = {
  data: (academicYear?: string) =>
    apiFetch(`/reports/data${academicYear ? '?academic_year=' + academicYear : ''}`),

  downloadAnnual: (academicYear?: string) => {
    const token = getToken();
    const url = `${API_BASE}/reports/annual${academicYear ? '?academic_year=' + academicYear : ''}`;
    return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.blob());
  },

  downloadDepartment: (department: string, academicYear?: string) => {
    const token = getToken();
    const params = new URLSearchParams({ department });
    if (academicYear) params.set('academic_year', academicYear);
    return fetch(`${API_BASE}/reports/department?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.blob());
  },
};

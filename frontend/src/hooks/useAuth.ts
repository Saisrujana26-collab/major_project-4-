import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

interface AuthUser {
  id?: string;
  role: 'teacher' | 'student';
  name: string;
  rollNo: string;
  systemNo: number;
  token?: string;
}

let cachedUser: AuthUser | null = null;

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    if (cachedUser) return;
    const stored = localStorage.getItem('sa_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        cachedUser = parsed;
        setUser(parsed);
      } catch {
        localStorage.removeItem('sa_user');
      }
    }
    setLoading(false);
  }, []);

  const loginTeacher = useCallback(async (password: string) => {
    const res = await api.post('/auth/teacher/login', { password });
    const userData: AuthUser = { ...res.data, role: 'teacher' };
    cachedUser = userData;
    localStorage.setItem('sa_user', JSON.stringify(userData));
    if (userData.token) localStorage.setItem('sa_token', userData.token);
    setUser(userData);
    return userData;
  }, []);

  const loginStudent = useCallback(async (rollNo: string, systemNo: number, password?: string, name?: string) => {
    const res = await api.post('/auth/student/login', { rollNo, systemNo, password, name });
    const userData: AuthUser = { ...res.data, role: 'student' };
    cachedUser = userData;
    localStorage.setItem('sa_user', JSON.stringify(userData));
    if (userData.token) localStorage.setItem('sa_token', userData.token);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    cachedUser = null;
    localStorage.removeItem('sa_user');
    localStorage.removeItem('sa_token');
    setUser(null);
  }, []);

  return { user, loading, loginTeacher, loginStudent, logout };
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('eduverify_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.success) {
            setUser(res.user);
            setProfile(res.profile);
          }
        } catch (err) {
          console.error('[AuthContext] Verification failed:', err);
          localStorage.removeItem('eduverify_token');
          localStorage.removeItem('eduverify_user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success) {
      localStorage.setItem('eduverify_token', res.token);
      localStorage.setItem('eduverify_user', JSON.stringify(res.user));
      setUser(res.user);
      
      // Fetch full profile if student
      if (res.user.role === 'student') {
        const profileRes = await api.get('/auth/me');
        if (profileRes.success) setProfile(profileRes.profile);
      }
    }
    return res;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.success) {
      localStorage.setItem('eduverify_token', res.token);
      localStorage.setItem('eduverify_user', JSON.stringify(res.user));
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('eduverify_token');
    localStorage.removeItem('eduverify_user');
    setUser(null);
    setProfile(null);
    window.location.href = '/';
  };

  const updateProfile = async (data) => {
    const res = await api.put('/auth/me', data);
    if (res.success) {
      setUser(res.user);
      if (res.profile) setProfile(res.profile);
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

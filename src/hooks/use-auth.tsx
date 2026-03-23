import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Profile } from '@/integrations/supabase/client';
import {
  getTelegramUser,
  getTelegramWebApp,
  formatTelegramId,
  getTelegramDisplayName,
  isInsideTelegram,
  type TelegramUser,
} from '@/hooks/use-telegram';

const PROFILE_API = 'https://ldvlahtoiwimroycqcav.supabase.co/functions/v1/profile-api';

const callApi = async (action: string, body: object) => {
  const res = await fetch(`${PROFILE_API}?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};

interface AuthContextType {
  profile: Profile | null;
  isLoading: boolean;
  login: (telegramId: string, password: string) => Promise<{ error: string | null }>;
  register: (telegramId: string, username: string, password: string) => Promise<{ error: string | null }>;
  registerWithTelegram: (tgUser: TelegramUser, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const tg = getTelegramWebApp();
      if (tg) tg.ready();

      const stored = localStorage.getItem('vibe_profile_id');
      if (stored) {
        await loadProfile(stored);
        return;
      }

      setIsLoading(false);
    };

    init();
  }, []);

  const loadProfile = async (profileId: string) => {
    const data = await callApi('get-profile', { profileId });

    if (data.profile) {
      setProfile(data.profile as Profile);
    } else {
      localStorage.removeItem('vibe_profile_id');
    }
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    if (!profile) return;
    const data = await callApi('get-profile', { profileId: profile.id });
    if (data.profile) setProfile(data.profile as Profile);
  };

  const login = async (telegramId: string, password: string): Promise<{ error: string | null }> => {
    const data = await callApi('login', { telegramId, password });

    if (data.error) return { error: data.error };

    setProfile(data.profile as Profile);
    localStorage.setItem('vibe_profile_id', data.profile.id);
    return { error: null };
  };

  const registerWithTelegram = async (tgUser: TelegramUser, password: string): Promise<{ error: string | null }> => {
    const telegramId = formatTelegramId(tgUser.id);
    const username = getTelegramDisplayName(tgUser);

    const data = await callApi('register', {
      telegramId,
      username,
      password,
      avatarUrl: tgUser.photo_url || null,
    });

    if (data.error) return { error: data.error };

    setProfile(data.profile as Profile);
    localStorage.setItem('vibe_profile_id', data.profile.id);
    return { error: null };
  };

  const register = async (telegramId: string, username: string, password: string): Promise<{ error: string | null }> => {
    const data = await callApi('register', { telegramId, username, password });

    if (data.error) return { error: data.error };

    setProfile(data.profile as Profile);
    localStorage.setItem('vibe_profile_id', data.profile.id);
    return { error: null };
  };

  const logout = () => {
    setProfile(null);
    localStorage.removeItem('vibe_profile_id');
  };

  return (
    <AuthContext.Provider value={{ profile, isLoading, login, register, registerWithTelegram, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
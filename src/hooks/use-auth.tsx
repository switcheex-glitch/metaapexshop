import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Profile } from '@/integrations/supabase/client';
import { supabase } from '@/integrations/supabase/client';
import {
  getTelegramWebApp,
  formatTelegramId,
  getTelegramDisplayName,
  type TelegramUser,
} from '@/hooks/use-telegram';

const hashPassword = async (password: string): Promise<string> => {
  const data = new TextEncoder().encode(password + 'vibe_salt_2024');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error || !data) {
        localStorage.removeItem('vibe_profile_id');
      } else {
        setProfile(data as Profile);
        // обновляем last_seen
        await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', profileId);
      }
    } catch (e) {
      console.error('[auth] loadProfile error:', e);
      localStorage.removeItem('vibe_profile_id');
    }
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    if (!profile) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', profile.id).single();
    if (data) setProfile(data as Profile);
  };

  const login = async (telegramId: string, password: string): Promise<{ error: string | null }> => {
    try {
      const formattedId = telegramId.startsWith('@') ? telegramId : `@${telegramId}`;
      const hash = await hashPassword(password);

      // Проверяем существование аккаунта
      const { data: exists } = await supabase
        .from('profiles')
        .select('id')
        .eq('telegram_id', formattedId)
        .maybeSingle();

      if (!exists) {
        return { error: 'Аккаунт не найден. Создайте новый.' };
      }

      // Проверяем пароль
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('telegram_id', formattedId)
        .eq('password_hash', hash)
        .maybeSingle();

      if (error || !data) {
        return { error: 'Неверный пароль' };
      }

      if (data.is_blocked) {
        return { error: '🚫 Ваш профиль заблокирован. Обратитесь в поддержку.' };
      }

      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', data.id);
      setProfile(data as Profile);
      localStorage.setItem('vibe_profile_id', data.id);
      return { error: null };
    } catch (e) {
      console.error('[auth] login error:', e);
      return { error: 'Ошибка соединения. Попробуйте позже.' };
    }
  };

  const register = async (telegramId: string, username: string, password: string): Promise<{ error: string | null }> => {
    try {
      const formattedId = telegramId.startsWith('@') ? telegramId : `@${telegramId}`;

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('telegram_id', formattedId)
        .maybeSingle();

      if (existing) {
        return { error: 'Аккаунт с этим Telegram ID уже существует. Войдите с паролем.' };
      }

      const hash = await hashPassword(password);
      const { data, error } = await supabase
        .from('profiles')
        .insert({ telegram_id: formattedId, username, password_hash: hash, balance: 0 })
        .select()
        .single();

      if (error || !data) {
        console.error('[auth] register error:', error);
        return { error: 'Ошибка при регистрации. Попробуйте снова.' };
      }

      setProfile(data as Profile);
      localStorage.setItem('vibe_profile_id', data.id);
      return { error: null };
    } catch (e) {
      console.error('[auth] register error:', e);
      return { error: 'Ошибка соединения. Попробуйте позже.' };
    }
  };

  const registerWithTelegram = async (tgUser: TelegramUser, password: string): Promise<{ error: string | null }> => {
    const telegramId = formatTelegramId(tgUser.id);
    const username = getTelegramDisplayName(tgUser);
    return register(telegramId, username, password);
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

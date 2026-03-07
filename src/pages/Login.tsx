"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ArrowRight, Sparkles, Shield, User } from 'lucide-react';
import {
  getTelegramUser,
  getTelegramWebApp,
  formatTelegramId,
  getTelegramDisplayName,
  isInsideTelegram,
  type TelegramUser,
} from '@/hooks/use-telegram';
import AgreementModal from '@/components/AgreementModal';

const Login = () => {
  const navigate = useNavigate();
  const { login, registerWithTelegram, register } = useAuth();

  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  const [manualTelegramId, setManualTelegramId] = useState('');
  const [manualUsername, setManualUsername] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'auto' | 'login' | 'register'>('auto');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  // Agreement
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    const agreed = localStorage.getItem('vibe_agreed_terms');
    if (agreed === '1') setAgreedToTerms(true);
  }, []);

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg) {
      tg.ready();
      tg.expand();
    }

    const user = getTelegramUser();
    const inside = isInsideTelegram();

    setTgUser(user);
    setIsTelegram(inside);
    setIsCheckingUser(false);
  }, []);

  const telegramIdFormatted = tgUser ? formatTelegramId(tgUser.id) : null;
  const displayName = tgUser ? getTelegramDisplayName(tgUser) : null;

  const doSubmit = async () => {
    setError('');

    if (isTelegram && tgUser) {
      if (!password) { setError('Введите пароль'); return; }

      if (mode === 'register') {
        if (password.length < 4) { setError('Пароль должен быть не менее 4 символов'); return; }
        if (password !== confirmPassword) { setError('Пароли не совпадают'); return; }
      }

      setIsLoading(true);
      const result = mode === 'register'
        ? await registerWithTelegram(tgUser, password)
        : await login(telegramIdFormatted!, password);

      if (result.error) {
        if (result.error.includes('не найден') || result.error.includes('Неверный')) {
          setError('Аккаунт не найден. Создайте новый пароль для регистрации.');
          setMode('register');
        } else {
          setError(result.error);
        }
      } else {
        navigate('/');
      }
      setIsLoading(false);

    } else {
      if (!manualTelegramId || !password) { setError('Заполните все поля'); return; }
      if (mode === 'register') {
        if (!manualUsername) { setError('Введите имя пользователя'); return; }
        if (password !== confirmPassword) { setError('Пароли не совпадают'); return; }
      }

      setIsLoading(true);
      const result = mode === 'register'
        ? await register(manualTelegramId, manualUsername, password)
        : await login(manualTelegramId, password);

      if (result.error) {
        setError(result.error);
      } else {
        navigate('/');
      }
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!agreedToTerms) {
      setShowAgreement(true);
      return;
    }
    doSubmit();
  };

  const handleAgreementAccept = () => {
    localStorage.setItem('vibe_agreed_terms', '1');
    setAgreedToTerms(true);
    setShowAgreement(false);
    doSubmit();
  };

  const handleAgreementDecline = () => {
    setShowAgreement(false);
  };

  if (isCheckingUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-0 sm:p-4 font-sans text-white">
      <AgreementModal
        isOpen={showAgreement}
        onAccept={handleAgreementAccept}
        onDecline={handleAgreementDecline}
      />

      <div className="relative w-full max-w-[1024px] h-screen sm:h-[768px] bg-black rounded-none sm:rounded-[40px] border-0 sm:border-[12px] border-zinc-900 overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)]">

        {/* Header */}
        <header className="pt-6 sm:pt-10 pb-4 sm:pb-6 px-5 sm:px-12 flex justify-between items-center bg-black/50 backdrop-blur-xl z-20">
          <div>
            <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Store</h1>
            <p className="text-lg sm:text-xl font-black tracking-tighter uppercase italic">Apex Technology</p>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto flex items-start sm:items-center justify-center px-5 sm:px-12 pb-6 pt-4 sm:pt-0">
          <div className="w-full max-w-[480px] space-y-5 sm:space-y-8">

            {/* === TELEGRAM MODE === */}
            {isTelegram && tgUser ? (
              <>
                {/* Карточка пользователя Telegram */}
                <div className="flex items-center gap-4 sm:gap-5 bg-zinc-900/60 border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 flex items-center justify-center border-2 border-white/10">
                    {tgUser.photo_url ? (
                      <img src={tgUser.photo_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl sm:text-2xl font-black text-white/40 uppercase">
                        {(tgUser.first_name || 'U').charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg sm:text-xl font-black tracking-tight">{displayName}</p>
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                    </div>
                    <p className="text-zinc-500 text-xs sm:text-sm font-mono">ID: {tgUser.id}</p>
                    {tgUser.username && (
                      <p className="text-zinc-600 text-xs">@{tgUser.username}</p>
                    )}
                  </div>
                </div>

                {/* Заголовок */}
                <div className="space-y-1">
                  <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none">
                    {mode === 'register' ? 'Придумайте пароль' : 'Введите пароль'}
                  </h2>
                  <p className="text-zinc-500 text-sm">
                    {mode === 'register'
                      ? 'Создайте пароль для вашего аккаунта.'
                      : 'Введите пароль от вашего аккаунта Apex Technology.'}
                  </p>
                </div>

                {/* Поля */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500 px-1">
                      {mode === 'register' ? 'Новый пароль' : 'Пароль'}
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        className="bg-zinc-900/50 border-white/5 h-12 sm:h-16 rounded-2xl text-base sm:text-lg font-bold pr-14 focus:border-white/20 transition-all"
                        autoFocus
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500 px-1">Повторите пароль</label>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        className="bg-zinc-900/50 border-white/5 h-12 sm:h-16 rounded-2xl text-base sm:text-lg font-bold focus:border-white/20 transition-all"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 sm:p-4">
                      <p className="text-red-400 text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full h-12 sm:h-16 bg-white text-black hover:bg-zinc-200 rounded-2xl text-base sm:text-lg font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <span className="flex items-center gap-3">
                        {mode === 'register' ? 'Создать аккаунт' : 'Войти'}
                        <ArrowRight size={18} />
                      </span>
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setPassword(''); setConfirmPassword(''); }}
                      className="text-zinc-500 hover:text-white transition-colors text-sm font-medium"
                    >
                      {mode === 'login'
                        ? 'Нет аккаунта? Создать новый'
                        : 'Уже есть аккаунт? Войти'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-zinc-700 text-xs">
                  <Shield size={14} />
                  <span>Ваш Telegram ID определён автоматически и защищён</span>
                </div>
              </>
            ) : (
              /* === БРАУЗЕР / DEV MODE === */
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-zinc-900/40 border border-yellow-500/20 rounded-2xl px-4 py-3">
                    <User size={14} className="text-yellow-500 flex-shrink-0" />
                    <p className="text-yellow-500/80 text-xs">Открыто вне Telegram — ручной ввод ID</p>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter leading-none pt-2">
                    {mode === 'register' ? 'Регистрация' : 'Войти'}
                  </h2>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500 px-1">Telegram ID</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-base">@</span>
                      <Input
                        placeholder="username или id_123456"
                        value={manualTelegramId.replace('@', '')}
                        onChange={(e) => setManualTelegramId(e.target.value)}
                        className="bg-zinc-900/50 border-white/5 h-12 sm:h-16 rounded-2xl text-base sm:text-lg font-bold pl-9 focus:border-white/20 transition-all"
                      />
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500 px-1">Имя пользователя</label>
                      <Input
                        placeholder="Как вас зовут?"
                        value={manualUsername}
                        onChange={(e) => setManualUsername(e.target.value)}
                        className="bg-zinc-900/50 border-white/5 h-12 sm:h-16 rounded-2xl text-base sm:text-lg font-bold focus:border-white/20 transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500 px-1">Пароль</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        className="bg-zinc-900/50 border-white/5 h-12 sm:h-16 rounded-2xl text-base sm:text-lg font-bold pr-14 focus:border-white/20 transition-all"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500 px-1">Повторите пароль</label>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        className="bg-zinc-900/50 border-white/5 h-12 sm:h-16 rounded-2xl text-base sm:text-lg font-bold focus:border-white/20 transition-all"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 sm:p-4">
                      <p className="text-red-400 text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full h-12 sm:h-16 bg-white text-black hover:bg-zinc-200 rounded-2xl text-base sm:text-lg font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <span className="flex items-center gap-3">
                        {mode === 'register' ? 'Создать аккаунт' : 'Войти'}
                        <ArrowRight size={18} />
                      </span>
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                      className="text-zinc-500 hover:text-white transition-colors text-sm font-medium"
                    >
                      {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        <div className="h-10 sm:h-20 border-t border-white/5 bg-black/80 backdrop-blur-xl" />
      </div>
    </div>
  );
};

export default Login;
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Copy, CheckCircle, RefreshCw, Zap, Timer, Shield, ChevronRight, AlertTriangle } from 'lucide-react';
import MiniAppPurchase from '@/components/MiniAppPurchase';

// Telegram WebApp types handled via window.Telegram?.WebApp access

const SUPABASE_URL = 'https://ldvlahtoiwimroycqcav.supabase.co';
const SECURE_API = `${SUPABASE_URL}/functions/v1/secure-api`;
const ISSUE_TOKEN_API = `${SUPABASE_URL}/functions/v1/jarvis-bot-issue-token`;

const TIER_CONFIG: Record<string, {
  label: string; color: string; glow: string; border: string;
  bg: string; barFill: string; barEmpty: string; dots: number; accentText: string;
}> = {
  mk1: {
    label: 'MK-I', color: '#22d3ee', glow: 'shadow-cyan-500/40',
    border: 'border-cyan-500/40', bg: 'bg-cyan-950/20',
    barFill: 'bg-cyan-400', barEmpty: 'bg-cyan-950/60',
    dots: 3, accentText: 'text-cyan-400',
  },
  mk2: {
    label: 'MK-II', color: '#4ade80', glow: 'shadow-green-500/40',
    border: 'border-green-500/40', bg: 'bg-green-950/20',
    barFill: 'bg-green-400', barEmpty: 'bg-green-950/60',
    dots: 6, accentText: 'text-green-400',
  },
  mk3: {
    label: 'MK-III', color: '#f87171', glow: 'shadow-red-500/40',
    border: 'border-red-500/40', bg: 'bg-red-950/20',
    barFill: 'bg-red-400', barEmpty: 'bg-red-950/60',
    dots: 10, accentText: 'text-red-400',
  },
};

interface Subscription {
  id: string;
  tier: string;
  tier_name: string;
  tokens: number;
  price: number;
  access_start: string;
  access_end: string;
  status: string;
  token?: string;
}

type Screen = 'loading' | 'no_profile' | 'no_access' | 'dashboard' | 'token_detail' | 'error';

// Сканирующая линия HUD
const ScanLine: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-inherit">
    <div className="scan-line" />
  </div>
);

// Угловые декорации HUD
const HudCorners: React.FC<{ color?: string }> = ({ color = '#22d3ee' }) => (
  <>
    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-sm" style={{ borderColor: color }} />
    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-sm" style={{ borderColor: color }} />
    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-sm" style={{ borderColor: color }} />
    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-sm" style={{ borderColor: color }} />
  </>
);

// Прогресс-бар тарифа
const TierBar: React.FC<{ tier: string; filled: number; total: number }> = ({ tier, filled, total }) => {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.mk1;
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < filled ? cfg.barFill : cfg.barEmpty}`}
          style={i < filled ? { boxShadow: `0 0 6px ${cfg.color}80` } : {}}
        />
      ))}
    </div>
  );
};

// Пульсирующий индикатор
const PulseIndicator: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className="relative w-2 h-2">
      <div className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ backgroundColor: color }} />
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
  </div>
);

const MiniApp: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('loading');
  const [tgUser, setTgUser] = useState<{ id: number; username: string } | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingToken, setLoadingToken] = useState(false);
  const [scanActive, setScanActive] = useState(false);
  const [bootText, setBootText] = useState('');
  const [showPurchase, setShowPurchase] = useState(false);

  const tg = window.Telegram?.WebApp;

  // Boot sequence анимация
  useEffect(() => {
    const lines = [
      'INITIALIZING J.A.R.V.I.S...',
      'LOADING APEX TECHNOLOGY CORE...',
      'AUTHENTICATING USER...',
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < lines.length) {
        setBootText(lines[i]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Инициализация Telegram WebApp
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }

    // Получаем пользователя из Telegram
    const user = tg?.initDataUnsafe?.user;
    if (user) {
      setTgUser({ id: user.id, username: user.username || user.first_name || String(user.id) });
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!tgUser) return;

    setScanActive(true);
    try {
      // Используем secure-api вместо прямых запросов к БД
      const res = await fetch(`${SECURE_API}?action=miniapp-load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: tgUser.id }),
      });
      const data = await res.json();

      if (data.screen === 'no_profile') {
        setScreen('no_profile');
        setScanActive(false);
        return;
      }

      if (data.screen === 'blocked' || data.screen === 'no_access') {
        setScreen(data.screen === 'blocked' ? 'no_profile' : 'no_access');
        setScanActive(false);
        return;
      }

      if (data.screen === 'dashboard' && data.subscriptions) {
        setSubscriptions(data.subscriptions);
        setScreen('dashboard');
        if (data.subscriptions.length === 1) {
          setSelectedSub(data.subscriptions[0]);
        }
      } else {
        setScreen('error');
      }
    } catch (e) {
      console.error('MiniApp loadData error:', e);
      setScreen('error');
    }
    setScanActive(false);
  }, [tgUser]);

  useEffect(() => {
    if (tgUser) {
      setTimeout(() => loadData(), 1200);
    }
  }, [tgUser, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    tg?.HapticFeedback?.impactOccurred('light');
    await loadData();
    setRefreshing(false);
  };

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    tg?.HapticFeedback?.notificationOccurred('success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGetToken = async (sub: Subscription) => {
    setLoadingToken(true);
    tg?.HapticFeedback?.impactOccurred('medium');
    try {
      const res = await fetch(ISSUE_TOKEN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: sub.id, telegramId: tgUser?.id }),
      });
      const data = await res.json();
      if (data.token) {
        setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, token: data.token } : s));
        setSelectedSub(prev => prev?.id === sub.id ? { ...prev, token: data.token } : prev);
        tg?.HapticFeedback?.notificationOccurred('success');
      }
    } catch (e) {
      console.error('handleGetToken error:', e);
    }
    setLoadingToken(false);
  };

  const getDaysLeft = (accessEnd: string) => {
    const diff = new Date(accessEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getProgressPercent = (accessStart: string, accessEnd: string) => {
    const total = new Date(accessEnd).getTime() - new Date(accessStart).getTime();
    const elapsed = Date.now() - new Date(accessStart).getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-6 font-mono">
        <style>{`
          @keyframes scan { 0% { top: -2px; } 100% { top: 100%; } }
          .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #22d3ee40, #22d3ee, #22d3ee40, transparent); animation: scan 2s linear infinite; }
          @keyframes flicker { 0%,100%{opacity:1} 50%{opacity:0.8} }
          .hud-flicker { animation: flicker 3s ease-in-out infinite; }
          @keyframes gridMove { 0%{background-position:0 0} 100%{background-position:40px 40px} }
          .hud-grid { background-image: linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px); background-size: 40px 40px; animation: gridMove 8s linear infinite; }
        `}</style>
        <div className="hud-grid absolute inset-0" />
        <div className="relative z-10 text-center space-y-8">
          {/* Reactor */}
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-cyan-400/50 animate-pulse" />
            <div className="absolute inset-4 rounded-full border border-cyan-300/70" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-cyan-400/20 border border-cyan-400/60 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
              </div>
            </div>
            {[0, 60, 120, 180, 240, 300].map(deg => (
              <div key={deg} className="absolute inset-0 flex items-center justify-center" style={{ transform: `rotate(${deg}deg)` }}>
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 -translate-y-10" />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-cyan-400 text-xs tracking-[0.4em] uppercase hud-flicker">{bootText || 'INITIALIZING...'}</p>
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>

          <div className="text-zinc-700 text-[10px] tracking-widest uppercase">
            APEX TECHNOLOGY · JARVIS INDUSTRIES
          </div>
        </div>
      </div>
    );
  }

  // ── NO PROFILE ───────────────────────────────────────────────────────────
  if (screen === 'no_profile') {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-6 font-mono">
        <style>{`
          @keyframes scan { 0% { top: -2px; } 100% { top: 100%; } }
          .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #f8717140, #f87171, #f8717140, transparent); animation: scan 3s linear infinite; }
        `}</style>
        <div className="w-full max-w-sm space-y-6">
          <div className="relative border border-red-500/30 rounded-2xl p-6 bg-red-950/10 overflow-hidden">
            <ScanLine />
            <HudCorners color="#f87171" />
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full border-2 border-red-500/40 flex items-center justify-center bg-red-950/30">
                <Shield size={28} className="text-red-400" />
              </div>
              <div>
                <p className="text-red-400 text-xs tracking-[0.3em] uppercase mb-2">ACCESS DENIED</p>
                <p className="text-white font-bold text-lg">Профиль не найден</p>
                <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                  Зарегистрируйтесь в магазине Apex Technology и укажите ваш Telegram ID
                </p>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                <p className="text-zinc-600 text-[10px] uppercase tracking-widest mb-1">Ваш Telegram ID</p>
                <p className="text-cyan-400 font-mono text-sm">{tgUser?.id || '—'}</p>
              </div>
              <a
                href="https://t.me/ApexTechnology_bot"
                className="block w-full py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-sm font-bold text-center hover:bg-white/10 transition-all"
              >
                Перейти в магазин @ApexTechnology_bot
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── NO ACCESS ────────────────────────────────────────────────────────────
  if (screen === 'no_access') {
    if (showPurchase && tgUser) {
      return <MiniAppPurchase telegramId={tgUser.id} onBack={() => { setShowPurchase(false); handleRefresh(); }} />;
    }

    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-6 font-mono">
        <style>{`
          @keyframes scan { 0% { top: -2px; } 100% { top: 100%; } }
          .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #fbbf2440, #fbbf24, #fbbf2440, transparent); animation: scan 2.5s linear infinite; }
        `}</style>
        <div className="w-full max-w-sm space-y-4">
          <div className="relative border border-yellow-500/30 rounded-2xl p-6 bg-yellow-950/10 overflow-hidden">
            <ScanLine />
            <HudCorners color="#fbbf24" />
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full border-2 border-yellow-500/40 flex items-center justify-center bg-yellow-950/30">
                <AlertTriangle size={28} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-yellow-400 text-xs tracking-[0.3em] uppercase mb-2">NO SUBSCRIPTION</p>
                <p className="text-white font-bold text-lg">Нет активной подписки</p>
                <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                  Приобретите один из тарифов Jarvis Industries для получения токена
                </p>
              </div>
            </div>
          </div>

          {/* Тарифы */}
          <div className="space-y-2">
            {[
              { tier: 'mk1', tokens: '10 000', price: '1 490 ₽' },
              { tier: 'mk2', tokens: '30 000', price: '3 490 ₽' },
              { tier: 'mk3', tokens: '60 000', price: '5 990 ₽' },
            ].map(t => {
              const cfg = TIER_CONFIG[t.tier];
              return (
                <div key={t.tier} className={`relative border rounded-xl p-3 overflow-hidden ${cfg.border} ${cfg.bg}`}>
                  <HudCorners color={cfg.color} />
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ borderColor: cfg.color + '40', backgroundColor: cfg.color + '10' }}>
                        <Zap size={14} style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <p className="font-black text-white text-sm uppercase">{cfg.label}</p>
                        <p className="text-[10px]" style={{ color: cfg.color }}>{t.tokens} токенов</p>
                      </div>
                    </div>
                    <p className="font-bold text-white text-sm">{t.price}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => { setShowPurchase(true); tg?.HapticFeedback?.impactOccurred('medium'); }}
            className="block w-full py-4 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest text-center active:scale-95 transition-all"
          >
            🛒 Купить подписку
          </button>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ────────────────────────────────────────────────────────────
  const cfg = selectedSub ? TIER_CONFIG[selectedSub.tier] || TIER_CONFIG.mk1 : TIER_CONFIG.mk1;
  const daysLeft = selectedSub ? getDaysLeft(selectedSub.access_end) : 0;
  const progress = selectedSub ? getProgressPercent(selectedSub.access_start, selectedSub.access_end) : 0;
  const daysColor = daysLeft <= 3 ? '#f87171' : daysLeft <= 7 ? '#fbbf24' : cfg.color;

  return (
    <div className="min-h-screen bg-[#030712] font-mono text-white overflow-x-hidden">
      <style>{`
        @keyframes scan { 0% { top: -2px; } 100% { top: 100%; } }
        .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, ${cfg.color}40, ${cfg.color}, ${cfg.color}40, transparent); animation: scan 3s linear infinite; }
        @keyframes gridMove { 0%{background-position:0 0} 100%{background-position:40px 40px} }
        .hud-grid { background-image: linear-gradient(${cfg.color}08 1px, transparent 1px), linear-gradient(90deg, ${cfg.color}08 1px, transparent 1px); background-size: 40px 40px; animation: gridMove 10s linear infinite; }
        @keyframes flicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.7} 94%{opacity:1} }
        .hud-flicker { animation: flicker 4s ease-in-out infinite; }
        @keyframes rotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .reactor-ring { animation: rotate 8s linear infinite; }
        .reactor-ring-rev { animation: rotate 5s linear infinite reverse; }
      `}</style>

      {/* Grid background */}
      <div className="hud-grid fixed inset-0 pointer-events-none" />

      <div className="relative z-10 max-w-sm mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] tracking-[0.4em] uppercase" style={{ color: cfg.color }}>APEX TECHNOLOGY</p>
            <p className="text-white font-black text-lg uppercase tracking-tight hud-flicker">J.A.R.V.I.S</p>
          </div>
          <div className="flex items-center gap-2">
            <PulseIndicator color={cfg.color} label="ONLINE" />
            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl border border-white/10 bg-white/5 active:scale-90 transition-all"
            >
              <RefreshCw size={14} className={`text-zinc-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Reactor + Tier selector */}
        <div className={`relative border rounded-2xl p-5 overflow-hidden ${cfg.border} ${cfg.bg}`}>
          <ScanLine />
          <HudCorners color={cfg.color} />

          <div className="flex items-center gap-4">
            {/* Reactor */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="reactor-ring absolute inset-0 w-full h-full" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke={cfg.color + '20'} strokeWidth="1" />
                <circle cx="40" cy="40" r="36" fill="none" stroke={cfg.color} strokeWidth="1.5"
                  strokeDasharray="30 196" strokeLinecap="round" />
              </svg>
              <svg className="reactor-ring-rev absolute inset-0 w-full h-full" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="28" fill="none" stroke={cfg.color + '30'} strokeWidth="1" />
                <circle cx="40" cy="40" r="28" fill="none" stroke={cfg.color + '80'} strokeWidth="1"
                  strokeDasharray="15 161" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border flex items-center justify-center" style={{ borderColor: cfg.color + '60', backgroundColor: cfg.color + '15' }}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cfg.color, boxShadow: `0 0 16px ${cfg.color}` }} />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-500 mb-0.5">АКТИВНЫЙ ТАРИФ</p>
              <p className="font-black text-xl uppercase" style={{ color: cfg.color }}>
                {selectedSub?.tier_name || 'Jarvis Industries'}
              </p>
              <div className="mt-2">
                <TierBar tier={selectedSub?.tier || 'mk1'} filled={cfg.dots} total={10} />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Zap size={10} style={{ color: cfg.color }} />
                  <span className="text-[10px] font-bold" style={{ color: cfg.color }}>
                    {selectedSub?.tokens.toLocaleString('ru-RU')} токенов
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tier switcher если несколько */}
          {subscriptions.length > 1 && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
              {subscriptions.map(sub => {
                const c = TIER_CONFIG[sub.tier] || TIER_CONFIG.mk1;
                return (
                  <button
                    key={sub.id}
                    onClick={() => { setSelectedSub(sub); tg?.HapticFeedback?.impactOccurred('light'); }}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      selectedSub?.id === sub.id
                        ? 'text-black'
                        : 'bg-transparent text-zinc-500'
                    }`}
                    style={selectedSub?.id === sub.id
                      ? { backgroundColor: c.color, borderColor: c.color }
                      : { borderColor: c.color + '40' }
                    }
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Timer block */}
        {selectedSub && (
          <div className="relative border border-white/10 rounded-2xl p-4 bg-white/3 overflow-hidden">
            <HudCorners color={daysColor} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Timer size={14} style={{ color: daysColor }} />
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Подписка</p>
              </div>
              <p className="text-[10px] text-zinc-600 font-mono">
                до {new Date(selectedSub.access_end).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${100 - progress}%`,
                  backgroundColor: daysColor,
                  boxShadow: `0 0 8px ${daysColor}80`,
                }}
              />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Осталось</p>
                <p className="font-black text-3xl" style={{ color: daysColor, textShadow: `0 0 20px ${daysColor}60` }}>
                  {daysLeft}
                  <span className="text-sm ml-1 font-bold">дн.</span>
                </p>
              </div>
              {daysLeft <= 5 && (
                <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5">
                  <AlertTriangle size={11} className="text-red-400" />
                  <p className="text-[10px] text-red-400 font-bold">Скоро истекает!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Token block */}
        {selectedSub && (
          <div className={`relative border rounded-2xl p-5 overflow-hidden ${cfg.border} ${cfg.bg}`}>
            <ScanLine />
            <HudCorners color={cfg.color} />

            <p className="text-[9px] tracking-[0.3em] uppercase mb-3" style={{ color: cfg.color }}>
              🔐 ТОКЕН ДОСТУПА
            </p>

            {selectedSub.token ? (
              <div className="space-y-3">
                {/* Token display */}
                <div className="relative bg-black/60 border border-white/10 rounded-xl p-4 overflow-hidden">
                  <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: `repeating-linear-gradient(0deg, ${cfg.color} 0px, ${cfg.color} 1px, transparent 1px, transparent 20px)`
                  }} />
                  <p className="font-mono text-base font-black tracking-widest text-center relative z-10" style={{ color: cfg.color, textShadow: `0 0 20px ${cfg.color}60` }}>
                    {selectedSub.token}
                  </p>
                </div>

                {/* Copy button */}
                <button
                  onClick={() => handleCopy(selectedSub.token!)}
                  className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{
                    backgroundColor: copied ? '#4ade80' : cfg.color,
                    color: '#000',
                    boxShadow: `0 0 20px ${copied ? '#4ade8060' : cfg.color + '60'}`,
                  }}
                >
                  {copied ? (
                    <><CheckCircle size={16} /> Скопировано!</>
                  ) : (
                    <><Copy size={16} /> Скопировать токен</>
                  )}
                </button>

                <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
                  Введите токен при запуске приложения Jarvis Industries
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-zinc-500 text-sm">Токен ещё не выдан</p>
                  <p className="text-zinc-700 text-[10px] mt-1">Нажмите кнопку для получения</p>
                </div>
                <button
                  onClick={() => handleGetToken(selectedSub)}
                  disabled={loadingToken}
                  className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: cfg.color, color: '#000', boxShadow: `0 0 20px ${cfg.color}40` }}
                >
                  {loadingToken ? (
                    <><RefreshCw size={16} className="animate-spin" /> Генерация...</>
                  ) : (
                    <><Zap size={16} /> Получить токен</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Тариф', value: selectedSub ? TIER_CONFIG[selectedSub.tier]?.label : '—', icon: <Shield size={12} /> },
            { label: 'Токены', value: selectedSub ? selectedSub.tokens.toLocaleString('ru-RU') : '—', icon: <Zap size={12} /> },
          ].map((card, i) => (
            <div key={i} className="relative border border-white/8 rounded-xl p-3 bg-white/3 overflow-hidden">
              <HudCorners color={cfg.color + '60'} />
              <div className="flex items-center gap-1.5 mb-1" style={{ color: cfg.color }}>
                {card.icon}
                <p className="text-[9px] uppercase tracking-widest text-zinc-600">{card.label}</p>
              </div>
              <p className="font-black text-white text-sm">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Support link */}
        <a
          href="https://t.me/vibetechhSupport"
          className="flex items-center justify-between w-full border border-white/8 rounded-xl p-3 bg-white/3 active:bg-white/8 transition-all"
        >
          <span className="text-zinc-500 text-xs">Поддержка · @vibetechhSupport</span>
          <ChevronRight size={14} className="text-zinc-600" />
        </a>

        <div className="h-4" />
      </div>
    </div>
  );
};

export default MiniApp;
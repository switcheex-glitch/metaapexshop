"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, LogOut, Users, Timer, CheckCircle, XCircle,
  Clock, Zap, Search, ChevronDown, AlertTriangle, Ban, ArrowLeft
} from 'lucide-react';

const SUPABASE_URL = 'https://ldvlahtoiwimroycqcav.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkdmxhaHRvaXdpbXJveWNxY2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDIwODksImV4cCI6MjA4ODExODA4OX0.DCM-xvruLo2Sho-6I_o87aa5OENCgxCfmyYptMk86BE';
const ADMIN_PASSWORD = 'ApexAdmin2025';

const TIER_COLORS: Record<string, { border: string; bg: string; badge: string; text: string; dot: string }> = {
  mk1: { border: 'border-cyan-500/30',  bg: 'bg-cyan-950/20',  badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',  text: 'text-cyan-400',  dot: 'bg-cyan-400' },
  mk2: { border: 'border-green-500/30', bg: 'bg-green-950/20', badge: 'bg-green-500/20 text-green-300 border-green-500/30', text: 'text-green-400', dot: 'bg-green-400' },
  mk3: { border: 'border-red-500/30',   bg: 'bg-red-950/20',   badge: 'bg-red-500/20 text-red-300 border-red-500/30',       text: 'text-red-400',   dot: 'bg-red-400' },
};

const TIER_NAMES: Record<string, string> = {
  mk1: 'MK-I',
  mk2: 'MK-II',
  mk3: 'MK-III',
};

type FilterTier = 'all' | 'mk1' | 'mk2' | 'mk3';
type FilterStatus = 'all' | 'active' | 'expiring' | 'expired' | 'pending';

interface JIPurchase {
  id: string;
  profile_id: string;
  tier: string;
  tier_name: string;
  tokens: number;
  price: number;
  status: string;
  payment_method: string;
  username: string;
  telegram_id: string;
  purchased_at: string;
  reviewed_at: string | null;
  access_start: string | null;
  access_end: string | null;
  warned_3days: boolean;
  warned_1day: boolean;
  invited_to_group: boolean;
  profiles?: { username: string; telegram_id: string } | null;
}

function getDaysLeft(accessEnd: string | null): number | null {
  if (!accessEnd) return null;
  const diff = new Date(accessEnd).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDaysLeftLabel(days: number | null): { label: string; color: string; bg: string } {
  if (days === null) return { label: '—', color: 'text-zinc-600', bg: 'bg-zinc-800/40' };
  if (days <= 0)  return { label: 'Истёк', color: 'text-zinc-500', bg: 'bg-zinc-800/40' };
  if (days <= 1)  return { label: `${days} день`, color: 'text-red-400', bg: 'bg-red-500/10' };
  if (days <= 3)  return { label: `${days} дня`, color: 'text-orange-400', bg: 'bg-orange-500/10' };
  if (days <= 7)  return { label: `${days} дней`, color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  return { label: `${days} дней`, color: 'text-green-400', bg: 'bg-green-500/10' };
}

const AdminJarvis: React.FC = () => {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [purchases, setPurchases] = useState<JIPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState<FilterTier>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [runningCheck, setRunningCheck] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/jarvis_industries_purchases?select=*,profiles(username,telegram_id)&order=purchased_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setPurchases(data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error('AdminJarvis loadData error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('apex_admin_authed');
    if (saved === '1') setAuthed(true);
  }, []);

  useEffect(() => {
    if (authed) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [authed, loadData]);

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthed(true);
      sessionStorage.setItem('apex_admin_authed', '1');
    } else {
      setPasswordError('Неверный пароль');
      setPasswordInput('');
    }
  };

  const handleRunCheck = async () => {
    setRunningCheck(true);
    setCheckResult(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/check-subscriptions`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      setCheckResult(
        `✅ Проверено: ${data.checked} | Кикнуто: ${data.kicked} | Предупреждено (3д): ${data.warned_3days} | (1д): ${data.warned_1day}`
      );
      await loadData();
    } catch (e) {
      setCheckResult('❌ Ошибка запуска проверки');
    }
    setRunningCheck(false);
  };

  // Фильтрация
  const filtered = purchases.filter(p => {
    const name = (p.profiles?.username || p.username || '').toLowerCase();
    const tgId = (p.profiles?.telegram_id || p.telegram_id || '').toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || tgId.includes(search.toLowerCase());
    const matchTier = filterTier === 'all' || p.tier === filterTier;

    const days = getDaysLeft(p.access_end);
    let matchStatus = true;
    if (filterStatus === 'active')   matchStatus = p.status === 'approved' && days !== null && days > 3;
    if (filterStatus === 'expiring') matchStatus = p.status === 'approved' && days !== null && days <= 3 && days > 0;
    if (filterStatus === 'expired')  matchStatus = p.status === 'expired' || (days !== null && days <= 0);
    if (filterStatus === 'pending')  matchStatus = p.status === 'pending';

    return matchSearch && matchTier && matchStatus;
  });

  // Статистика
  const stats = {
    total: purchases.filter(p => p.status === 'approved' || p.status === 'expired').length,
    active: purchases.filter(p => p.status === 'approved' && getDaysLeft(p.access_end) !== null && (getDaysLeft(p.access_end) ?? 0) > 0).length,
    expiring: purchases.filter(p => p.status === 'approved' && getDaysLeft(p.access_end) !== null && (getDaysLeft(p.access_end) ?? 99) <= 3 && (getDaysLeft(p.access_end) ?? 0) > 0).length,
    expired: purchases.filter(p => p.status === 'expired' || (p.status === 'approved' && getDaysLeft(p.access_end) !== null && (getDaysLeft(p.access_end) ?? 1) <= 0)).length,
    pending: purchases.filter(p => p.status === 'pending').length,
    mk1: purchases.filter(p => p.tier === 'mk1' && p.status === 'approved').length,
    mk2: purchases.filter(p => p.tier === 'mk2' && p.status === 'approved').length,
    mk3: purchases.filter(p => p.tier === 'mk3' && p.status === 'approved').length,
  };

  // ── AUTH SCREEN ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Admin Panel</h1>
            <p className="text-zinc-500 text-sm mt-1">Jarvis Industries · Apex Technology</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Пароль администратора"
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-zinc-600 outline-none focus:border-white/30 text-sm"
            />
            {passwordError && <p className="text-red-400 text-xs px-1">{passwordError}</p>}
            <button
              onClick={handleLogin}
              className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl hover:bg-zinc-200 transition-all active:scale-95"
            >
              Войти
            </button>
          </div>
          <button onClick={() => navigate('/')} className="w-full text-zinc-600 text-sm hover:text-zinc-400 transition-colors flex items-center justify-center gap-2">
            <ArrowLeft size={14} /> Вернуться в магазин
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN PANEL ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">Jarvis Industries</h1>
              <p className="text-zinc-500 text-xs">Управление подписками · Apex Technology</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] text-zinc-600 hidden sm:block">
                Обновлено: {lastUpdated.toLocaleTimeString('ru-RU')}
              </span>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-white' : 'text-zinc-400'} />
            </button>
            <button
              onClick={handleRunCheck}
              disabled={runningCheck}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-black font-black text-xs uppercase rounded-xl hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {runningCheck ? <RefreshCw size={14} className="animate-spin" /> : <Timer size={14} />}
              Запустить проверку
            </button>
            <button
              onClick={() => { sessionStorage.removeItem('apex_admin_authed'); setAuthed(false); }}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-zinc-400"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Check result */}
        {checkResult && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-zinc-300">
            {checkResult}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Активных', value: stats.active, icon: <CheckCircle size={16} />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
            { label: 'Истекают (≤3д)', value: stats.expiring, icon: <AlertTriangle size={16} />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
            { label: 'Истекло', value: stats.expired, icon: <XCircle size={16} />, color: 'text-zinc-500', bg: 'bg-zinc-800/40 border-zinc-700/30' },
            { label: 'На рассмотрении', value: stats.pending, icon: <Clock size={16} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          ].map((s, i) => (
            <div key={i} className={`rounded-2xl border p-4 ${s.bg}`}>
              <div className={`${s.color} mb-2`}>{s.icon}</div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tier breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {(['mk1', 'mk2', 'mk3'] as const).map(tier => {
            const c = TIER_COLORS[tier];
            return (
              <div key={tier} className={`rounded-2xl border p-4 ${c.border} ${c.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className={`text-xs font-black uppercase ${c.text}`}>{TIER_NAMES[tier]}</span>
                </div>
                <div className="text-2xl font-black text-white">{stats[tier]}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">активных</div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по нику или Telegram ID..."
              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/30"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'mk1', 'mk2', 'mk3'] as FilterTier[]).map(t => (
              <button
                key={t}
                onClick={() => setFilterTier(t)}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                  filterTier === t
                    ? 'bg-white text-black'
                    : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10'
                }`}
              >
                {t === 'all' ? 'Все тарифы' : TIER_NAMES[t]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              { v: 'all', l: 'Все' },
              { v: 'active', l: '✅ Активные' },
              { v: 'expiring', l: '⚠️ Истекают' },
              { v: 'expired', l: '❌ Истекли' },
              { v: 'pending', l: '⏳ Ожидают' },
            ] as { v: FilterStatus; l: string }[]).map(({ v, l }) => (
              <button
                key={v}
                onClick={() => setFilterStatus(v)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === v
                    ? 'bg-white text-black'
                    : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <p className="text-[11px] text-zinc-600 uppercase tracking-widest px-1">
          Показано: {filtered.length} из {purchases.length}
        </p>

        {/* Table */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-zinc-600">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">Нет записей</p>
            </div>
          ) : (
            filtered.map(p => {
              const displayName = p.profiles?.username || p.username || '—';
              const displayTgId = p.profiles?.telegram_id || p.telegram_id || '—';
              const tierColor = TIER_COLORS[p.tier] || TIER_COLORS.mk1;
              const days = getDaysLeft(p.access_end);
              const daysInfo = getDaysLeftLabel(days);
              const isExpiring = days !== null && days <= 3 && days > 0;
              const isExpired = p.status === 'expired' || (days !== null && days <= 0);

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    isExpired
                      ? 'border-zinc-700/30 bg-zinc-900/20 opacity-60'
                      : isExpiring
                      ? 'border-orange-500/30 bg-orange-950/10'
                      : `${tierColor.border} ${tierColor.bg}`
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">

                    {/* Left: user info */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar placeholder */}
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-sm uppercase border ${tierColor.border} ${tierColor.bg}`}>
                        <span className={tierColor.text}>{displayName.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{displayName}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${tierColor.badge}`}>
                            {TIER_NAMES[p.tier] || p.tier}
                          </span>
                          {p.status === 'pending' && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                              ОЖИДАЕТ
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 font-mono mt-0.5">{displayTgId}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                            <Zap size={9} />{p.tokens?.toLocaleString('ru-RU')} токенов
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            Куплено: {new Date(p.purchased_at).toLocaleDateString('ru-RU')}
                          </span>
                          {p.access_start && (
                            <span className="text-[10px] text-zinc-600">
                              Активирован: {new Date(p.access_start).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: days left */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {/* Days left badge — ГЛАВНЫЙ ЭЛЕМЕНТ */}
                      {p.status === 'approved' || p.status === 'expired' ? (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${daysInfo.bg} ${
                          isExpired ? 'border-zinc-700/30' : isExpiring ? 'border-orange-500/20' : 'border-green-500/20'
                        }`}>
                          <Timer size={13} className={daysInfo.color} />
                          <div className="text-right">
                            <p className={`text-base font-black leading-none ${daysInfo.color}`}>
                              {daysInfo.label}
                            </p>
                            <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">
                              {isExpired ? 'подписка' : 'осталось'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                          <Clock size={13} className="text-yellow-400" />
                          <p className="text-xs font-black text-yellow-400">Ожидает</p>
                        </div>
                      )}

                      {/* Access end date */}
                      {p.access_end && (
                        <p className="text-[10px] text-zinc-600 font-mono">
                          до {new Date(p.access_end).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          {' '}
                          {new Date(p.access_end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}

                      {/* Warning indicators */}
                      <div className="flex gap-1">
                        {p.warned_3days && (
                          <span className="text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded-lg">
                            ⚠️ 3д
                          </span>
                        )}
                        {p.warned_1day && (
                          <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-lg">
                            🔴 1д
                          </span>
                        )}
                        {p.invited_to_group && (
                          <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-lg">
                            ✓ в группе
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default AdminJarvis;

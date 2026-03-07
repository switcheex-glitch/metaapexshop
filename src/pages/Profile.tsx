"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, Calendar, Clock, ShoppingBag, LogOut, ChevronRight, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCurrency } from '@/hooks/use-currency';
import { useAuth } from '@/hooks/use-auth';
import { Purchase } from '@/integrations/supabase/client';
import TopUpModal from '@/components/TopUpModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkdmxhaHRvaXdpbXJveWNxY2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDIwODksImV4cCI6MjA4ODExODA4OX0.DCM-xvruLo2Sho-6I_o87aa5OENCgxCfmyYptMk86BE';
const PROFILE_API = 'https://ldvlahtoiwimroycqcav.supabase.co/functions/v1/profile-api';
const SUPABASE_FN = 'https://ldvlahtoiwimroycqcav.supabase.co/functions/v1';

const STATUS_CONFIG = {
  pending:  { label: 'На рассмотрении', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', dot: 'bg-yellow-400' },
  approved: { label: 'Одобрено ✅',      color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20',   dot: 'bg-green-400' },
  rejected: { label: 'Отклонено ❌',     color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20',       dot: 'bg-red-400' },
};

const Profile = () => {
  const navigate = useNavigate();
  const { currency, setCurrency, convertPrice, getSymbol } = useCurrency();
  const { profile, logout, isLoading, refreshProfile } = useAuth();
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [daysInApp, setDaysInApp] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoading && !profile) {
      navigate('/login');
    }
  }, [profile, isLoading, navigate]);

  useEffect(() => {
    if (profile) {
      loadPurchases();
      const created = new Date(profile.created_at);
      const now = new Date();
      const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      setDaysInApp(days);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const interval = setInterval(() => {
      loadPurchases();
      refreshProfile();
    }, 15000);
    return () => clearInterval(interval);
  }, [profile]);

  const loadPurchases = async () => {
    if (!profile) return;
    const res = await fetch(`${PROFILE_API}?action=get-purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ profileId: profile.id }),
    });
    const data = await res.json();
    if (data.purchases) setPurchases(data.purchases as Purchase[]);
  };

  const handleGetProduct = async (purchaseId: string) => {
    setInvitingId(purchaseId);
    const res = await fetch(`${SUPABASE_FN}/invite-to-group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ purchaseId }),
    });
    const data = await res.json();
    if (data.invite_link) {
      setInviteLinks(prev => ({ ...prev, [purchaseId]: data.invite_link }));
      window.open(data.invite_link, '_blank');
    } else if (data.success && data.added_directly) {
      await loadPurchases();
    } else if (data.error) {
      setInviteErrors(prev => ({ ...prev, [purchaseId]: data.error }));
    }
    setInvitingId(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadPurchases(), refreshProfile()]);
    setIsRefreshing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (profile.is_blocked) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-0 sm:p-4 font-sans text-white">
        <div className="relative w-full max-w-[1024px] h-screen sm:h-[768px] bg-black rounded-none sm:rounded-[40px] border-0 sm:border-[12px] border-zinc-900 overflow-hidden flex flex-col items-center justify-center">
          <div className="text-center px-6 sm:px-12 space-y-4 sm:space-y-6">
            <div className="text-6xl sm:text-8xl mb-2 sm:mb-4">🚫</div>
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter text-red-400">Профиль заблокирован</h1>
            <p className="text-zinc-400 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
              {profile.block_reason || 'Ваш профиль был заблокирован администратором.'}
            </p>
            <p className="text-zinc-600 text-sm">Для разблокировки обратитесь в поддержку</p>
            <button
              onClick={handleLogout}
              className="mt-4 sm:mt-8 flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-sm sm:text-base font-bold mx-auto"
            >
              <LogOut size={16} />
              Выйти
            </button>
          </div>
        </div>
      </div>
    );
  }

  const registrationDate = new Date(profile.created_at).toLocaleDateString('ru-RU');
  const pendingCount = purchases.filter(p => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-0 sm:p-4 font-sans text-white">
      <div className="relative w-full max-w-[1024px] h-screen sm:h-[768px] bg-black rounded-none sm:rounded-[40px] border-0 sm:border-[12px] border-zinc-900 overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)]">

        {/* Header */}
        <header className="pt-6 sm:pt-10 pb-4 sm:pb-6 px-4 sm:px-12 flex items-center justify-between bg-black/50 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3 sm:gap-6">
            <button onClick={() => navigate('/')} className="p-2 sm:p-3 hover:bg-white/10 rounded-full transition-colors border border-white/5">
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg sm:text-2xl font-bold">Профиль</h1>
            {pendingCount > 0 && (
              <span className="bg-yellow-400 text-black text-xs font-black px-2 sm:px-3 py-1 rounded-full animate-pulse">
                {pendingCount} на рассмотрении
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleRefresh}
              className="p-2 sm:p-3 hover:bg-white/10 rounded-full transition-colors border border-white/5"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-white' : 'text-zinc-500'} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all text-xs sm:text-sm font-bold"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-12 py-4 sm:py-8 space-y-6 sm:space-y-10">

          {/* User Info */}
          <div className="flex items-center gap-4 sm:gap-8 pt-2 sm:pt-4">
            <div className="w-16 h-16 sm:w-32 sm:h-32 rounded-full border-2 border-white/10 overflow-hidden flex-shrink-0 bg-zinc-900 flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl sm:text-5xl font-black text-white/30 uppercase">
                  {profile.username.charAt(0)}
                </span>
              )}
            </div>
            <div className="text-left min-w-0">
              <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter truncate">{profile.username}</h2>
              <p className="text-zinc-500 font-mono text-sm sm:text-lg truncate">{profile.telegram_id}</p>
              <div className="flex gap-2 sm:gap-4 mt-2 sm:mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <Calendar size={11} className="text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{registrationDate}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <Clock size={11} className="text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{daysInApp} ДНЕЙ</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">

            {/* Balance */}
            <div className="space-y-3 sm:space-y-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full text-left bg-zinc-900/50 border border-white/5 rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 flex items-center justify-between hover:bg-zinc-900/80 transition-colors group">
                    <div className="space-y-1 sm:space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-bold">Ваш Баланс</p>
                      <h3 className="text-3xl sm:text-5xl font-black text-white">
                        {convertPrice(profile.balance)} {getSymbol()}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-zinc-400 group-hover:text-white transition-colors">
                        <span>Сменить валюту</span>
                        <ChevronRight size={12} />
                      </div>
                    </div>
                    <div className="bg-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl group-hover:rotate-12 transition-transform">
                      <Wallet className="text-white" size={24} />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white w-[220px] p-2">
                  <DropdownMenuItem onClick={() => setCurrency('VB')} className="rounded-xl hover:bg-white/10 cursor-pointer p-3">Vibe Coins (VB)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrency('RUB')} className="rounded-xl hover:bg-white/10 cursor-pointer p-3">Рубли (₽)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrency('UAH')} className="rounded-xl hover:bg-white/10 cursor-pointer p-3">Гривны (₴)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrency('USD')} className="rounded-xl hover:bg-white/10 cursor-pointer p-3">Доллары ($)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrency('EUR')} className="rounded-xl hover:bg-white/10 cursor-pointer p-3">Евро (€)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrency('BYN')} className="rounded-xl hover:bg-white/10 cursor-pointer p-3">Бел. Рубли (Br)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={() => setIsTopUpOpen(true)}
                className="w-full h-14 sm:h-20 bg-white text-black hover:bg-zinc-200 rounded-[24px] sm:rounded-[28px] text-base sm:text-xl font-bold transition-all shadow-xl"
              >
                Пополнить баланс
              </Button>
            </div>

            {/* Purchases */}
            <div className="space-y-4 sm:space-y-6">
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2 sm:gap-3 px-2">
                <ShoppingBag size={16} /> Мои покупки
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {purchases.length === 0 ? (
                  <div className="bg-zinc-900/30 p-5 rounded-3xl border border-white/5 text-center">
                    <p className="text-zinc-600 text-sm font-medium">Покупок пока нет</p>
                  </div>
                ) : (
                  purchases.map((item) => {
                    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                    return (
                      <div key={item.id} className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-colors ${statusCfg.bg}`}>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="font-bold text-base sm:text-lg text-white truncate">{item.product_name}</span>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusCfg.dot} ${item.status === 'pending' ? 'animate-pulse' : ''}`} />
                              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${statusCfg.color}`}>
                                {statusCfg.label}
                              </span>
                            </div>
                            {item.payment_method && (
                              <span className="text-[10px] text-zinc-600 uppercase tracking-widest">{item.payment_method}</span>
                            )}
                          </div>
                          <div className="text-right flex flex-col gap-1 flex-shrink-0">
                            <span className="text-xs font-mono text-zinc-500 bg-black/40 px-2 py-1 rounded-lg">
                              {new Date(item.purchased_at).toLocaleDateString('ru-RU')}
                            </span>
                            <span className="text-xs font-bold text-white/60">{item.price} ₽</span>
                          </div>
                        </div>

                        {item.status === 'pending' && (
                          <div className="mt-3 pt-3 border-t border-yellow-400/10">
                            <p className="text-xs text-yellow-300/70">
                              ⏳ Ваш чек проверяется администратором. Обычно это занимает до 30 минут.
                            </p>
                          </div>
                        )}
                        {item.status === 'approved' && (
                          <div className="mt-3 pt-3 border-t border-green-400/10 space-y-3">
                            <p className="text-xs text-green-300/70">
                              🎉 Оплата подтверждена! Нажмите кнопку чтобы получить доступ к группе.
                            </p>
                            {item.invited_to_group && !item.invite_link && !inviteLinks[item.id] ? (
                              <div className="flex items-center gap-2 text-xs text-green-400 font-bold bg-green-400/10 px-3 py-2 rounded-xl">
                                <span className="w-2 h-2 rounded-full bg-green-400" />
                                Вы добавлены в группу {item.product_name}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <button
                                  onClick={() => {
                                    const link = inviteLinks[item.id] || item.invite_link;
                                    if (link) {
                                      window.open(link, '_blank');
                                    } else {
                                      setInviteErrors(prev => { const n = {...prev}; delete n[item.id]; return n; });
                                      handleGetProduct(item.id);
                                    }
                                  }}
                                  disabled={invitingId === item.id}
                                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-black text-xs sm:text-sm uppercase tracking-widest py-3 rounded-2xl transition-all active:scale-95"
                                >
                                  {invitingId === item.id ? (
                                    <><Loader2 size={14} className="animate-spin" /> Получаем доступ...</>
                                  ) : (inviteLinks[item.id] || item.invite_link) ? (
                                    <><ExternalLink size={14} /> Открыть группу</>
                                  ) : (
                                    <><ExternalLink size={14} /> Получить продукт</>
                                  )}
                                </button>
                                {inviteErrors[item.id] && (
                                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                    <p className="text-red-400 text-xs leading-relaxed">{inviteErrors[item.id]}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {item.status === 'rejected' && (
                          <div className="mt-3 pt-3 border-t border-red-400/10">
                            <p className="text-xs text-red-300/70">
                              ❌ Заявка отклонена. Пожалуйста, свяжитесь с поддержкой или попробуйте снова.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </main>

        <TopUpModal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} />

        <div className="h-4 sm:h-10" />
      </div>
    </div>
  );
};

export default Profile;
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, CheckCircle, Loader2, ArrowRight, User, Bell, CreditCard, Bitcoin, Smartphone, ChevronRight, Zap, Brain, Cpu, Sparkles, Shield, Code, ChevronDown } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { useSale } from "@/hooks/use-sale";
import { useNavigate } from "react-router-dom";
import PrivacyPolicyStep from "@/components/PrivacyPolicyStep";
import PrivacyPolicyConsentStep from "@/components/PrivacyPolicyConsentStep";
import { toast } from "sonner";
import { METACORE_PAYMENT_URL, METACORE_FN_BASE, METACORE_SUPABASE_KEY } from '@/integrations/supabase/metacore-client';

export const METACORE_TIERS = [
  {
    id: 'demo',
    name: 'Demo',
    fullName: 'Metacore Demo',
    label: 'Ознакомительный',
    tokens: 200,
    price: 1999,
    image: '/assets/metacore.jpg',
    description: 'Попробовать продукт. Полный доступ к функционалу с лимитом на 200 запросов.',
    features: ['200 токенов', 'Все AI-модели', 'Активация на 1 ПК'],
    gradient: 'from-zinc-900/60 to-black',
    border: 'border-zinc-500/30',
    badge: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
    glow: 'shadow-zinc-500/10',
  },
  {
    id: 'standard',
    name: 'Standard',
    fullName: 'Metacore Standard',
    label: 'Основной',
    tokens: 7000,
    price: 9990,
    image: '/assets/metacore.jpg',
    description: 'Полноценная работа с продуктом — 7 000 токенов на все топовые AI-модели.',
    features: ['7 000 токенов', 'Все 10+ топ AI-моделей', 'Активация на 1 ПК', 'Приоритетная поддержка'],
    gradient: 'from-blue-950/60 to-black',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    glow: 'shadow-blue-500/10',
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    fullName: 'Metacore Pro',
    label: 'Максимум',
    tokens: 15000,
    price: 15000,
    image: '/assets/metacore.jpg',
    description: 'Для профессионалов — 15 000 токенов и максимальная скидка за объём.',
    features: ['15 000 токенов', 'Все 10+ топ AI-моделей', 'Активация на 1 ПК', 'VIP-поддержка', 'Лучшая цена/токен'],
    gradient: 'from-purple-950/60 to-black',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    glow: 'shadow-purple-500/10',
  },
] as const;

export type MetacoreTier = typeof METACORE_TIERS[number];

const PLATEGA_METHODS = [
  { id: 'sbp',    name: 'СБП (Россия)', icon: <Smartphone className="w-4 h-4" />, badge: 'Быстро' },
  { id: 'crypto', name: 'Криптовалюта',  icon: <Bitcoin className="w-4 h-4" />,    badge: 'Авто'   },
];

interface MetacoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'privacy' | 'privacy-policy' | 'info' | 'tier' | 'payment' | 'pending' | 'success';

const MetacoreModal: React.FC<MetacoreModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const { convertTo } = useCurrency();
  const { isActive: isSaleActive, percent: salePercent, getDiscountedPrice } = useSale();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('privacy');
  const [selectedTier, setSelectedTier] = useState<MetacoreTier | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const agreementAccepted = localStorage.getItem('vibe_privacy_policy_accepted') === '1';
    const policyAccepted = localStorage.getItem('vibe_privacy_policy_consent_accepted') === '1';
    setStep(!agreementAccepted ? 'privacy' : !policyAccepted ? 'privacy-policy' : 'info');
    setSelectedTier(null);
    setSelectedMethod(null);
    setErrorMsg('');
    setPaymentUrl(null);
    setTransactionId(null);
    setIsLoading(false);
  }, [isOpen]);

  useEffect(() => {
    if (step === 'success') {
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) { clearInterval(interval); return null; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleClose = () => {
    setStep('info');
    setSelectedTier(null);
    setSelectedMethod(null);
    setErrorMsg('');
    setPaymentUrl(null);
    setTransactionId(null);
    setIsLoading(false);
    onClose();
  };

  const goToProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const getTierDisplayPrice = (tier: MetacoreTier) =>
    isSaleActive ? getDiscountedPrice(tier.price) : tier.price;

  const callPlatega = async () => {
    if (!profile || !selectedTier || !selectedMethod) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(METACORE_PAYMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${METACORE_SUPABASE_KEY}`,
          'apikey': METACORE_SUPABASE_KEY,
        },
        body: JSON.stringify({
          action: 'create',
          amount: getTierDisplayPrice(selectedTier),
          productId: `metacore_${selectedTier.id}`,
          productName: selectedTier.fullName,
          profileId: profile.id,
          telegramId: profile.telegram_id,
          username: profile.username,
          paymentMethodId: selectedMethod,
          currency: 'RUB',
          tier: selectedTier.id,
          tokens: selectedTier.tokens,
        }),
      });
      const data = await response.json();
      console.log('[MC] callPlatega response:', response.status, data);
      if (!response.ok || data?.error) {
        setErrorMsg(data?.error || `Ошибка создания платежа (${response.status})`);
        return;
      }
      setPaymentUrl(data.redirect);
      setTransactionId(data.transactionId);
      setStep('pending');
      window.open(data.redirect, '_blank');
    } catch (e) {
      console.error('[MC] callPlatega error:', e);
      setErrorMsg('Ошибка соединения с платёжным сервисом');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!transactionId || !profile || !selectedTier) {
      goToProfile();
      return;
    }
    setIsCheckingStatus(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${METACORE_FN_BASE}/platega-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${METACORE_SUPABASE_KEY}`,
          'apikey': METACORE_SUPABASE_KEY,
        },
        body: JSON.stringify({ action: 'check', transactionId, profileId: profile.id }),
      });
      const data = await res.json();
      console.log('[MC] check-payment result:', data);
      if (data.status === 'CONFIRMED') {
        setStep('success');
        setTimeout(() => goToProfile(), 3000);
      } else {
        toast.info('Оплата ещё не подтверждена. Проверьте позже в профиле.');
        goToProfile();
      }
    } catch (e) {
      console.error('[MC] check-payment error:', e);
      goToProfile();
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'privacy':         return 'Пользовательское соглашение';
      case 'privacy-policy':  return 'Политика конфиденциальности';
      case 'info':            return 'Metacore';
      case 'tier':            return 'Выберите тариф';
      case 'payment':         return `Оплата — ${selectedTier?.name}`;
      case 'pending':         return 'Ожидание оплаты';
      case 'success':         return '✅ Заявка отправлена!';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'privacy':         return 'Перед покупкой ознакомьтесь с пользовательским соглашением.';
      case 'privacy-policy':  return 'Ознакомьтесь с политикой конфиденциальности и подтвердите согласие.';
      case 'info':            return 'Десктопная IDE с командой AI-агентов от Apex Technology';
      case 'tier':            return 'Metacore — выберите подходящий тариф';
      case 'payment':         return `${selectedTier?.fullName} — ${selectedTier && getTierDisplayPrice(selectedTier).toLocaleString('ru-RU')} ₽`;
      case 'pending':         return `${selectedTier?.fullName} — ожидаем подтверждение Platega`;
      case 'success':         return 'Мы проверим оплату и активируем ключ';
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[201] w-[92%] max-w-[500px] -translate-x-1/2 -translate-y-1/2 border border-zinc-800 bg-black p-6 shadow-2xl rounded-[32px] outline-none max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">

          {/* Header */}
          <div className="mb-5">
            <div className="flex justify-between items-start">
              <DialogPrimitive.Title className="text-xl font-bold uppercase tracking-tight text-white">
                {getTitle()}
              </DialogPrimitive.Title>
              <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors flex-shrink-0 ml-4">
                <X className="h-5 w-5" />
              </button>
            </div>
            <DialogPrimitive.Description className="text-zinc-500 text-xs text-left mt-1">
              {getSubtitle()}
            </DialogPrimitive.Description>
          </div>

          {/* PRIVACY */}
          {step === 'privacy' && (
            <PrivacyPolicyStep
              onAccept={() => {
                localStorage.setItem('vibe_privacy_policy_accepted', '1');
                const policyAccepted = localStorage.getItem('vibe_privacy_policy_consent_accepted') === '1';
                setStep(policyAccepted ? 'info' : 'privacy-policy');
                toast.success('Пользовательское соглашение принято');
              }}
              onDecline={() => {
                toast.error('Для покупки необходимо принять пользовательское соглашение');
                handleClose();
              }}
            />
          )}

          {/* PRIVACY POLICY */}
          {step === 'privacy-policy' && (
            <PrivacyPolicyConsentStep
              onAccept={() => {
                localStorage.setItem('vibe_privacy_policy_consent_accepted', '1');
                setStep('info');
                toast.success('Политика конфиденциальности принята');
              }}
              onDecline={() => {
                toast.error('Для покупки необходимо принять политику конфиденциальности');
                handleClose();
              }}
            />
          )}

          {/* INFO */}
          {step === 'info' && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-white/10">
                <img src="/assets/metacore.jpg" alt="Metacore" className="w-full h-36 object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black bg-blue-500/90 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Apex Technology</span>
                    <span className="text-[10px] font-black bg-white/10 text-white px-2 py-0.5 rounded-full uppercase tracking-widest border border-white/10">⚡ 10+ AI-моделей</span>
                  </div>
                  <p className="text-white font-black text-lg uppercase tracking-tight leading-tight">Десктопная IDE с командой AI-агентов</p>
                  <p className="text-zinc-400 text-[11px] mt-0.5">Сайты, SaaS, боты и приложения — от идеи до запуска за 2 минуты</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Brain size={16} />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', title: 'Топовые AI', desc: 'Opus 4.7, GPT-5, Gemini 2.5 Pro и ещё 10+ моделей' },
                  { icon: <Cpu size={16} />,   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   title: 'Команда агентов', desc: 'Параллельные AI-агенты на каждом этапе разработки' },
                  { icon: <Code size={16} />,  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',  title: 'IDE из коробки', desc: 'Полноценная десктопная среда — без VSCode/IDE-настройки' },
                  { icon: <Sparkles size={16} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', title: '2 минуты', desc: 'От идеи до работающего MVP — сайт, бот, SaaS, приложение' },
                  { icon: <Zap size={16} />,    color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', title: 'Гибкий лимит', desc: 'Токены = запросы. Тарифы от 200 до 15 000 токенов' },
                  { icon: <Shield size={16} />, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',    title: 'Лицензия на ПК', desc: 'Ключ привязывается к одному устройству при первой активации' },
                ].map((f, i) => (
                  <div key={i} className={`rounded-2xl border p-3 ${f.bg}`}>
                    <div className={`${f.color} mb-1.5`}>{f.icon}</div>
                    <p className="text-white font-bold text-[12px] leading-tight">{f.title}</p>
                    <p className="text-zinc-500 text-[10px] mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setStep('tier')}
                className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl hover:bg-zinc-200 active:scale-95 transition-all"
              >
                <span className="flex items-center gap-2">
                  Выбрать тариф <ChevronDown size={18} />
                </span>
              </Button>
            </div>
          )}

          {/* TIER SELECTION */}
          {step === 'tier' && (
            <div className="space-y-3">
              {METACORE_TIERS.map((tier) => (
                <div
                  key={tier.id}
                  onClick={() => { setSelectedTier(tier); setStep('payment'); }}
                  className={`relative overflow-hidden rounded-2xl border cursor-pointer transition-all active:scale-[0.98] hover:border-white/20 ${tier.border} bg-gradient-to-r ${tier.gradient} shadow-lg ${tier.glow}`}
                >
                  {tier.popular && (
                    <div className="absolute top-3 right-3 text-[10px] font-black bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Популярный
                    </div>
                  )}
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10">
                      <img src={tier.image} alt={tier.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white text-base uppercase tracking-tight">{tier.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.badge}`}>
                          {tier.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Zap size={11} className="text-zinc-500" />
                        <span className="text-xs text-zinc-400 font-medium">{tier.tokens.toLocaleString('ru-RU')} токенов</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {tier.features.slice(1, 3).map((f, i) => (
                          <span key={i} className="text-[9px] text-zinc-600 bg-white/3 px-1.5 py-0.5 rounded-lg">{f}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {isSaleActive && (
                        <div className="text-xs text-zinc-500 line-through font-medium text-right">{tier.price.toLocaleString('ru-RU')} ₽</div>
                      )}
                      <div className={`text-lg font-black ${isSaleActive ? 'text-rose-400' : 'text-white'}`}>
                        {getTierDisplayPrice(tier).toLocaleString('ru-RU')} ₽
                      </div>
                      {isSaleActive && (
                        <div className="text-[9px] text-rose-400 font-bold">-{salePercent}%</div>
                      )}
                      <ChevronRight size={16} className="text-zinc-600 ml-auto mt-1" />
                    </div>
                  </div>
                </div>
              ))}

              {!profile && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                  <p className="text-yellow-400 text-sm">Войдите в аккаунт для покупки</p>
                </div>
              )}
            </div>
          )}

          {/* PAYMENT METHOD */}
          {step === 'payment' && selectedTier && (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 p-4 rounded-2xl border bg-gradient-to-r ${selectedTier.gradient} ${selectedTier.border}`}>
                <img src={selectedTier.image} alt={selectedTier.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-black text-white text-sm uppercase">{selectedTier.name} — {selectedTier.label}</p>
                  <p className="text-xs text-zinc-400">{selectedTier.tokens.toLocaleString('ru-RU')} токенов</p>
                </div>
                <div className="text-right">
                  {isSaleActive && (
                    <div className="text-xs text-zinc-500 line-through">{selectedTier.price.toLocaleString('ru-RU')} ₽</div>
                  )}
                  <p className={`font-black text-lg ${isSaleActive ? 'text-rose-400' : 'text-white'}`}>
                    {getTierDisplayPrice(selectedTier).toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-2 px-1">⚡ Оплата подписки Metacore</p>
                <div className="space-y-2">
                  {PLATEGA_METHODS.map((method) => (
                    <div key={method.id} onClick={() => setSelectedMethod(method.id)}
                      className={`flex items-center rounded-2xl border transition-all cursor-pointer ${selectedMethod === method.id ? 'border-white bg-zinc-900' : 'border-transparent bg-zinc-900/50 hover:bg-zinc-800/80'}`}>
                      <div className="flex-1 flex items-center gap-3 p-4">
                        <span className="text-zinc-400">{method.icon}</span>
                        <span className="font-medium text-[14px] text-zinc-100">{method.name}</span>
                        {method.badge && <span className="text-[10px] bg-white/10 text-zinc-400 px-2 py-0.5 rounded-full">{method.badge}</span>}
                      </div>
                      <span className="text-sm font-mono text-zinc-500 pr-4">
                        {method.id === 'crypto'
                          ? `${convertTo(getTierDisplayPrice(selectedTier), 'USD')} $`
                          : `${getTierDisplayPrice(selectedTier).toLocaleString('ru-RU')} ₽`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {errorMsg && <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4"><p className="text-red-400 text-sm">{errorMsg}</p></div>}
              {!profile && <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4"><p className="text-yellow-400 text-sm">Войдите в аккаунт для оплаты</p></div>}

              <div className="flex gap-3">
                <button onClick={() => { setStep('tier'); setSelectedMethod(null); }} className="h-14 px-5 rounded-2xl border border-white/10 text-zinc-500 hover:text-white transition-all font-bold text-sm">
                  ← Назад
                </button>
                <Button
                  onClick={() => {
                    if (!selectedMethod) { setErrorMsg('Выберите способ оплаты'); return; }
                    if (!profile) { setErrorMsg('Войдите в аккаунт'); return; }
                    setErrorMsg('');
                    void callPlatega();
                  }}
                  disabled={!selectedMethod || isLoading}
                  className="flex-1 h-14 bg-white text-black font-black uppercase rounded-2xl hover:bg-zinc-200 disabled:opacity-30 active:scale-95 transition-all"
                >
                  {isLoading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Открываем оплату...</span> : `Оплатить ${getTierDisplayPrice(selectedTier).toLocaleString('ru-RU')} ₽`}
                </Button>
              </div>
            </div>
          )}

          {step === 'pending' && selectedTier && (
            <div className="space-y-4">
              <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 space-y-3">
                <p className="text-zinc-300 text-sm font-medium text-center">Страница оплаты открыта в новой вкладке.</p>
                <div className="flex items-start gap-3 bg-white/3 rounded-xl p-3 border border-white/5">
                  <User size={14} className="text-zinc-500 flex-shrink-0 mt-0.5" />
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    После оплаты нажмите кнопку ниже — мы проверим статус и активируем ключ <span className="text-white font-bold">{selectedTier.name}</span> автоматически.
                  </p>
                </div>
                {transactionId && (
                  <div className="rounded-xl border border-white/5 bg-black/40 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Transaction ID</p>
                    <p className="mt-1 font-mono text-xs text-zinc-300 break-all">{transactionId}</p>
                  </div>
                )}
              </div>

              {errorMsg && <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4"><p className="text-red-400 text-sm">{errorMsg}</p></div>}

              <Button onClick={handleCheckStatus} disabled={isCheckingStatus} className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-60">
                {isCheckingStatus
                  ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Проверяем оплату...</span>
                  : <span className="flex items-center gap-2"><CheckCircle size={18} /> Я оплатил — проверить статус <ArrowRight size={16} /></span>
                }
              </Button>

              <button onClick={() => paymentUrl && window.open(paymentUrl, '_blank')} className="w-full text-center text-zinc-500 hover:text-white text-sm transition-colors py-2">
                Открыть страницу оплаты снова
              </button>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && selectedTier && (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <CheckCircle className="text-white" size={40} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center border-2 border-black">
                    <span className="text-xs">✓</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-xl uppercase tracking-tight">Оплата подтверждена!</p>
                  <p className="text-zinc-500 text-sm mt-1">«{selectedTier.fullName}»</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-1">Что происходит дальше</p>
                <div className="flex items-start gap-3 bg-zinc-900/60 border border-white/5 rounded-2xl p-4">
                  <div className="w-8 h-8 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle size={14} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Ключ выдан</p>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">Активационный ключ Metacore уже на твоём счету. Найди его в профиле.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-zinc-900/60 border border-white/5 rounded-2xl p-4">
                  <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={14} className="text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Ссылка на TG-канал</p>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">В разделе «Мои покупки» нажми <span className="text-white font-bold">«Получить продукт»</span> — попадёшь в закрытую группу Metacore.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-zinc-900/60 border border-white/5 rounded-2xl p-4">
                  <div className="w-8 h-8 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell size={14} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Активация на ПК</p>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">Введи ключ в десктопном приложении — он привяжется к этому устройству.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={goToProfile} className="flex-[2] h-14 bg-white text-black font-black uppercase rounded-2xl hover:bg-zinc-200 active:scale-95 transition-all">
                  <span className="flex items-center gap-2">
                    <User size={16} />
                    {countdown !== null ? `Профиль через ${countdown}...` : 'Перейти в профиль'}
                    <ArrowRight size={16} />
                  </span>
                </Button>
                <Button onClick={handleClose} variant="outline" className="flex-1 h-14 border-white/10 text-zinc-400 hover:text-white rounded-2xl font-bold bg-transparent">
                  Закрыть
                </Button>
              </div>
            </div>
          )}

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default MetacoreModal;

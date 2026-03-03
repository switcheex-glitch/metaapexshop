"use client";

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, Landmark, Bitcoin, X, ExternalLink, Loader2, CheckCircle, Copy, Smartphone, Upload, ImageIcon } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { toast } from "sonner";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productId?: string;
  productPrice?: number;
  containerRef?: React.RefObject<HTMLDivElement>;
}

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkdmxhaHRvaXdpbXJveWNxY2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDIwODksImV4cCI6MjA4ODExODA4OX0.DCM-xvruLo2Sho-6I_o87aa5OENCgxCfmyYptMk86BE';
const SUPABASE_FN = 'https://ldvlahtoiwimroycqcav.supabase.co/functions/v1';

const PLATEGA_METHODS = [
  { id: 'sbp',      name: 'СБП (Россия)',        icon: <Smartphone className="w-4 h-4" />, badge: 'Быстро', country: '🇷🇺 Россия',    currency: 'RUB', symbol: '₽',  rate: 1 },
  { id: 'cards_ru', name: 'Карты РФ (Мир/Visa)', icon: <CreditCard className="w-4 h-4" />, badge: null,     country: '🇷🇺 Россия',    currency: 'RUB', symbol: '₽',  rate: 1 },
  { id: 'crypto',   name: 'Криптовалюта',         icon: <Bitcoin className="w-4 h-4" />,    badge: 'Авто',   country: '🌍 Весь мир',   currency: 'USDT', symbol: '$', rate: 0.011 },
];

const MANUAL_METHODS = [
  { id: 'kaspi',  name: 'Kaspi (Visa)',  icon: <Landmark className="w-4 h-4" />,   country: '🇰🇿 Казахстан', currency: 'KZT', symbol: '₸',  rate: 4.8,  infoUrl: 'https://telegra.ph/Oplata-Kaspi-10-31',       requisites: [{ label: 'Kaspi / РБ — Фарида Л.',  value: '4400 4303 0558 1131' }] },
  { id: 'mono',   name: 'MonoBank',      icon: <CreditCard className="w-4 h-4" />, country: '🇺🇦 Украина',   currency: 'UAH', symbol: '₴',  rate: 0.45, infoUrl: 'https://telegra.ph/Oplata-PrivatBank-10-31',  requisites: [{ label: 'MonoBank — Богдан Р.',    value: '4441111066552765' }] },
  { id: 'abank',  name: 'АБанк',         icon: <Landmark className="w-4 h-4" />,   country: '🇺🇦 Украина',   currency: 'UAH', symbol: '₴',  rate: 0.45, infoUrl: 'https://telegra.ph/Oplata-PrivatBank-10-31',  requisites: [{ label: 'АБанк — Богдан Р.',       value: '4323347363236206' }] },
  { id: 'pumb',   name: 'Пумб',          icon: <Landmark className="w-4 h-4" />,   country: '🇺🇦 Украина',   currency: 'UAH', symbol: '₴',  rate: 0.45, infoUrl: 'https://telegra.ph/Oplata-PrivatBank-10-31',  requisites: [{ label: 'Пумб — Богдан Р.',        value: '5355280043078623' }] },
  { id: 'rb',     name: 'Оплата с РБ',   icon: <CreditCard className="w-4 h-4" />, country: '🇧🇾 Беларусь',  currency: 'BYN', symbol: 'Br', rate: 0.035,infoUrl: 'https://telegra.ph/Oplata-s-belarus-10-31',   requisites: [{ label: 'Kaspi Visa — Фарида Л.', value: '4400 4303 0558 1131' }] },
  { id: 'paypal', name: 'PayPal',        icon: <Wallet className="w-4 h-4" />,     country: '🌍 Весь мир',   currency: 'USD', symbol: '$',  rate: 0.011,infoUrl: 'https://telegra.ph/Oplata-PayPal-10-31',      requisites: [{ label: 'PayPal Email',            value: 'Dark_in@mail.ru' }] },
];

const METHOD_NAMES: Record<string, string> = {
  sbp: 'СБП', cards_ru: 'Карты РФ', crypto: 'Криптовалюта',
  kaspi: 'Kaspi', mono: 'MonoBank', abank: 'АБанк', pumb: 'Пумб',
  rb: 'РБ', paypal: 'PayPal',
};

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, productName, productId, productPrice }) => {
  const { profile } = useAuth();
  const { currency, convertPrice, getSymbol, convertTo } = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'screenshot' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showRequisites, setShowRequisites] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const selectedManual = MANUAL_METHODS.find(m => m.id === selectedMethod);
  const isPlatega = PLATEGA_METHODS.some(m => m.id === selectedMethod);

  const priceInCurrency = productPrice
    ? `${convertPrice(productPrice)} ${getSymbol()}`
    : '';

  const getPriceForMethod = (methodCurrency: string, methodSymbol: string): string => {
    if (!productPrice) return '';
    const currencyMap: Record<string, string> = {
      'RUB': 'RUB', 'KZT': 'KZT', 'UAH': 'UAH',
      'BYN': 'BYN', 'USD': 'USD', 'EUR': 'EUR',
      'PLN': 'PLN', 'GBP': 'GBP', 'TRY': 'TRY', 'USDT': 'USD',
    };
    const mapped = currencyMap[methodCurrency];
    if (mapped && mapped !== 'RUB') {
      return `${convertTo(productPrice, mapped as any)} ${methodSymbol}`;
    }
    return `${productPrice.toLocaleString('ru-RU')} ₽`;
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success('Скопировано!'); };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSendScreenshot = async () => {
    if (!screenshot || !profile) return;
    setStatus('sending');
    setErrorMsg('');

    const countryStr = [...PLATEGA_METHODS, ...MANUAL_METHODS].find(m => m.id === selectedMethod)?.country || '';

    const fd = new FormData();
    fd.append('screenshot', screenshot);
    fd.append('productName', productName);
    fd.append('productId', productId || productName.toLowerCase().replace(/\s+/g, '_'));
    fd.append('rubAmount', String(productPrice || 0));
    fd.append('country', countryStr);
    fd.append('username', profile.username);
    fd.append('telegramId', profile.telegram_id);
    fd.append('paymentMethod', METHOD_NAMES[selectedMethod || ''] || selectedMethod || '');
    fd.append('profileId', profile.id);

    const response = await fetch(`${SUPABASE_FN}/send-payment-proof`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY },
      body: fd,
    });

    const data = await response.json();
    if (!response.ok || data?.error) {
      setErrorMsg(data?.error || 'Ошибка отправки');
      setStatus('screenshot');
    } else {
      setStatus('success');
    }
  };

  const callPlatega = async () => {
    setIsLoading(true);
    setErrorMsg('');
    const response = await fetch(`${SUPABASE_FN}/create-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ amount: productPrice || 0, productName, profileId: profile!.id, currency: 'RUB', paymentMethodId: selectedMethod }),
    });
    const data = await response.json();
    if (!response.ok || data?.error) {
      setErrorMsg(data?.error || 'Ошибка создания платежа');
    } else {
      setPaymentUrl(data.redirect);
      setTransactionId(data.transactionId);
      setStatus('pending');
      window.open(data.redirect, '_blank');
    }
    setIsLoading(false);
  };

  const handlePay = async () => {
    if (!selectedMethod) { setErrorMsg('Выберите способ оплаты'); return; }
    if (!profile) { setErrorMsg('Необходимо войти в аккаунт'); return; }
    setErrorMsg('');
    if (selectedManual) { setShowRequisites(true); return; }
    if (isPlatega) await callPlatega();
  };

  const handleCheckStatus = async () => {
    if (!transactionId || !profile) return;
    setIsLoading(true);
    const response = await fetch(`${SUPABASE_FN}/check-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ transactionId, profileId: profile.id, productName, productId: productId || '', price: productPrice || 0 }),
    });
    const data = await response.json();
    if (data?.status === 'CONFIRMED') setStatus('success');
    else if (data?.status === 'CANCELED') { setStatus('error'); setErrorMsg('Платёж отменён'); }
    else setErrorMsg('Платёж ещё не подтверждён. Попробуйте через минуту.');
    setIsLoading(false);
  };

  const handleClose = () => {
    setSelectedMethod(null); setPaymentUrl(null); setTransactionId(null);
    setStatus('idle'); setErrorMsg(''); setShowRequisites(false);
    setScreenshot(null); setScreenshotPreview(null);
    onClose();
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[201] w-[92%] max-w-[480px] -translate-x-1/2 -translate-y-1/2 border border-zinc-800 bg-black p-6 shadow-2xl rounded-[32px] outline-none max-h-[88vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">

          {/* Header */}
          <div className="mb-5">
            <div className="flex justify-between items-start">
              <DialogPrimitive.Title className="text-xl font-bold uppercase tracking-tight text-white">
                {status === 'success' ? '✅ Заявка отправлена!' : status === 'screenshot' || status === 'sending' ? '📎 Скриншот оплаты' : showRequisites ? 'Реквизиты' : 'ОПЛАТА ЗАКАЗА'}
              </DialogPrimitive.Title>
              <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors flex-shrink-0 ml-4">
                <X className="h-5 w-5" />
              </button>
            </div>
            <DialogPrimitive.Description className="text-zinc-500 text-xs text-left mt-1">
              {status === 'success'
                ? 'Мы проверим оплату и активируем товар'
                : `«${productName}» — ${priceInCurrency}`}
            </DialogPrimitive.Description>
          </div>

          {/* Успех */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                <CheckCircle className="text-white" size={48} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-white font-bold text-lg">Заявка принята!</p>
                <p className="text-zinc-400 text-sm leading-relaxed">Скриншот отправлен администратору. После проверки товар будет активирован в вашем профиле.</p>
              </div>
              <Button onClick={handleClose} className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl">Закрыть</Button>
            </div>
          )}

          {/* Загрузка скриншота */}
          {(status === 'screenshot' || status === 'sending') && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${screenshotPreview ? 'border-white/20' : 'border-zinc-700 hover:border-zinc-500'}`}
              >
                {screenshotPreview ? (
                  <div className="space-y-3">
                    <img src={screenshotPreview} alt="Скриншот" className="w-full max-h-48 object-contain rounded-xl" />
                    <p className="text-zinc-500 text-xs">Нажмите, чтобы заменить</p>
                  </div>
                ) : (
                  <div className="space-y-3 py-4">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
                      <ImageIcon className="text-zinc-500" size={28} />
                    </div>
                    <div>
                      <p className="text-white font-bold">Прикрепите скриншот оплаты</p>
                      <p className="text-zinc-500 text-xs mt-1">JPG, PNG — нажмите для выбора</p>
                    </div>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

              {errorMsg && <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4"><p className="text-red-400 text-sm">{errorMsg}</p></div>}

              <Button
                onClick={handleSendScreenshot}
                disabled={!screenshot || status === 'sending'}
                className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl hover:bg-zinc-200 disabled:opacity-40"
              >
                {status === 'sending' ? (
                  <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Отправляем...</span>
                ) : (
                  <span className="flex items-center gap-2"><Upload size={18} /> Отправить заявку</span>
                )}
              </Button>
            </div>
          )}

          {/* Ожидание Platega */}
          {status === 'pending' && (
            <div className="space-y-4">
              <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 text-center space-y-2">
                <p className="text-zinc-300 text-sm font-medium">Страница оплаты открыта в новой вкладке.</p>
                <p className="text-zinc-500 text-xs">После оплаты нажмите кнопку ниже.</p>
              </div>
              {errorMsg && <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4"><p className="text-red-400 text-sm">{errorMsg}</p></div>}
              <Button onClick={handleCheckStatus} disabled={isLoading} className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl hover:bg-zinc-200">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Я оплатил — проверить'}
              </Button>
              <button onClick={() => paymentUrl && window.open(paymentUrl, '_blank')} className="w-full text-center text-zinc-500 hover:text-white text-sm transition-colors py-2">
                Открыть страницу оплаты снова
              </button>
            </div>
          )}

          {/* Ручные реквизиты */}
          {showRequisites && selectedManual && status === 'idle' && (
            <div className="space-y-4">
              {selectedManual.requisites.map((req, i) => (
                <div key={i} className="bg-zinc-900/60 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{req.label}</p>
                    <p className="font-mono text-base tracking-wider text-white mt-1">{req.value}</p>
                  </div>
                  <button onClick={() => copyToClipboard(req.value)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors ml-3"><Copy size={16} /></button>
                </div>
              ))}
              <div className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5 space-y-1">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Переведите{' '}
                  <span className="text-white font-bold">
                    {getPriceForMethod(selectedManual.currency, selectedManual.symbol)}
                  </span>
                  {' '}по реквизитам выше и укажите в комментарии название товара.
                </p>
                {selectedManual.currency !== 'RUB' && (
                  <p className="text-[10px] text-zinc-600">
                    = {productPrice?.toLocaleString('ru-RU')} ₽ по актуальному курсу
                  </p>
                )}
              </div>
              <button onClick={() => window.open(selectedManual.infoUrl, '_blank')} className="w-full flex items-center justify-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors py-2">
                <ExternalLink size={14} /> Инструкция по оплате
              </button>
              <Button
                onClick={() => { setStatus('screenshot'); }}
                className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl hover:bg-zinc-200"
              >
                Я оплатил — прикрепить скриншот
              </Button>
            </div>
          )}

          {/* Выбор метода */}
          {!showRequisites && status === 'idle' && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-2 px-1">🇷🇺 Россия (автооплата)</p>
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
                        {getPriceForMethod(method.currency, method.symbol)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-2 px-1">🌍 Другие страны (реквизиты)</p>
                <div className="space-y-2">
                  {MANUAL_METHODS.map((method) => (
                    <div key={method.id} onClick={() => setSelectedMethod(method.id)}
                      className={`relative flex items-center rounded-2xl border transition-all cursor-pointer ${selectedMethod === method.id ? 'border-white bg-zinc-900' : 'border-transparent bg-zinc-900/50 hover:bg-zinc-800/80'}`}>
                      <div className="flex-1 flex items-center gap-3 p-4">
                        <span className="text-zinc-400">{method.icon}</span>
                        <span className="font-medium text-[14px] text-zinc-100">{method.name}</span>
                      </div>
                      <span className="text-sm font-mono text-zinc-500 pr-2">
                        {getPriceForMethod(method.currency, method.symbol)}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); window.open(method.infoUrl, '_blank'); }}
                        className="p-3 mr-2 rounded-xl bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 transition-all" title="Инструкция">
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {errorMsg && <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4"><p className="text-red-400 text-sm">{errorMsg}</p></div>}
              {!profile && <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4"><p className="text-yellow-400 text-sm">Войдите в аккаунт для оплаты</p></div>}

              <Button onClick={handlePay} disabled={isLoading || !selectedMethod}
                className="w-full h-14 bg-white text-black font-black uppercase text-sm tracking-widest rounded-2xl hover:bg-zinc-200 transition-all active:scale-95">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : `Оплатить ${priceInCurrency}`}
              </Button>
            </div>
          )}

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default PaymentModal;
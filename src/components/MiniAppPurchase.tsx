import React, { useState, useRef } from 'react';
import { Zap, ImageIcon, Upload, Loader2, CheckCircle, ArrowLeft, Copy } from 'lucide-react';

const MINIAPP_PURCHASE_URL = 'https://dgsqexlmknnbdeikrjba.supabase.co/functions/v1/miniapp-purchase';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnc3FleGxta25uYmRlaWtyamJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDI0ODEsImV4cCI6MjA5NTQ3ODQ4MX0.UbuUvgif9vlm6KRHRNHkXkxvB3JGI2y0D5SsKvze-MY';

const TIERS = [
  { id: 'mk1', name: 'MK-I',   fullName: 'Jarvis Industries MK-I',   tokens: 10000, price: 1490, color: '#22d3ee', border: 'border-cyan-500/40',  bg: 'bg-cyan-950/20',  badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { id: 'mk2', name: 'MK-II',  fullName: 'Jarvis Industries MK-II',  tokens: 30000, price: 3490, color: '#4ade80', border: 'border-green-500/40', bg: 'bg-green-950/20', badge: 'bg-green-500/20 text-green-300 border-green-500/30', popular: true },
  { id: 'mk3', name: 'MK-III', fullName: 'Jarvis Industries MK-III', tokens: 60000, price: 5990, color: '#f87171', border: 'border-red-500/40',   bg: 'bg-red-950/20',   badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
];

const METHODS = [
  { id: 'kaspi',  name: 'Kaspi (Visa)',  flag: '🇰🇿', requisite: '4400 4303 0558 1131', label: 'Kaspi / РБ — Фарида Л.' },
  { id: 'mono',   name: 'MonoBank',      flag: '🇺🇦', requisite: '4441111066552765',    label: 'MonoBank — Богдан Р.' },
  { id: 'rb',     name: 'Оплата с РБ',   flag: '🇧🇾', requisite: '4400 4303 0558 1131', label: 'Kaspi Visa — Фарида Л.' },
  { id: 'paypal', name: 'PayPal',        flag: '🌍', requisite: 'Dark_in2000@mail.ru',  label: 'PayPal Email' },
  { id: 'sbp',    name: 'СБП (Россия)',  flag: '🇷🇺', requisite: null,                  label: 'Через сайт' },
];

type Step = 'tier' | 'method' | 'requisites' | 'screenshot' | 'success';

interface Props {
  telegramId: number;
  onBack: () => void;
}

const MiniAppPurchase: React.FC<Props> = ({ telegramId, onBack }) => {
  const [step, setStep] = useState<Step>('tier');
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<typeof METHODS[0] | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tg = window.Telegram?.WebApp;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    tg?.HapticFeedback?.notificationOccurred('success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!screenshot || !selectedTier || !selectedMethod) return;
    setSending(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('telegram_id', String(telegramId));
      fd.append('tier_id', selectedTier.id);
      fd.append('payment_method', selectedMethod.name);
      fd.append('photo', screenshot, screenshot.name || 'screenshot.jpg');

      const res = await fetch(MINIAPP_PURCHASE_URL, {
        method: 'POST',
        headers: { 'apikey': ANON_KEY },
        body: fd,
      });

      const data = await res.json();
      console.log('[MiniAppPurchase] result:', data);

      if (data.success) {
        tg?.HapticFeedback?.notificationOccurred('success');
        setStep('success');
      } else {
        setError(data.message || data.error || 'Ошибка отправки');
      }
    } catch (e) {
      setError('Ошибка сети. Попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  };

  const color = selectedTier?.color || '#22d3ee';

  return (
    <div className="min-h-screen bg-[#030712] font-mono text-white px-4 py-5 space-y-4">
      <style>{`
        @keyframes scan { 0% { top: -2px; } 100% { top: 100%; } }
        .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, ${color}40, ${color}, ${color}40, transparent); animation: scan 3s linear infinite; }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl border border-white/10 bg-white/5 active:scale-90 transition-all"
        >
          <ArrowLeft size={16} className="text-zinc-400" />
        </button>
        <div>
          <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-500">JARVIS INDUSTRIES</p>
          <p className="text-white font-black text-base uppercase tracking-tight">
            {step === 'tier' ? 'Выберите тариф' :
             step === 'method' ? 'Способ оплаты' :
             step === 'requisites' ? 'Реквизиты' :
             step === 'screenshot' ? 'Скриншот оплаты' :
             '✅ Заявка отправлена'}
          </p>
        </div>
      </div>

      {/* STEP: TIER */}
      {step === 'tier' && (
        <div className="space-y-3">
          {TIERS.map(tier => (
            <button
              key={tier.id}
              onClick={() => { setSelectedTier(tier); setStep('method'); tg?.HapticFeedback?.impactOccurred('light'); }}
              className={`relative w-full text-left border rounded-2xl p-4 overflow-hidden transition-all active:scale-[0.98] ${tier.border} ${tier.bg}`}
            >
              {tier.popular && (
                <div className="absolute top-3 right-3 text-[9px] font-black bg-green-500 text-black px-2 py-0.5 rounded-full uppercase">
                  Популярный
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-white text-base uppercase">{tier.name}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${tier.badge}`}>
                      {tier.tokens.toLocaleString('ru-RU')} токенов
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap size={11} style={{ color: tier.color }} />
                    <span className="text-[11px]" style={{ color: tier.color }}>{tier.fullName}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="font-black text-white text-lg">{tier.price.toLocaleString('ru-RU')} ₽</p>
                  <p className="text-[10px] text-zinc-600">30 дней</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* STEP: METHOD */}
      {step === 'method' && selectedTier && (
        <div className="space-y-3">
          {/* Tier summary */}
          <div className={`border rounded-xl p-3 ${selectedTier.border} ${selectedTier.bg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-white text-sm uppercase">{selectedTier.name}</p>
                <p className="text-[10px]" style={{ color: selectedTier.color }}>{selectedTier.tokens.toLocaleString('ru-RU')} токенов · 30 дней</p>
              </div>
              <p className="font-black text-white">{selectedTier.price.toLocaleString('ru-RU')} ₽</p>
            </div>
          </div>

          <p className="text-[10px] uppercase tracking-widest text-zinc-600 px-1">Выберите способ оплаты</p>

          {METHODS.map(method => (
            <button
              key={method.id}
              onClick={() => {
                setSelectedMethod(method);
                tg?.HapticFeedback?.impactOccurred('light');
                if (method.id === 'sbp') {
                  setStep('screenshot'); // СБП — сразу к скриншоту
                } else {
                  setStep('requisites');
                }
              }}
              className="w-full flex items-center gap-3 border border-white/8 rounded-xl p-4 bg-white/3 active:bg-white/8 transition-all text-left"
            >
              <span className="text-xl">{method.flag}</span>
              <span className="font-bold text-white text-sm">{method.name}</span>
            </button>
          ))}

          <button onClick={() => setStep('tier')} className="w-full text-center text-zinc-600 text-xs py-2">
            ← Назад к тарифам
          </button>
        </div>
      )}

      {/* STEP: REQUISITES */}
      {step === 'requisites' && selectedTier && selectedMethod && selectedMethod.requisite && (
        <div className="space-y-3">
          <div className={`border rounded-xl p-3 ${selectedTier.border} ${selectedTier.bg}`}>
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">Сумма к оплате</p>
            <p className="font-black text-white text-xl">{selectedTier.price.toLocaleString('ru-RU')} ₽</p>
          </div>

          {/* Реквизит */}
          <div className="border border-white/10 rounded-xl p-4 bg-white/3">
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">{selectedMethod.label}</p>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-white text-base font-bold tracking-wider">{selectedMethod.requisite}</p>
              <button
                onClick={() => handleCopy(selectedMethod.requisite!)}
                className="flex-shrink-0 p-2.5 rounded-xl active:scale-90 transition-all"
                style={{ backgroundColor: copied ? '#4ade8020' : '#ffffff10', border: `1px solid ${copied ? '#4ade8040' : '#ffffff15'}` }}
              >
                {copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} className="text-zinc-400" />}
              </button>
            </div>
          </div>

          <div className="border border-white/5 rounded-xl p-3 bg-white/2">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Переведите <span className="text-white font-bold">{selectedTier.price.toLocaleString('ru-RU')} ₽</span> по реквизитам выше.
              В комментарии укажите: <span className="text-white font-bold">{selectedTier.name}</span>
            </p>
          </div>

          <button
            onClick={() => setStep('screenshot')}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-black active:scale-95 transition-all"
            style={{ backgroundColor: selectedTier.color, boxShadow: `0 0 20px ${selectedTier.color}40` }}
          >
            Я оплатил — прикрепить скриншот
          </button>

          <button onClick={() => setStep('method')} className="w-full text-center text-zinc-600 text-xs py-2">
            ← Назад
          </button>
        </div>
      )}

      {/* STEP: SCREENSHOT */}
      {step === 'screenshot' && selectedTier && (
        <div className="space-y-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${screenshotPreview ? 'border-white/20' : 'border-zinc-700'}`}
          >
            {screenshotPreview ? (
              <div className="space-y-2">
                <img src={screenshotPreview} alt="Скриншот" className="w-full max-h-48 object-contain rounded-xl" />
                <p className="text-zinc-600 text-xs">Нажмите, чтобы заменить</p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
                  <ImageIcon className="text-zinc-500" size={28} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Прикрепите скриншот оплаты</p>
                  <p className="text-zinc-600 text-xs mt-1">JPG, PNG — нажмите для выбора</p>
                </div>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={!screenshot || sending}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-black flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
            style={{ backgroundColor: selectedTier.color, boxShadow: `0 0 20px ${selectedTier.color}40` }}
          >
            {sending ? (
              <><Loader2 size={16} className="animate-spin" /> Отправляем...</>
            ) : (
              <><Upload size={16} /> Отправить заявку</>
            )}
          </button>

          <button onClick={() => setStep(selectedMethod?.requisite ? 'requisites' : 'method')} className="w-full text-center text-zinc-600 text-xs py-2">
            ← Назад
          </button>
        </div>
      )}

      {/* STEP: SUCCESS */}
      {step === 'success' && selectedTier && (
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selectedTier.color + '40', backgroundColor: selectedTier.color + '10' }}>
              <CheckCircle size={44} style={{ color: selectedTier.color }} />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#030712]">
              <span className="text-xs text-black font-black">✓</span>
            </div>
          </div>

          <div>
            <p className="font-black text-white text-xl uppercase tracking-tight">Заявка принята!</p>
            <p className="text-zinc-500 text-sm mt-1">«{selectedTier.fullName}»</p>
          </div>

          <div className="w-full space-y-2 text-left">
            <div className="border border-white/8 rounded-xl p-4 bg-white/3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">⏳ Что дальше</p>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Администратор проверит ваш чек и одобрит заявку. Обычно до <span className="text-white font-bold">30 минут</span>.
              </p>
            </div>
            <div className="border border-white/8 rounded-xl p-4 bg-white/3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">🔑 Получение токена</p>
              <p className="text-zinc-300 text-sm leading-relaxed">
                После одобрения токен появится в этом мини-аппе на главном экране.
              </p>
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-black active:scale-95 transition-all"
            style={{ backgroundColor: selectedTier.color }}
          >
            На главный экран
          </button>
        </div>
      )}
    </div>
  );
};

export default MiniAppPurchase;

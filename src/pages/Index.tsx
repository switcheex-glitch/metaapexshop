"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Newspaper, User, Gift, Clock, ScrollText } from "lucide-react";
import ProductCard from '@/components/ProductCard';
import PaymentModal from '@/components/PaymentModal';
import InfoModal from '@/components/InfoModal';
import JarvisIndustriesModal from '@/components/JarvisIndustriesModal';
import MetacoreModal from '@/components/MetacoreModal';
import LegalDocsModal from '@/components/LegalDocsModal';
import { useAuth } from '@/hooks/use-auth';
import { useSale } from '@/hooks/use-sale';

const JARVIS_INDUSTRIES_ID = 'jarvis-industries';
const METACORE_ID = 'metacore';

const products = [
  {
    id: 'metacore',
    name: 'Metacore',
    description: 'Десктопная IDE с командой AI-агентов: сайты, SaaS, боты и приложения от идеи до запуска за 2 минуты.',
    fullInfo: 'Десктопное приложение, которое пишет код за тебя.\nНе плагин. Не браузерная игрушка. Полноценная IDE на твоём компьютере, которая умеет поднимать сайты, SaaS, telegram-боты и electron-приложения от идеи до запуска за 2 минуты.\n\n━━━━━━━━━━━━━━━━━━━━━\n\n🔥 Что умеет Metacore:\n\n🤖 Топовые AI-модели в одной подписке\nClaude Opus 4.7 · GPT-5 · Gemini 3 Pro · Kimi K2 · 10+ других. Без API-ключей, без счетов от Anthropic и OpenAI отдельно. Платишь один раз — пользуешься всем.\n\n⚡ Команда из 4 AI-агентов\nDesigner → Backend → Frontend → QA. Один промпт — на выходе готовый проект с дизайном, API, тестами и git-историей.\n\n🎨 Лайв-превью с hot reload\nПишешь промпт — за 5 секунд видишь результат прямо в окне Metacore. Без VS Code, без браузера, без переключений.\n\n🔌 Интеграции в один клик\nSupabase для бекенда, GitHub для версионирования, MCP-серверы для расширения. Всё подключается кнопкой, без yaml-конфигов.\n\n📚 Библиотека промптов\nСохраняешь свои наработки — копируешь одним кликом. «Сделай форму с Zod», «Добавь dark mode», «Напиши FastAPI-роут» — всё под рукой.\n\n🛒 Публичная галерея\nПокупаешь чужие проекты — через секунду они у тебя локально. Продаёшь свои — забираешь 70% с каждой продажи.\n\n💰 Встроенный кошелёк\nЗаработал на шаблонах? Запросил вывод USDT (TRC20 / ERC20) — получил.\n\n🔄 Авто-обновления без переустановки\nУстановил один раз — Metacore сам обновляется в фоне. Никаких ручных скачиваний.\n\n━━━━━━━━━━━━━━━━━━━━━\n\n🎁 Три тарифа на выбор:\n• Demo — 200 токенов · 1 999 ₽ (ознакомительный)\n• Standard — 7 000 токенов · 9 990 ₽ (основной, лучший выбор)\n• Pro — 15 000 токенов · 15 000 ₽ (для профи, лучшая цена/токен)',
    price: '1999',
    image: '/assets/metacore.jpg',
    isComingSoon: false,
    isNew: true,
    isMonthly: false
  },
  {
    id: JARVIS_INDUSTRIES_ID,
    name: 'Jarvis Industries',
    description: 'Профессиональная платформа с тремя тарифами MK-I, MK-II, MK-III.',
    fullInfo: 'Jarvis Industries — профессиональная платформа с тремя тарифами.\n\nMK-I: 10 000 токенов — базовый доступ.\nMK-II: 30 000 токенов — расширенный доступ.\nMK-III: 60 000 токенов — максимальный доступ.\n\nКаждый тариф открывает доступ в отдельную закрытую группу.',
    price: '1490',
    image: '/assets/jarvis-industries-mk3.jpg',
    isComingSoon: false,
    isNew: true
  },
  {
    id: 'jarvis-max',
    name: 'Jarvis Max',
    description: 'Голосовой помощник с встроенным искусственным интеллектом.',
    fullInfo: 'Голосовой помощник с встроенным искусственным интеллектом.\n\nПонимает контекст, отвечает осмысленно, работает как полноценный цифровой ассистент.\n\nПлюс расширенный редактор команд для глубокой кастомизации.',
    price: '6900',
    image: '/assets/jarvis-max.jpg',
    isComingSoon: false
  },
  {
    id: 'jarvis-pro',
    name: 'Jarvis Pro',
    description: 'Быстрый голосовой помощник с базой более 150 готовых команд.',
    fullInfo: 'Быстрый голосовой помощник с базой более 150 готовых команд.\n\nСоздавайте собственные сценарии через простой и удобный редактор.\n\nМаксимум скорости. Полный контроль.',
    price: '2380',
    image: '/assets/jarvis-pro.jpg',
    isComingSoon: false
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isActive: isSaleActive, showBanner, isUpcoming, countdown, percent, getDiscountedPrice } = useSale();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isJarvisIndustriesOpen, setIsJarvisIndustriesOpen] = useState(false);
  const [isMetacoreOpen, setIsMetacoreOpen] = useState(false);
  const [isLegalDocsOpen, setIsLegalDocsOpen] = useState(false);

  const handlePay = (productName: string, productId: string) => {
    if (productId === JARVIS_INDUSTRIES_ID) {
      setIsJarvisIndustriesOpen(true);
      return;
    }
    if (productId === METACORE_ID) {
      setIsMetacoreOpen(true);
      return;
    }
    setSelectedProduct(productName);
    setIsPayModalOpen(true);
  };

  const handleInfo = (productName: string) => {
    setSelectedProduct(productName);
    setIsInfoModalOpen(true);
  };

  const currentProduct = products.find(p => p.name === selectedProduct) || null;
  const currentProductPrice = currentProduct
    ? getDiscountedPrice(parseInt(currentProduct.price) || 0)
    : 0;

  return (
    <div className="min-h-screen bg-black font-sans text-white flex flex-col">

      {/* На ПК — iPad frame, на телефоне — полный экран */}
      <div
        ref={containerRef}
        className="
          flex flex-col flex-1
          w-full h-screen
          sm:relative sm:mx-auto sm:my-auto sm:w-full sm:max-w-[1024px] sm:h-[768px]
          sm:rounded-[40px] sm:border-[12px] sm:border-zinc-900
          sm:shadow-[0_0_100px_rgba(0,0,0,0.8)]
          bg-black overflow-hidden
        "
      >
        {/* Header */}
        <header className="pt-safe pt-4 sm:pt-10 pb-3 sm:pb-6 px-4 sm:px-12 flex justify-between items-center bg-black/80 backdrop-blur-xl z-20 flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Магазин</p>
            <p className="text-base sm:text-xl font-black tracking-tighter uppercase italic">Apex Technology</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLegalDocsOpen(true)}
              className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-full border border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:border-white/20 active:scale-95 transition-all flex items-center gap-1.5"
              aria-label="Документы и соглашения"
            >
              <ScrollText size={14} />
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider">Документы</span>
            </button>
            <button
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-white/10 active:scale-95 transition-transform bg-zinc-900 flex items-center justify-center"
              onClick={() => profile ? navigate('/profile') : navigate('/login')}
            >
              {profile ? (
                profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-black text-sm uppercase">{profile.username.charAt(0)}</span>
                )
              ) : (
                <User size={16} className="text-zinc-400" />
              )}
            </button>
          </div>
        </header>

        {/* Карточки */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-12 pb-3 sm:pb-12">

          {/* 🤝 APEX & METACORE Sale Banner */}
          {showBanner && (
            <div className="mb-3 sm:mb-6 relative overflow-hidden rounded-2xl sm:rounded-3xl">
              {/* Фоновый градиент */}
              <div className={`absolute inset-0 ${isSaleActive ? 'bg-gradient-to-br from-rose-600 via-orange-500 to-yellow-500' : 'bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-800'}`} />
              {/* Тёмный оверлей поверх для читаемости */}
              <div className="absolute inset-0 bg-black/50" />
              {/* Мерцающий glow по краям */}
              {isSaleActive && (
                <div className="absolute -inset-[1px] rounded-2xl sm:rounded-3xl bg-gradient-to-r from-rose-500 via-orange-400 to-yellow-400 opacity-60 blur-sm animate-pulse" />
              )}
              {/* Шиммер */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl">
                <div className="absolute -inset-y-4 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer" />
              </div>

              <div className="relative px-4 py-4 sm:px-6 sm:py-5">
                {isSaleActive ? (
                  <>
                    {/* Верхняя строка: бейдж + таймер */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-white text-black text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse">
                          🔥 АКТИВНА
                        </span>
                        <span className="text-white/60 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                          APEX &amp; METACORE
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/50 border border-white/20 rounded-xl px-3 py-1.5">
                        <Clock size={12} className="text-orange-300" />
                        <span className="font-mono text-sm sm:text-base font-black text-white tabular-nums">
                          {countdown}
                        </span>
                        <span className="text-[9px] text-white/40 uppercase font-bold ml-0.5">до конца</span>
                      </div>
                    </div>
                    {/* Большой текст */}
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-3xl sm:text-5xl font-black text-white uppercase leading-none tracking-tighter drop-shadow-[0_2px_12px_rgba(251,146,60,0.5)]">
                          −{percent}%
                        </p>
                        <p className="text-white/80 text-sm sm:text-base font-black uppercase tracking-tight mt-1">
                          на весь каталог
                        </p>
                        <p className="text-white/40 text-[10px] sm:text-xs mt-0.5">
                          22 мая 00:48 — 25 мая 00:48 МСК · 3 дня
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-3xl sm:text-4xl">🤝</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-white/10 border border-white/20 text-white/80 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                        ⏳ Скоро
                      </span>
                      <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
                        <Clock size={12} className="text-zinc-400" />
                        <span className="font-mono text-sm font-black text-white tabular-nums">{countdown}</span>
                        <span className="text-[9px] text-white/30 uppercase font-bold ml-0.5">до начала</span>
                      </div>
                    </div>
                    <p className="text-2xl sm:text-4xl font-black text-white uppercase leading-none tracking-tighter">
                      −{percent}% на всё
                    </p>
                    <p className="text-white/50 text-xs sm:text-sm mt-1">
                      APEX &amp; METACORE · 22 мая 00:48 МСК
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-3 sm:mb-6">
            Рекомендуемые товары
          </p>
          {/* Мобиль: 1 колонка. ПК: 2 колонки */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {products.map((product) => {
              const originalPrice = parseInt(product.price) || 0;
              const discountedPrice = isSaleActive && !product.isComingSoon && originalPrice > 0
                ? getDiscountedPrice(originalPrice)
                : undefined;

              return (
                <ProductCard
                  key={product.id}
                  name={product.name}
                  description={product.description}
                  price={product.price}
                  image={product.image}
                  isComingSoon={product.isComingSoon}
                  isNew={(product as any).isNew}
                  isBeta={product.id === 'jarvis-max'}
                  hasMacOS={product.id === 'jarvis-max' || product.id === 'metacore'}
                  isMonthly={(product as any).isMonthly}
                  onPay={() => handlePay(product.name, product.id)}
                  onInfo={() => handleInfo(product.name)}
                  salePrice={discountedPrice}
                />
              );
            })}
          </div>
        </main>

        {/* Bottom Nav */}
        <nav className="pb-safe pb-4 sm:pb-10 pt-3 sm:pt-4 px-6 sm:px-10 flex justify-between items-center border-t border-white/5 bg-black/90 backdrop-blur-xl z-20 flex-shrink-0">
          <button
            onClick={() => window.open('https://t.me/vibetechhSupport?direct', '_blank')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-transform text-zinc-400"
          >
            <Headphones size={20} />
          </button>
          <div className="w-12 h-1 bg-white/10 rounded-full" />
          <button
            onClick={() => window.open('https://t.me/ApexTechhh', '_blank')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-transform text-zinc-400"
          >
            <Newspaper size={20} />
          </button>
        </nav>
      </div>

      <PaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        productName={selectedProduct || ""}
        productId={currentProduct?.id}
        productPrice={currentProductPrice}
        containerRef={containerRef}
      />

      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        product={currentProduct}
        containerRef={containerRef}
      />

      <JarvisIndustriesModal
        isOpen={isJarvisIndustriesOpen}
        onClose={() => setIsJarvisIndustriesOpen(false)}
      />

      <MetacoreModal
        isOpen={isMetacoreOpen}
        onClose={() => setIsMetacoreOpen(false)}
      />

      <LegalDocsModal
        isOpen={isLegalDocsOpen}
        onClose={() => setIsLegalDocsOpen(false)}
      />
    </div>
  );
};

export default Index;
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
        {/* Header — Compact & Clean */}
        <header className="pt-safe pt-3 sm:pt-8 pb-2 sm:pb-4 px-3.5 sm:px-10 flex justify-between items-center bg-black/95 backdrop-blur-lg z-20 flex-shrink-0">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600">Shop</p>
            <p className="text-sm sm:text-lg font-black tracking-tighter uppercase leading-none">Apex</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsLegalDocsOpen(true)}
              className="h-8 sm:h-9 w-8 sm:w-9 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center"
              aria-label="Документы и соглашения"
            >
              <ScrollText size={16} />
            </button>
            <button
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg overflow-hidden border border-white/10 active:scale-90 transition-transform bg-white/5 flex items-center justify-center flex-shrink-0"
              onClick={() => profile ? navigate('/profile') : navigate('/login')}
            >
              {profile ? (
                profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-black text-xs uppercase">{profile.username.charAt(0)}</span>
                )
              ) : (
                <User size={14} className="text-zinc-400" />
              )}
            </button>
          </div>
        </header>

        {/* Main Content — Products First */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-10 pt-2 sm:pt-4 pb-16 sm:pb-20">

          {/* 🤝 APEX & METACORE Sale Banner — Compact for Mobile */}
          {showBanner && (
            <div className="mb-2.5 sm:mb-4 relative overflow-hidden rounded-xl sm:rounded-2xl">
              <div className={`absolute inset-0 ${isSaleActive ? 'bg-gradient-to-br from-rose-600 via-orange-500 to-yellow-500' : 'bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-800'}`} />
              <div className="absolute inset-0 bg-black/40" />
              {isSaleActive && (
                <div className="absolute -inset-[1px] rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-500 via-orange-400 to-yellow-400 opacity-50 blur-sm animate-pulse" />
              )}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl sm:rounded-2xl">
                <div className="absolute -inset-y-4 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              </div>

              <div className="relative px-3 py-3 sm:px-5 sm:py-4">
                {isSaleActive ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-white text-black text-[8px] sm:text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          🔥 АКТИВНА
                        </span>
                        <span className="text-white/50 text-[8px] sm:text-xs font-bold uppercase tracking-wider">
                          −{percent}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-black/60 border border-white/15 rounded-lg px-2 py-1">
                        <Clock size={10} className="text-orange-300" />
                        <span className="font-mono text-xs sm:text-sm font-black text-white tabular-nums">
                          {countdown}
                        </span>
                      </div>
                    </div>
                    <p className="text-zinc-300 text-[10px] sm:text-xs font-bold">
                      на весь каталог • 22–25 мая МСК
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="bg-white/10 border border-white/20 text-white/70 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        ⏳ Скоро
                      </span>
                      <p className="text-zinc-300 text-[10px] sm:text-xs font-bold">
                        −{percent}% на весь каталог
                      </p>
                      <div className="flex items-center gap-1 bg-black/60 border border-white/15 rounded-lg px-2 py-1">
                        <Clock size={10} className="text-zinc-400" />
                        <span className="font-mono text-xs font-black text-white tabular-nums">{countdown}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
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

        {/* Bottom Nav — Minimal & Clean */}
        <nav className="pb-safe pb-2 sm:pb-6 pt-2 sm:pt-3 px-3 sm:px-8 flex justify-center items-center gap-3 sm:gap-4 border-t border-white/5 bg-black/95 backdrop-blur-lg z-20 flex-shrink-0">
          <button
            onClick={() => window.open('https://t.me/vibetechhSupport?direct', '_blank')}
            className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 active:scale-90 transition-transform text-zinc-400 hover:text-white"
          >
            <Headphones size={16} />
          </button>
          <div className="w-0.5 h-6 bg-white/10 rounded-full" />
          <button
            onClick={() => window.open('https://t.me/ApexTechhh', '_blank')}
            className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 active:scale-90 transition-transform text-zinc-400 hover:text-white"
          >
            <Newspaper size={16} />
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
"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Newspaper, User, Gift, Clock, ScrollText, Zap, ChevronDown, Search, Heart } from "lucide-react";
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

      {/* iPhone 17 Pro Max Full Screen App */}
      <div
        ref={containerRef}
        className="flex flex-col flex-1 w-full h-screen bg-black overflow-hidden"
      >
        {/* ===== TOP SECTION: Logo + Search Bar ===== */}
        <div className="pt-safe pt-3 pb-3 px-3.5 flex-shrink-0 bg-black">
          {/* Logo Row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Zap size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-black text-zinc-400 leading-none">APEX</p>
                  <p className="text-[10px] text-zinc-500 leading-none">STORE</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-8 w-8 rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center"
                onClick={() => setIsLegalDocsOpen(true)}
              >
                <ScrollText size={14} />
              </button>
              <button
                className="h-8 w-8 rounded-full overflow-hidden border border-white/10 active:scale-90 transition-transform bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0"
                onClick={() => profile ? navigate('/profile') : navigate('/login')}
              >
                {profile ? (
                  profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-xs uppercase">{profile.username.charAt(0)}</span>
                  )
                ) : (
                  <User size={14} className="text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              placeholder="Поиск товаров..."
              className="w-full h-10 pl-9 pr-3 bg-zinc-900 border border-zinc-800 rounded-full text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
            />
          </div>
        </div>

        {/* ===== SALE BANNER (Горизонтальный скролл) ===== */}
        {showBanner && (
          <div className="px-3.5 pb-2 flex-shrink-0">
            <div className={`relative overflow-hidden rounded-2xl px-4 py-3 ${isSaleActive ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500' : 'bg-gradient-to-r from-zinc-800 to-zinc-900'}`}>
              <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, white, transparent 50%)'}} />
              <div className="relative flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={16} className="text-white animate-pulse" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      {isSaleActive ? 'АКТИВНО' : 'СКОРО'}
                    </span>
                  </div>
                  <p className="text-sm font-black text-white">−{percent}% на всё</p>
                  <p className="text-[10px] text-white/70 mt-0.5">22–25 мая МСК</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Clock size={14} className="text-white/80" />
                  <span className="font-mono text-xs font-black text-white tabular-nums">{countdown}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 overflow-y-auto pb-20">
          {/* Categories/Filter */}
          <div className="px-3.5 py-3 flex-shrink-0 border-b border-zinc-900">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <button className="px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-xs font-bold text-white whitespace-nowrap hover:bg-white/20 transition-colors">
                Все
              </button>
              <button className="px-4 py-1.5 bg-black border border-zinc-800 rounded-full text-xs font-bold text-zinc-400 whitespace-nowrap hover:border-zinc-700 transition-colors">
                IDE
              </button>
              <button className="px-4 py-1.5 bg-black border border-zinc-800 rounded-full text-xs font-bold text-zinc-400 whitespace-nowrap hover:border-zinc-700 transition-colors">
                Голос
              </button>
              <button className="px-4 py-1.5 bg-black border border-zinc-800 rounded-full text-xs font-bold text-zinc-400 whitespace-nowrap hover:border-zinc-700 transition-colors">
                Инструменты
              </button>
            </div>
          </div>

          {/* Products — карточки с новым стилем */}
          <div className="px-3.5 pt-3 space-y-3">
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

        {/* ===== BOTTOM TAB BAR (как в iOS) ===== */}
        <div className="pb-safe pb-2 pt-2 px-3.5 flex-shrink-0 border-t border-zinc-900 bg-black/95 backdrop-blur-lg">
          <div className="flex justify-around items-center">
            <button className="flex flex-col items-center justify-center gap-1 py-2 px-6 text-zinc-400 hover:text-cyan-400 transition-colors group">
              <Zap size={20} className="group-hover:text-cyan-400" />
              <span className="text-[9px] font-bold uppercase">Shop</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 py-2 px-6 text-zinc-600 hover:text-white transition-colors group">
              <Heart size={20} className="group-hover:text-white" />
              <span className="text-[9px] font-bold uppercase">Избранное</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 py-2 px-6 text-zinc-600 hover:text-white transition-colors group">
              <Newspaper size={20} className="group-hover:text-white" />
              <span className="text-[9px] font-bold uppercase">Новости</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 py-2 px-6 text-zinc-600 hover:text-white transition-colors group" onClick={() => profile ? navigate('/profile') : navigate('/login')}>
              <User size={20} className="group-hover:text-white" />
              <span className="text-[9px] font-bold uppercase">Профиль</span>
            </button>
          </div>
        </div>
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
"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Newspaper, User } from "lucide-react";
import ProductCard from '@/components/ProductCard';
import PaymentModal from '@/components/PaymentModal';
import InfoModal from '@/components/InfoModal';
import { useAuth } from '@/hooks/use-auth';

const products = [
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
  {
    id: 'pc-control',
    name: 'PcControl',
    description: 'Полное управление компьютером через Telegram-бота.',
    fullInfo: 'Полное управление компьютером через Telegram-бота из любой точки мира.\n\nЗапуск программ, контроль процессов, доступ к системе — дистанционно и безопасно.',
    price: '1980',
    image: '/assets/pc-control.jpg',
    isComingSoon: false
  },
  {
    id: 'friday-pro',
    name: 'Friday Pro',
    description: 'Тот же функционал, что и у Jarvis Pro, но с женским голосом.',
    fullInfo: 'Тот же функционал, что и у Jarvis Pro, но с женским голосом.\n\nСтиль. Атмосфера. Характер.',
    price: '2380',
    image: '/assets/friday-pro.jpg',
    isComingSoon: false
  },
  {
    id: 'vibe-wall',
    name: 'VibeWall',
    description: 'Анимированные обои с интеграцией Jarvis.',
    fullInfo: 'Анимированные обои с интеграцией Jarvis.\n\nЖивой рабочий стол, который реагирует и работает вместе с вами.\n\nПолная синхронизация с вашим ассистентом и динамические визуальные эффекты.',
    price: '1200',
    image: '/assets/vibewall.jpg',
    isComingSoon: false
  },
  {
    id: 'friday-next-gen',
    name: 'FRIDAY',
    description: 'Новое поколение искусственного интеллекта. Скоро в продаже.',
    fullInfo: 'FRIDAY — это не просто помощник, это цифровая сущность.\n\nПолное погружение, улучшенная нейронная сеть и уникальный интерфейс взаимодействия.\n\nПродукт находится на стадии финального тестирования.',
    price: '0₽',
    image: '/assets/friday-max.jpg',
    isComingSoon: true
  }
];

const Index = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const handlePay = (productName: string) => {
    setSelectedProduct(productName);
    setIsPayModalOpen(true);
  };

  const handleInfo = (productName: string) => {
    setSelectedProduct(productName);
    setIsInfoModalOpen(true);
  };

  const currentProduct = products.find(p => p.name === selectedProduct) || null;

  return (
    <div className="min-h-screen bg-black font-sans text-white flex flex-col">

      {/* На ПК — iPad frame, на телефоне — полный экран */}
      <div
        ref={containerRef}
        className="
          flex flex-col flex-1
          /* Мобиль: полный экран без рамки */
          w-full h-screen
          /* ПК: центрированный iPad frame */
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
            <p className="text-base sm:text-xl font-black tracking-tighter uppercase italic">Vibe Technology</p>
          </div>
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
        </header>

        {/* Карточки */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-12 pb-3 sm:pb-12">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-3 sm:mb-6">
            Рекомендуемые товары
          </p>
          {/* Мобиль: 1 колонка. ПК: 2 колонки */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                name={product.name}
                description={product.description}
                price={product.price}
                image={product.image}
                isComingSoon={product.isComingSoon}
                onPay={() => handlePay(product.name)}
                onInfo={() => handleInfo(product.name)}
              />
            ))}
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
            onClick={() => window.open('https://t.me/VibeTechh', '_blank')}
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
        productPrice={currentProduct ? parseInt(currentProduct.price) : 0}
        containerRef={containerRef}
      />

      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        product={currentProduct}
        containerRef={containerRef}
      />
    </div>
  );
};

export default Index;

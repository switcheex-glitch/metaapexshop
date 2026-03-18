import { useState, useEffect } from 'react';

// Скидка 30% с 19 марта 01:00 МСК до 20 марта 01:00 МСК (ровно 24 часа)
const SALE_START = new Date('2026-03-19T01:00:00+03:00').getTime();
const SALE_END = new Date('2026-03-20T01:00:00+03:00').getTime();
const SALE_PERCENT = 30;

export function useSale() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isActive = now >= SALE_START && now < SALE_END;
  const timeLeft = isActive ? SALE_END - now : 0;

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const countdown = isActive
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : '';

  const getDiscountedPrice = (originalPrice: number): number => {
    if (!isActive) return originalPrice;
    return Math.round(originalPrice * (1 - SALE_PERCENT / 100));
  };

  return {
    isActive,
    percent: SALE_PERCENT,
    countdown,
    hours,
    minutes,
    seconds,
    getDiscountedPrice,
  };
}

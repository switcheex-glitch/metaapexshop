"use client";

import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, CreditCard, Loader2, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";
import { useSale } from "@/hooks/use-sale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface ProductCardProps {
  name: string;
  description: string;
  price: string;
  image: string;
  isComingSoon?: boolean;
  isNew?: boolean;
  onPay: () => void;
  onInfo: () => void;
  salePrice?: number;
  isBeta?: boolean;
}

const CURRENCIES = [
  { id: 'RUB', label: 'Рубли',      symbol: '₽',  flag: '🇷🇺' },
  { id: 'KZT', label: 'Тенге',      symbol: '₸',  flag: '🇰🇿' },
  { id: 'UAH', label: 'Гривны',     symbol: '₴',  flag: '🇺🇦' },
  { id: 'BYN', label: 'Бел. Рубли', symbol: 'Br', flag: '🇧🇾' },
  { id: 'USD', label: 'Доллары',    symbol: '$',  flag: '🇺🇸' },
  { id: 'EUR', label: 'Евро',       symbol: '€',  flag: '🇪🇺' },
  { id: 'PLN', label: 'Злотые',     symbol: 'zł', flag: '🇵🇱' },
  { id: 'GBP', label: 'Фунты',      symbol: '£',  flag: '🇬🇧' },
  { id: 'TRY', label: 'Лиры',       symbol: '₺',  flag: '🇹🇷' },
  { id: 'VB',  label: 'Vibe Coins', symbol: 'VB', flag: '⚡' },
] as const;

const ProductCard: React.FC<ProductCardProps> = ({
  name,
  description,
  price,
  image,
  isComingSoon,
  isNew,
  onPay,
  onInfo,
  salePrice,
  isBeta
}) => {
  const { convertPrice, getSymbol, setCurrency, currency, isLoadingRates, convertTo } = useCurrency();
  const { isActive: isSaleActive, percent: salePercent } = useSale();
  const numericPrice = parseInt(price.replace(/[^\d]/g, '')) || 0;
  const displayPrice = salePrice && isSaleActive ? salePrice : numericPrice;
  const currentCurrencyInfo = CURRENCIES.find(c => c.id === currency);

  return (
    <Card className="w-full h-full flex flex-col border-none bg-black text-white overflow-hidden rounded-[28px] sm:rounded-[40px] shadow-2xl">
      {/* Top Image Section */}
      <div className="relative aspect-video overflow-hidden rounded-t-[28px] sm:rounded-t-[40px] bg-zinc-900">
        <img
          src={image}
          alt={name}
          className={cn(
            "w-full h-full object-cover transition-transform duration-700",
            isComingSoon && "opacity-40 grayscale"
          )}
        />

        {isBeta && !isComingSoon && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
            <div className="rounded-full border border-amber-400/40 bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-black shadow-lg shadow-amber-500/30 sm:px-4 sm:py-1.5 sm:text-xs">
              Beta
            </div>
          </div>
        )}

        {name === 'Jarvis Industries' && !isComingSoon && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
            <div className="rounded-full border border-emerald-400/30 bg-emerald-400 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-black shadow-lg shadow-emerald-500/30 sm:px-3 sm:py-1 sm:text-[10px]">
              1 месяц
            </div>
          </div>
        )}

        <div className="absolute inset-0 p-4 sm:p-8 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent">
          <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300 sm:text-[11px]">
            <Monitor size={12} />
            Для Windows
          </div>
          <h2 className="text-xl sm:text-3xl font-black tracking-tighter uppercase leading-none mb-1 sm:mb-2">{name}</h2>
          <p className="text-zinc-300 text-[11px] sm:text-xs font-medium max-w-[90%] leading-snug">
            {isComingSoon ? "Продукт скоро поступит в продажу." : description}
          </p>
        </div>

        {isComingSoon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Badge variant="outline" className="text-white border-white/40 bg-white/10 px-4 sm:px-6 py-1.5 sm:py-2 text-base sm:text-xl font-bold tracking-widest backdrop-blur-xl rounded-full">
              СКОРО
            </Badge>
          </div>
        )}

        {/* NEW badge */}
        {isNew && !isComingSoon && (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-cyan-400/40 blur-md animate-pulse" />
              <div className="relative bg-cyan-400 text-black text-[10px] sm:text-xs font-black px-3 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-lg shadow-cyan-400/40 tracking-widest uppercase">
                ✦ NEW
              </div>
            </div>
          </div>
        )}

        {/* Sale badge */}
        {isSaleActive && !isComingSoon && numericPrice > 0 && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
            <div className="bg-rose-500 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg shadow-rose-500/30 animate-pulse">
              -{salePercent}%
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info Section */}
      <div className="flex-1 p-4 sm:p-8 flex flex-col justify-between bg-black">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-zinc-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] block">
              {isComingSoon ? "Статус" : "Цена от"}
            </span>
            {!isComingSoon && isLoadingRates && (
              <span className="text-[9px] text-zinc-600 flex items-center gap-1">
                <Loader2 size={8} className="animate-spin" /> актуальный курс...
              </span>
            )}
            {!isComingSoon && !isLoadingRates && currentCurrencyInfo && (
              <span className="text-[9px] sm:text-[10px] text-zinc-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                {currentCurrencyInfo.flag} {currentCurrencyInfo.label} · live
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-right hover:text-zinc-400 transition-colors cursor-pointer outline-none flex flex-col items-end gap-0.5">
                {isComingSoon ? (
                  <span className="text-xl sm:text-3xl font-bold tracking-tight">TBA</span>
                ) : isLoadingRates ? (
                  <Loader2 size={20} className="animate-spin text-zinc-600" />
                ) : (
                  <>
                    {isSaleActive && salePrice && salePrice !== numericPrice && (
                      <span className="text-xs sm:text-sm text-zinc-600 line-through font-medium">
                        {convertPrice(numericPrice)} {getSymbol()}
                      </span>
                    )}
                    <span className={cn(
                      "text-xl sm:text-3xl font-bold tracking-tight",
                      isSaleActive && salePrice ? "text-rose-400" : ""
                    )}>
                      {convertPrice(displayPrice)} {getSymbol()}
                    </span>
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-950 border-white/10 text-white p-2 rounded-2xl min-w-[190px] shadow-2xl">
              <DropdownMenuLabel className="text-[10px] text-zinc-600 uppercase tracking-widest px-3 py-2 flex items-center justify-between">
                <span>Валюта</span>
                {!isLoadingRates && (
                  <span className="flex items-center gap-1 text-green-500 normal-case tracking-normal text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    live
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5 mb-1" />
              {CURRENCIES.map((cur) => (
                <DropdownMenuItem
                  key={cur.id}
                  onClick={() => setCurrency(cur.id as any)}
                  className={cn(
                    "rounded-xl cursor-pointer p-2.5 flex items-center justify-between",
                    currency === cur.id ? "bg-white/10 text-white" : "hover:bg-white/5 text-zinc-300"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span>{cur.flag}</span>
                    <span className="font-medium text-sm">{cur.label}</span>
                  </span>
                  <span className={cn("font-mono text-xs", currency === cur.id ? "text-white font-bold" : "text-zinc-500")}>
                    {displayPrice > 0 && cur.id !== 'VB'
                      ? `${convertTo(displayPrice, cur.id as any)} ${cur.symbol}`
                      : cur.symbol}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-3 sm:mt-6">
          <Button
            variant="outline"
            className="h-10 sm:h-14 rounded-full border-zinc-800 bg-white/5 text-white hover:bg-white/10 text-sm sm:text-base font-bold transition-all border-2"
            onClick={onInfo}
          >
            <Info className="w-4 h-4 mr-1.5 sm:mr-2" />
            Инфо
          </Button>
          <Button
            className="h-10 sm:h-14 rounded-full bg-white text-black hover:bg-zinc-200 text-sm sm:text-base font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            onClick={onPay}
            disabled={isComingSoon}
          >
            <CreditCard className="w-4 h-4 mr-1.5 sm:mr-2" />
            Оплатить
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;
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
  hasMacOS?: boolean;
  isMonthly?: boolean;
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
  isBeta,
  hasMacOS,
  isMonthly
}) => {
  const { convertPrice, getSymbol, setCurrency, currency, isLoadingRates, convertTo } = useCurrency();
  const { isActive: isSaleActive, percent: salePercent } = useSale();
  const numericPrice = parseInt(price.replace(/[^\d]/g, '')) || 0;
  const displayPrice = salePrice && isSaleActive ? salePrice : numericPrice;
  const currentCurrencyInfo = CURRENCIES.find(c => c.id === currency);

  return (
    <Card className="w-full h-full flex flex-col border-none bg-zinc-950 text-white overflow-hidden rounded-2xl shadow-2xl hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] transition-shadow">
      {/* Top Image Section — iPhone Aspect Ratio */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-t-2xl bg-zinc-900">
        <img
          src={image}
          alt={name}
          className={cn(
            "w-full h-full object-cover transition-transform duration-700 hover:scale-105",
            isComingSoon && "opacity-30 grayscale"
          )}
        />

        {/* Badges Row */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5">
          {isBeta && !isComingSoon && (
            <div className="rounded-lg border border-amber-400/50 bg-amber-500 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/40">
              Beta
            </div>
          )}

          {(name === 'Jarvis Industries' || isMonthly) && !isComingSoon && (
            <div className="rounded-lg border border-emerald-400/50 bg-emerald-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-black shadow-lg shadow-emerald-500/40">
              1м
            </div>
          )}
        </div>

        <div className="absolute inset-0 p-3 flex flex-col justify-between bg-gradient-to-t from-black/95 via-black/40 to-transparent">
          {/* Top: Platform Badges */}
          <div className="flex flex-wrap gap-1">
            <div className="inline-flex items-center gap-1 rounded-lg border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-sky-300">
              <Monitor size={10} />
              Win
            </div>
            {hasMacOS && (
              <div className="inline-flex items-center gap-1 rounded-lg border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-purple-300">
                <Monitor size={10} />
                Mac
              </div>
            )}
          </div>

          {/* Bottom: Title & Description */}
          <div>
            <h2 className="text-lg font-black tracking-tight uppercase leading-tight mb-1">
              {name}
            </h2>
            <p className="text-zinc-400 text-[9px] font-medium line-clamp-2">
              {isComingSoon ? "Скоро" : description}
            </p>
          </div>
        </div>

        {isComingSoon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge variant="outline" className="text-white border-white/40 bg-white/10 px-3 py-1.5 text-sm font-bold tracking-wider backdrop-blur-xl rounded-lg">
              СКОРО
            </Badge>
          </div>
        )}

        {/* NEW badge */}
        {isNew && !isComingSoon && (
          <div className="absolute top-2.5 left-2.5 z-20">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-cyan-400/50 blur-md animate-pulse" />
              <div className="relative bg-cyan-500 text-black text-[8px] font-black px-2.5 py-0.5 rounded-lg shadow-lg shadow-cyan-500/50 tracking-wider uppercase">
                ✦ New
              </div>
            </div>
          </div>
        )}

        {/* Sale badge */}
        {isSaleActive && !isComingSoon && numericPrice > 0 && (
          <div className="absolute bottom-12 left-2.5 z-20">
            <div className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg shadow-rose-500/40 animate-pulse">
              −{salePercent}%
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info Section — iPhone Style */}
      <div className="flex-1 p-3 flex flex-col justify-between bg-zinc-950">
        {/* Price Section */}
        <div>
          <p className="text-zinc-500 text-[8px] font-bold uppercase tracking-wider block mb-1.5">
            {isComingSoon ? "Статус" : "Цена"}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-left hover:text-zinc-300 transition-colors cursor-pointer outline-none w-full">
                {isComingSoon ? (
                  <span className="text-lg font-black tracking-tight">TBA</span>
                ) : isLoadingRates ? (
                  <Loader2 size={16} className="animate-spin text-zinc-600" />
                ) : (
                  <div className="space-y-0.5">
                    {isSaleActive && salePrice && salePrice !== numericPrice && (
                      <p className="text-xs text-zinc-500 line-through">
                        {convertPrice(numericPrice)} {getSymbol()}
                      </p>
                    )}
                    <p className={cn(
                      "text-lg font-black tracking-tight leading-none",
                      isSaleActive && salePrice ? "text-orange-400" : "text-white"
                    )}>
                      {convertPrice(displayPrice)} {getSymbol()}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-950 border-white/10 text-white p-2 rounded-xl min-w-[170px] shadow-2xl">
              <DropdownMenuLabel className="text-[8px] text-zinc-600 uppercase tracking-wider px-3 py-2">
                Валюта
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              {CURRENCIES.map((cur) => (
                <DropdownMenuItem
                  key={cur.id}
                  onClick={() => setCurrency(cur.id as any)}
                  className={cn(
                    "rounded-lg cursor-pointer p-2 flex items-center justify-between text-sm",
                    currency === cur.id ? "bg-white/15 text-white" : "hover:bg-white/5 text-zinc-400"
                  )}
                >
                  <span className="flex items-center gap-1">
                    <span>{cur.flag}</span>
                    <span className="font-medium">{cur.label}</span>
                  </span>
                  <span className={cn("font-mono text-xs", currency === cur.id ? "text-white font-bold" : "text-zinc-600")}>
                    {displayPrice > 0 && cur.id !== 'VB'
                      ? `${convertTo(displayPrice, cur.id as any)} ${cur.symbol}`
                      : cur.symbol}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-1.5 mt-3">
          <Button
            variant="outline"
            className="h-8 rounded-lg border-zinc-700 bg-white/5 text-white hover:bg-white/10 text-xs font-bold transition-all border"
            onClick={onInfo}
          >
            <Info className="w-3 h-3 mr-1" />
            ?
          </Button>
          <Button
            className="h-8 rounded-lg bg-white text-black hover:bg-zinc-100 text-xs font-bold shadow-lg transition-all"
            onClick={onPay}
            disabled={isComingSoon}
          >
            <CreditCard className="w-3 h-3 mr-1" />
            →
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;
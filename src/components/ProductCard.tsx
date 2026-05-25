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
    <div className="group relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all">
      {/* Горизонтальная карточка: Image + Info */}
      <div className="flex gap-3 p-3">
        {/* Image — Left Side */}
        <div className="relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-zinc-900">
          <img
            src={image}
            alt={name}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
              isComingSoon && "opacity-30 grayscale"
            )}
          />

          {/* Badges на изображении */}
          {isNew && !isComingSoon && (
            <div className="absolute top-1.5 left-1.5">
              <div className="bg-cyan-500 text-black text-[7px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-cyan-500/50">
                NEW
              </div>
            </div>
          )}

          {isBeta && !isComingSoon && (
            <div className="absolute top-1.5 right-1.5">
              <div className="bg-amber-500 text-black text-[7px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-amber-500/40">
                BETA
              </div>
            </div>
          )}

          {isSaleActive && !isComingSoon && numericPrice > 0 && (
            <div className="absolute bottom-1.5 left-1.5">
              <div className="bg-rose-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/40">
                −{salePercent}%
              </div>
            </div>
          )}

          {isComingSoon && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <span className="text-[10px] font-black text-white uppercase">Скоро</span>
            </div>
          )}
        </div>

        {/* Info — Right Side */}
        <div className="flex-1 flex flex-col justify-between py-1">
          {/* Title + Description */}
          <div>
            <h3 className="text-sm font-black text-white leading-tight mb-1">
              {name}
            </h3>
            <p className="text-xs text-zinc-400 line-clamp-2 mb-2">
              {description}
            </p>

            {/* Platform badges */}
            <div className="flex gap-1 flex-wrap">
              {hasMacOS && (
                <span className="text-[8px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                  Mac
                </span>
              )}
              <span className="text-[8px] font-bold text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                Win
              </span>
              {(name === 'Jarvis Industries' || isMonthly) && (
                <span className="text-[8px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  1м
                </span>
              )}
            </div>
          </div>

          {/* Price + Button */}
          <div className="flex items-end justify-between gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none hover:opacity-80 transition-opacity cursor-pointer">
                  {isComingSoon ? (
                    <span className="text-xs font-black text-zinc-500">TBA</span>
                  ) : isLoadingRates ? (
                    <Loader2 size={12} className="animate-spin text-zinc-600" />
                  ) : (
                    <div>
                      {isSaleActive && salePrice && salePrice !== numericPrice && (
                        <p className="text-[9px] text-zinc-600 line-through">
                          {convertPrice(numericPrice)}
                        </p>
                      )}
                      <p className={cn(
                        "text-xs font-black leading-none",
                        isSaleActive && salePrice ? "text-orange-400" : "text-white"
                      )}>
                        {convertPrice(displayPrice)} {getSymbol()}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-white p-1 rounded-xl min-w-[150px] shadow-2xl">
                <DropdownMenuLabel className="text-[7px] text-zinc-600 uppercase px-2 py-1.5">
                  Валюта
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800 my-0.5" />
                {CURRENCIES.map((cur) => (
                  <DropdownMenuItem
                    key={cur.id}
                    onClick={() => setCurrency(cur.id as any)}
                    className={cn(
                      "rounded-lg cursor-pointer p-1.5 flex items-center justify-between text-xs",
                      currency === cur.id ? "bg-white/15 text-white" : "hover:bg-white/5 text-zinc-500"
                    )}
                  >
                    <span className="flex items-center gap-1">
                      <span>{cur.flag}</span>
                      <span>{cur.label}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold transition-colors"
                onClick={onInfo}
              >
                <Info size={12} />
              </Button>
              <Button
                size="sm"
                className="h-7 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[10px] font-black shadow-lg transition-all"
                onClick={onPay}
                disabled={isComingSoon}
              >
                <CreditCard size={12} className="mr-1" />
                Купить
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
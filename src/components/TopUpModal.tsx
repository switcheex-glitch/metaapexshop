"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, CreditCard, Landmark, Globe, X } from 'lucide-react';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const paymentMethods = [
  {
    id: 'ua',
    title: 'Украина (Mono, АБанк, Пумб)',
    icon: <Landmark className="w-5 h-5" />,
    options: [
      { name: 'MonoBank', holder: 'Богдан Р.', card: '4441111066552765' },
      { name: 'АБанк', holder: 'Богдан Р.', card: '4323347363236206' },
      { name: 'Пумб', holder: 'Богдан Р.', card: '5355280043078623' },
    ]
  },
  {
    id: 'kz_rb',
    title: 'Kaspi и РБ',
    icon: <CreditCard className="w-5 h-5" />,
    options: [
      { name: 'Kaspi/РБ', holder: 'Фарида Л.', card: '4400 4303 0558 1131' }
    ]
  },
  {
    id: 'paypal',
    title: 'PayPal',
    icon: <Globe className="w-5 h-5" />,
    options: [
      { name: 'PayPal', holder: 'Global Pay', card: 'Dark_in2000@mail.ru' }
    ]
  }
];

const TopUpModal = ({ isOpen, onClose }: TopUpModalProps) => {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Реквизиты скопированы");
  };

  return (
    <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-white/10 w-full max-w-[350px] rounded-[32px] p-6 space-y-6 shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
        
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase italic leading-tight">Пополнение баланса</h2>
          <p className="text-zinc-500 text-[11px] leading-relaxed">
            Введите сумму и выберите способ оплаты для получения реквизитов.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest px-1">Сумма (VB)</label>
            <div className="relative">
              <Input 
                type="number" 
                placeholder="Например: 1000" 
                className="bg-zinc-900/50 border-white/5 h-14 rounded-2xl text-lg font-bold pr-10 focus:border-white/20 transition-all"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none opacity-50">
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-white"></div>
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-white"></div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest px-1">Способ оплаты</label>
            <div className="grid gap-2">
              {paymentMethods.map((method) => (
                <div key={method.id} className="space-y-2">
                  <button
                    onClick={() => setSelectedMethod(selectedMethod === method.id ? null : method.id)}
                    className={cn(
                      "w-full p-4 rounded-2xl border transition-all flex items-center gap-3",
                      selectedMethod === method.id 
                      ? 'bg-zinc-900 border-white/20' 
                      : 'bg-zinc-900/30 border-white/5 hover:bg-zinc-900/50'
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-xl",
                      selectedMethod === method.id ? "text-white" : "text-zinc-500"
                    )}>
                      {method.icon}
                    </div>
                    <span className="font-bold text-sm tracking-tight">{method.title}</span>
                  </button>
                  
                  {selectedMethod === method.id && (
                    <div className="grid gap-2 animate-in slide-in-from-top-2 duration-200">
                      {method.options.map((opt, idx) => (
                        <div key={idx} className="bg-zinc-900/80 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                          <div className="overflow-hidden">
                            <p className="text-[9px] text-zinc-500 uppercase font-black truncate">{opt.name} — {opt.holder}</p>
                            <p className="font-mono text-[13px] tracking-wider text-white mt-0.5 truncate">{opt.card}</p>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(opt.card)}
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors ml-2 flex-shrink-0"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
          <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
            * После перевода средств по указанным реквизитам, баланс будет зачислен в течение 5-15 минут. Сохраняйте чек об оплате.
          </p>
        </div>

        <Button 
          onClick={onClose}
          className="w-full h-14 bg-white text-black font-black uppercase italic rounded-2xl hover:bg-zinc-200 shadow-xl"
        >
          Я оплатил
        </Button>
      </div>
    </div>
  );
};

export default TopUpModal;
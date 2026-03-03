"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { X, Info } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    name: string;
    fullInfo: string;
    image: string;
    price: string;
  } | null;
  containerRef?: React.RefObject<HTMLDivElement>;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, product }) => {
  if (!product) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[201] w-[90%] max-w-[500px] -translate-x-1/2 -translate-y-1/2 gap-0 border border-zinc-800 bg-black shadow-2xl duration-200 rounded-[32px] outline-none overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          
          <div className="relative h-48 w-full">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
            <DialogPrimitive.Close className="absolute right-4 top-4 p-2 rounded-full bg-black/50 text-white/70 hover:text-white transition-colors backdrop-blur-md border border-white/10">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="p-6 pt-2">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-zinc-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">ИНФОРМАЦИЯ</span>
              </div>
              <DialogPrimitive.Title className="text-2xl font-black uppercase tracking-tight text-white leading-none">
                {product.name}
              </DialogPrimitive.Title>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line font-medium">
                {product.fullInfo}
              </p>
              
              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-zinc-500 text-xs uppercase font-bold tracking-wider">Стоимость</span>
                <span className="text-xl font-black text-white">{product.price} ₽</span>
              </div>
            </div>

            <Button 
              onClick={onClose}
              className="w-full bg-zinc-100 text-black hover:bg-white rounded-2xl h-14 font-black uppercase text-sm tracking-widest transition-transform active:scale-95"
            >
              ПОНЯТНО
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default InfoModal;
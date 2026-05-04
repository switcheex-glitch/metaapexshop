"use client";

import React, { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, FileText, ShieldCheck } from "lucide-react";
import {
  USER_AGREEMENT_FULL_TEXT,
  USER_AGREEMENT_TITLE,
  USER_AGREEMENT_UPDATED_AT,
} from "@/content/user-agreement";
import {
  PRIVACY_POLICY_FULL_TEXT,
  PRIVACY_POLICY_TITLE,
  PRIVACY_POLICY_UPDATED_AT,
} from "@/content/privacy-policy";

interface LegalDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "privacy" | "agreement";

const LegalDocsModal: React.FC<LegalDocsModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<Tab>("privacy");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "privacy", label: "Конфиденциальность", icon: <ShieldCheck size={14} /> },
    { id: "agreement", label: "Соглашение", icon: <FileText size={14} /> },
  ];

  const isPrivacy = tab === "privacy";

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[201] w-[94%] max-w-[560px] -translate-x-1/2 -translate-y-1/2 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="bg-zinc-950 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/5 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/10">
                    {isPrivacy ? (
                      <ShieldCheck className="text-white" size={22} />
                    ) : (
                      <FileText className="text-white" size={22} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogPrimitive.Title className="text-lg font-black uppercase tracking-tight text-white leading-tight">
                      {isPrivacy ? PRIVACY_POLICY_TITLE : USER_AGREEMENT_TITLE}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="text-zinc-500 text-xs mt-0.5">
                      {isPrivacy ? PRIVACY_POLICY_UPDATED_AT : USER_AGREEMENT_UPDATED_AT} · Apex Technology
                    </DialogPrimitive.Description>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-zinc-500 hover:text-white transition-colors flex-shrink-0"
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="mt-4 flex gap-2 bg-white/5 border border-white/5 rounded-2xl p-1">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                      tab === t.id
                        ? "bg-white text-black shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
              <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">
                {isPrivacy ? PRIVACY_POLICY_FULL_TEXT : USER_AGREEMENT_FULL_TEXT}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-4 border-t border-white/5 flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full h-12 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black uppercase text-sm tracking-widest transition-all active:scale-95"
              >
                Закрыть
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default LegalDocsModal;

"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRIVACY_POLICY_FULL_TEXT, PRIVACY_POLICY_TITLE } from "@/content/privacy-policy";

interface PrivacyPolicyConsentStepProps {
  onAccept: () => void;
  onDecline: () => void;
}

const PrivacyPolicyConsentStep: React.FC<PrivacyPolicyConsentStepProps> = ({ onAccept, onDecline }) => {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [checked, setChecked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasScrolled(false);
    setChecked(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    if (isNearBottom) setHasScrolled(true);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="text-white" size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-white font-black uppercase tracking-tight text-sm">Политика конфиденциальности</p>
          <p className="text-zinc-500 text-xs leading-relaxed mt-1">
            Ознакомьтесь с тем, какие данные мы собираем и как их защищаем.
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-[44vh] overflow-y-auto rounded-2xl border border-white/5 bg-black/40 p-4"
      >
        <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-line">{PRIVACY_POLICY_FULL_TEXT}</p>
      </div>

      {!hasScrolled && (
        <button
          onClick={scrollToBottom}
          className="w-full flex items-center justify-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs py-2 border border-white/5 rounded-xl bg-white/2"
        >
          <ChevronDown size={14} className="animate-bounce" />
          Прокрутите вниз чтобы прочитать
        </button>
      )}

      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          onClick={() => setChecked((v) => !v)}
          className={`w-5 h-5 rounded-lg border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
            checked ? "bg-white border-white" : "border-zinc-600 group-hover:border-zinc-400"
          }`}
        >
          {checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <span className="text-xs text-zinc-400 leading-relaxed">
          Я ознакомился(ась) и принимаю <span className="text-white font-bold">{PRIVACY_POLICY_TITLE}</span>
        </span>
      </label>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onDecline}
          className="flex-1 h-12 rounded-2xl border border-white/10 text-zinc-500 hover:text-white hover:border-white/20 transition-all text-sm font-bold flex items-center justify-center gap-2"
        >
          <XCircle size={16} />
          Отказаться
        </button>
        <Button
          onClick={onAccept}
          disabled={!checked}
          className="flex-[2] h-12 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black uppercase text-sm tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          Принять и продолжить
        </Button>
      </div>
    </div>
  );
};

export default PrivacyPolicyConsentStep;

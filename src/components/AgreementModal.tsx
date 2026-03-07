"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, FileText, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as DialogPrimitive from "@radix-ui/react-dialog";

interface AgreementModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const SECTIONS = [
  {
    num: '1', title: 'ОБЩИЕ ПОЛОЖЕНИЯ',
    content: `Настоящее Соглашение регулирует отношения между компанией APEX TECHNOLOGY («Правообладатель») и Пользователем при приобретении и использовании программного обеспечения: Jarvis Max, Jarvis Pro, PcControl, Friday Pro.

Совершая акцепт, Пользователь подтверждает, что полностью ознакомился с условиями и принимает их без оговорок. Соглашение регулируется законодательством Российской Федерации.`
  },
  {
    num: '2', title: 'ПРЕДМЕТ СОГЛАШЕНИЯ',
    content: `Правообладатель предоставляет Пользователю простую (неисключительную) лицензию на использование Программы в соответствии со ст. 1235 ГК РФ.

Пользователь получает право использовать Программу исключительно для личных целей и предпринимательской деятельности в пределах функциональности Программы. Исключительные права на Программу не передаются.`
  },
  {
    num: '3', title: 'ПРАВА ПОЛЬЗОВАТЕЛЯ',
    content: `Пользователь, правомерно владеющий лицензией, имеет право:
• Использовать Программу на собственных устройствах
• Устанавливать и хранить Программу в памяти ЭВМ
• Создавать архивную копию Программы
• Изучать функционирование Программы в пределах ст. 1280 ГК РФ
• Получать обновления и техническую поддержку`
  },
  {
    num: '4', title: 'ОГРАНИЧЕНИЯ ИСПОЛЬЗОВАНИЯ',
    content: `Пользователю запрещается:
• Распространять, продавать или передавать копии Программы
• Передавать лицензионные ключи, учётные данные или доступ третьим лицам
• Публиковать лицензионные ключи в открытом доступе
• Предоставлять доступ через SaaS, удалённый доступ, облачные сервисы
• Декомпилировать, дизассемблировать или анализировать Программу
• Создавать аналогичное или конкурирующее ПО на основе Программы`
  },
  {
    num: '5', title: 'ИНТЕЛЛЕКТУАЛЬНАЯ СОБСТВЕННОСТЬ',
    content: `Программа является объектом интеллектуальной собственности. Защите подлежат: исходный код, алгоритмы, архитектура, интерфейс, дизайн, голосовые модели, базы данных, нейросетевые модели.

Все исключительные права принадлежат APEX TECHNOLOGY. Нарушение влечёт ответственность по ст. 1250, 1252, 1301 ГК РФ.`
  },
  {
    num: '7', title: 'ИИ И ЛИМИТЫ ЗАПРОСОВ',
    content: `Jarvis Max использует технологии искусственного интеллекта. Базовый лимит: 100 запросов к системе ИИ в сутки.

Под запросом понимается любое обращение: текстовая команда, голосовая команда, генерация ответа, обработка данных. После достижения лимита доступ к ИИ временно ограничивается до следующего дня. Пользователь может приобрести дополнительные пакеты запросов.`
  },
  {
    num: '10', title: 'УСЛОВИЯ ВОЗВРАТА',
    content: `Возврат осуществляется в соответствии с Законом РФ «О защите прав потребителей».

Пользователь вправе отказаться от договора до активации или начала использования Программы. После активации возврат возможен в течение 14 дней, если Программа не использовалась.

Для пакетов AI-запросов: Стоимость пакета ÷ количество запросов × неиспользованные запросы.`
  },
  {
    num: '11', title: 'ОГРАНИЧЕНИЕ ОТВЕТСТВЕННОСТИ',
    content: `Программа предоставляется «как есть» (AS IS). Правообладатель не гарантирует отсутствие ошибок, непрерывную работу или соответствие ожиданиям пользователя.

Максимальная ответственность Правообладателя ограничивается суммой покупки лицензии.`
  },
  {
    num: '13', title: 'БЛОКИРОВКА ЛИЦЕНЗИИ',
    content: `При нарушении условий соглашения Правообладатель вправе ограничить доступ, приостановить лицензию или потребовать устранения нарушений. При повторных нарушениях лицензия может быть прекращена.`
  },
  {
    num: '17', title: 'РАЗРЕШЕНИЕ СПОРОВ',
    content: `Споры решаются путём переговоров. Досудебный порядок обязателен. Срок ответа на претензию — 10 рабочих дней. Споры рассматриваются в соответствии с законодательством РФ.

Канал поддержки: t.me/vibetechhSupport`
  },
];

const AgreementModal: React.FC<AgreementModalProps> = ({ isOpen, onAccept, onDecline }) => {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [checked, setChecked] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasScrolled(false);
      setChecked(false);
      setExpandedSection(null);
    }
  }, [isOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (isNearBottom) setHasScrolled(true);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={() => {}}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[301] w-[94%] max-w-[520px] -translate-x-1/2 -translate-y-1/2 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/5 flex-shrink-0">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/10">
                  <FileText className="text-white" size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogPrimitive.Title className="text-lg font-black uppercase tracking-tight text-white leading-tight">
                    Лицензионный договор
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-zinc-500 text-xs mt-0.5">
                    Публичная оферта · Редакция от 01.03.2026 · APEX TECHNOLOGY
                  </DialogPrimitive.Description>
                </div>
              </div>

              {/* Intro */}
              <div className="mt-4 bg-white/3 border border-white/5 rounded-2xl p-4">
                <p className="text-zinc-300 text-xs leading-relaxed">
                  Настоящий документ является официальным предложением (публичной офертой) компании{' '}
                  <span className="text-white font-bold">APEX TECHNOLOGY</span> заключить лицензионный договор.
                  Нажимая «Принимаю условия», вы подтверждаете согласие со всеми условиями.
                </p>
              </div>
            </div>

            {/* Scrollable content */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0"
              style={{ maxHeight: '42vh' }}
            >
              {SECTIONS.map((section) => (
                <div key={section.num} className="border border-white/5 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.num ? null : section.num)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-zinc-600 bg-white/5 px-2 py-0.5 rounded-lg min-w-[28px] text-center">
                        {section.num}
                      </span>
                      <span className="text-sm font-bold text-zinc-200 uppercase tracking-wide">
                        {section.title}
                      </span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-zinc-600 flex-shrink-0 transition-transform duration-200 ${expandedSection === section.num ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {expandedSection === section.num && (
                    <div className="px-4 pb-4 pt-1 border-t border-white/5">
                      <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-line">
                        {section.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* Support link */}
              <div className="pt-2 pb-1">
                <a
                  href="https://t.me/vibetechhSupport"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs py-2"
                >
                  <ExternalLink size={12} />
                  Канал поддержки: t.me/vibetechhSupport
                </a>
              </div>
            </div>

            {/* Scroll hint */}
            {!hasScrolled && (
              <button
                onClick={scrollToBottom}
                className="mx-6 mb-2 flex items-center justify-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors text-xs py-2 border border-white/5 rounded-xl bg-white/2"
              >
                <ChevronDown size={14} className="animate-bounce" />
                Прокрутите вниз чтобы прочитать
              </button>
            )}

            {/* Footer */}
            <div className="px-6 pb-6 pt-4 border-t border-white/5 flex-shrink-0 space-y-4">
              {/* Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setChecked(!checked)}
                  className={`w-5 h-5 rounded-lg border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                    checked
                      ? 'bg-white border-white'
                      : 'border-zinc-600 group-hover:border-zinc-400'
                  }`}
                >
                  {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-zinc-400 leading-relaxed">
                  Я прочитал(а) и соглашаюсь с условиями{' '}
                  <span className="text-white font-bold">Лицензионного договора (публичной оферты)</span>,{' '}
                  Политикой конфиденциальности и Политикой допустимого использования
                </span>
              </label>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onDecline}
                  className="flex-1 h-12 rounded-2xl border border-white/10 text-zinc-500 hover:text-white hover:border-white/20 transition-all text-sm font-bold"
                >
                  Отказаться
                </button>
                <Button
                  onClick={onAccept}
                  disabled={!checked}
                  className="flex-[2] h-12 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black uppercase text-sm tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  Принимаю условия
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default AgreementModal;

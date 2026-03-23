import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Webhook } from 'lucide-react';

export default function AdminSetup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const setupWebhook = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('setup-webhook');
      if (fnError) throw fnError;
      setResult(data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Webhook size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Настройка Webhook</h1>
          <p className="text-zinc-500 text-sm mt-2">Регистрация Telegram webhook для обработки кнопок</p>
        </div>

        <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 space-y-2">
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Что делает webhook</p>
          <p className="text-sm text-zinc-300 leading-relaxed">
            После регистрации кнопки <span className="text-white font-bold">✅ Одобрить</span> и <span className="text-white font-bold">❌ Отклонить</span> в Telegram будут работать без открытия браузера — прямо в чате.
          </p>
        </div>

        <Button
          onClick={setupWebhook}
          disabled={loading}
          className="w-full h-14 bg-white text-black font-black uppercase rounded-2xl hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Регистрируем...</span>
          ) : (
            <span className="flex items-center gap-2"><Webhook size={18} /> Зарегистрировать Webhook</span>
          )}
        </Button>

        {result && (
          <div className={`rounded-2xl border p-4 space-y-3 ${result.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle size={18} className="text-green-400" />
              ) : (
                <XCircle size={18} className="text-red-400" />
              )}
              <span className={`font-bold text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? 'Webhook успешно зарегистрирован!' : 'Ошибка регистрации'}
              </span>
            </div>
            {result.webhookInfo?.result && (
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Текущий webhook</p>
                <p className="text-xs text-zinc-300 font-mono break-all">{result.webhookInfo.result.url || 'не установлен'}</p>
                {result.webhookInfo.result.last_error_message && (
                  <p className="text-xs text-red-400">Последняя ошибка: {result.webhookInfo.result.last_error_message}</p>
                )}
                <p className="text-xs text-zinc-500">
                  Ожидающих обновлений: {result.webhookInfo.result.pending_update_count || 0}
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={16} className="text-red-400" />
              <span className="text-red-400 font-bold text-sm">Ошибка</span>
            </div>
            <p className="text-red-300 text-xs font-mono">{error}</p>
          </div>
        )}

        <p className="text-center text-zinc-600 text-xs">
          Страница доступна только администраторам
        </p>
      </div>
    </div>
  );
}

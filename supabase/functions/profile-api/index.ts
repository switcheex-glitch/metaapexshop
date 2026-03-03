import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'vibe_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  console.log("[profile-api] action:", action);

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (action === 'login') {
    const { telegramId, password } = await req.json();
    if (!telegramId || !password) {
      return new Response(JSON.stringify({ error: 'telegramId and password required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formattedId = telegramId.startsWith('@') ? telegramId : `@${telegramId}`;
    const hash = await hashPassword(password);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', formattedId)
      .eq('password_hash', hash)
      .single();

    if (error || !data) {
      const { data: exists } = await supabase
        .from('profiles')
        .select('id')
        .eq('telegram_id', formattedId)
        .single();

      if (!exists) {
        return new Response(JSON.stringify({ error: 'Аккаунт не найден. Создайте новый.' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Неверный пароль' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (data.is_blocked) {
      return new Response(JSON.stringify({ error: '🚫 Ваш профиль заблокирован. Обратитесь в поддержку.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', data.id);
    console.log("[profile-api] login success:", data.id);
    return new Response(JSON.stringify({ profile: data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── REGISTER ───────────────────────────────────────────────────────────────
  if (action === 'register') {
    const { telegramId, username, password, avatarUrl } = await req.json();
    if (!telegramId || !username || !password) {
      return new Response(JSON.stringify({ error: 'telegramId, username and password required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formattedId = telegramId.startsWith('@') ? telegramId : `@${telegramId}`;

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('telegram_id', formattedId)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Аккаунт с этим Telegram ID уже существует. Войдите с паролем.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hash = await hashPassword(password);
    const { data, error } = await supabase
      .from('profiles')
      .insert({ telegram_id: formattedId, username, password_hash: hash, balance: 0, avatar_url: avatarUrl || null })
      .select()
      .single();

    if (error || !data) {
      console.error("[profile-api] register error:", error);
      return new Response(JSON.stringify({ error: 'Ошибка при регистрации. Попробуйте снова.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("[profile-api] register success:", data.id);
    return new Response(JSON.stringify({ profile: data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── GET PROFILE ────────────────────────────────────────────────────────────
  if (action === 'get-profile') {
    const { profileId } = await req.json();
    if (!profileId) {
      return new Response(JSON.stringify({ error: 'profileId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', profileId);
    return new Response(JSON.stringify({ profile: data }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── GET PURCHASES ──────────────────────────────────────────────────────────
  if (action === 'get-purchases') {
    const { profileId } = await req.json();
    if (!profileId) {
      return new Response(JSON.stringify({ error: 'profileId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('profile_id', profileId)
      .order('purchased_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch purchases' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ purchases: data || [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
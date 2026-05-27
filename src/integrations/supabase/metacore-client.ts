import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_FN_BASE } from './client';

// Все товары теперь идут через один проект Supabase и один Platega webhook
export const METACORE_SUPABASE_URL = SUPABASE_URL;
export const METACORE_SUPABASE_KEY = SUPABASE_PUBLISHABLE_KEY;
export const METACORE_FN_BASE = SUPABASE_FN_BASE;
export const METACORE_PAYMENT_URL = `${SUPABASE_FN_BASE}/platega-webhook`;

export const metacoreSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export type MetacorePurchase = {
  id: string;
  profile_id: string;
  telegram_id: string;
  username: string | null;
  product_id: string;
  product_name: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  payment_method: string | null;
  platega_transaction_id: string | null;
  invited_to_group: boolean;
  invited_at: string | null;
  invite_link: string | null;
  activation_key: string | null;
  tier: 'demo' | 'standard' | 'pro';
  tokens_purchased: number | null;
  created_at: string;
  approved_at: string | null;
};

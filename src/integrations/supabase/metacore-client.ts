import { createClient } from '@supabase/supabase-js';

export const METACORE_SUPABASE_URL = 'https://nsrilzwmclsiwtrsomer.supabase.co';
export const METACORE_SUPABASE_KEY = 'sb_publishable_hwWGgZt8SK88_6ToeoKjtA_Sja5GyGM';
export const METACORE_FN_BASE = `${METACORE_SUPABASE_URL}/functions/v1`;
export const METACORE_PAYMENT_URL = `${METACORE_FN_BASE}/platega-webhook`;

export const metacoreSupabase = createClient(METACORE_SUPABASE_URL, METACORE_SUPABASE_KEY);

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
  created_at: string;
  approved_at: string | null;
};

import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = "https://dgsqexlmknnbdeikrjba.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnc3FleGxta25uYmRlaWtyamJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDI0ODEsImV4cCI6MjA5NTQ3ODQ4MX0.UbuUvgif9vlm6KRHRNHkXkxvB3JGI2y0D5SsKvze-MY";
export const SUPABASE_FN_BASE = `${SUPABASE_URL}/functions/v1`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export type Profile = {
  id: string;
  telegram_id: string;
  username: string;
  balance: number;
  avatar_url: string | null;
  created_at: string;
  last_seen: string;
  is_blocked: boolean;
  block_reason: string | null;
};

export type Purchase = {
  id: string;
  profile_id: string;
  product_id: string;
  product_name: string;
  price: number;
  purchased_at: string;
  status: 'pending' | 'approved' | 'rejected';
  payment_method: string | null;
  screenshot_url: string | null;
  reviewed_at: string | null;
  telegram_message_id: number | null;
  invited_to_group: boolean;
  invited_at: string | null;
  invite_link: string | null;
};

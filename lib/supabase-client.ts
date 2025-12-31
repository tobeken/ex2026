"use client";

import { createClient } from "@supabase/supabase-js";

// Supabase changed env naming: prefer PUBLISHABLE_DEFAULT_KEY, fall back to old ANON_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or publishable key is missing. Check .env.local");
}

export const supabaseClient = createClient(
  supabaseUrl || "",
  supabaseAnonKey || "",
);

export default supabaseClient;

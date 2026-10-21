/**
 * NoCharity Ingestion Framework — Database Client
 * 
 * Configures Supabase for local/manual maintenance ingestion scripts.
 * Prioritizes SUPABASE_SERVICE_ROLE_KEY (if present in local .env) to bypass RLS,
 * otherwise falls back to SUPABASE_ANON_KEY.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_KEY &&
  !SUPABASE_URL.includes('your-project') &&
  !SUPABASE_KEY.includes('your-anon')
);

export const isServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    })
  : null;

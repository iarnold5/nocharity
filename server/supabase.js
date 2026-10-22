/**
 * Supabase Client & Connection Layer for NoCharity Advanced Mode
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Check if credentials exist and are not boilerplate placeholders
export const isConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('your-project') &&
  !SUPABASE_ANON_KEY.includes('your-anon')
);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })
  : null;

/**
 * Returns connection and configuration status for Advanced Mode
 */
export async function getSupabaseStatus() {
  if (!isConfigured) {
    return {
      configured: false,
      connected: false,
      schema_version: 'phase_2_connected',
      message: 'Supabase credentials missing or set to placeholder in .env. Running in offline groundwork mode.',
      hint: 'Copy .env.example to .env and set your SUPABASE_URL and SUPABASE_ANON_KEY.',
    };
  }

  try {
    // Quick, indexed ping on the people table
    const { data, error } = await supabase.from('people').select('id').limit(1);
    if (error) {
      return {
        configured: true,
        connected: false,
        schema_version: 'phase_2_connected',
        message: `Connected to Supabase endpoint, but query failed: ${error.message}`,
        hint: 'Have you run the migrations in supabase/migrations/?',
        error: error.message,
      };
    }

    return {
      configured: true,
      connected: true,
      schema_version: 'phase_2_connected',
      project_url: SUPABASE_URL,
      message: 'Connected to live Supabase PostgreSQL database.',
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      schema_version: 'phase_2_connected',
      message: `Failed to connect to Supabase: ${err.message}`,
      error: err.message,
    };
  }
}

// Re-export all Phase 2 Data Access Layer functions
export {
  getPeople,
  getPersonById,
  getBillionaireProfile,
  getWealthHistory,
  getDonations,
  getDonationById,
  getSourcesForDonation,
  getPersonOrganizations,
  getPersonGivingSummary,
  getRankings,
  getTags,
  getDashboardMetrics,
  calculateHistoricalParity,
  calculateHistoricalDonationParity,
  compareBillionairesParity,
  findClosestHistoricalWealthSnapshot,
  classifySnapshotQuality,
  QUALITY_TIERS,
  QUALITY_METADATA,
  getCanonicalBillionaires,
  filterDonationsByTimeframe
} from './data-access.js';

// Backwards compatibility aliases
export { getPeople as getAdvancedPeople, getPeople as getAdvancedBillionaires } from './data-access.js';
export { getDonations as getAdvancedDonations } from './data-access.js';

export async function getAdvancedOrganizations() {
  if (!supabase) return { source: 'offline_fallback', organizations: [] };
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('display_name');
  if (error) throw error;
  return { source: 'supabase', count: data.length, organizations: data };
}

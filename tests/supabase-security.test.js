import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { supabase, isConfigured } from '../server/supabase.js';
import {
  getPeople,
  getDonations,
  getDashboardMetrics,
  getRankings,
  getWealthHistory
} from '../server/data-access.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Supabase Security Advisor Remediation & Least-Privilege Architecture', () => {

  // 1. Migration File Validation
  test('1. Migration 20261022000011_security_hardening_and_least_privilege.sql exists and is comprehensive', () => {
    const migrationPath = path.join(
      rootDir,
      'supabase',
      'migrations',
      '20261022000011_security_hardening_and_least_privilege.sql'
    );
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

    const content = fs.readFileSync(migrationPath, 'utf8');

    // Check security_invoker on all 4 views
    assert.match(content, /ALTER VIEW public\.v_donations_with_parity SET \(security_invoker = true\)/);
    assert.match(content, /ALTER VIEW public\.v_person_giving_summary SET \(security_invoker = true\)/);
    assert.match(content, /ALTER VIEW public\.v_person_rankings SET \(security_invoker = true\)/);
    assert.match(content, /ALTER VIEW public\.v_advanced_dashboard_metrics SET \(security_invoker = true\)/);

    // Check search_path = '' on read functions
    assert.match(content, /CREATE OR REPLACE FUNCTION public\.get_closest_net_worth/);
    assert.match(content, /CREATE OR REPLACE FUNCTION public\.get_historical_snapshot_details/);
    assert.match(content, /CREATE OR REPLACE FUNCTION public\.get_sources_for_donation/);
    assert.ok((content.match(/SET search_path = ''/g) || []).length >= 3, 'All functions must pin search_path');

    // Check revocation of modifying privileges
    assert.match(content, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE/);
    assert.match(content, /REVOKE ALL ON FUNCTION public\.rls_auto_enable/);
    assert.match(content, /REVOKE ALL ON FUNCTION public\.fn_clean_tables/);
    assert.match(content, /REVOKE ALL ON FUNCTION public\.test_cleanup/);

    // Check grants
    assert.match(content, /GRANT SELECT ON TABLE/);
    assert.match(content, /GRANT SELECT ON TABLE[\s\S]*?TO anon, authenticated/);
  });

  // 2. Anonymous Read Access to Core Tables
  test('2. Anonymous role can read core public data tables', async () => {
    if (!isConfigured || !supabase) {
      console.log('Skipping live Supabase anon test: credentials not configured in local environment');
      return;
    }

    const { data: people, error: pErr } = await supabase.from('people').select('id, canonical_name').limit(5);
    assert.ifError(pErr);
    assert.ok(Array.isArray(people) && people.length > 0, 'Must read people as anon');

    const { data: orgs, error: oErr } = await supabase.from('organizations').select('id, display_name').limit(5);
    assert.ifError(oErr);
    assert.ok(Array.isArray(orgs) && orgs.length > 0, 'Must read organizations as anon');

    const { data: don, error: dErr } = await supabase.from('donations').select('id, amount').limit(5);
    assert.ifError(dErr);
    assert.ok(Array.isArray(don) && don.length > 0, 'Must read donations as anon');

    const { data: src, error: sErr } = await supabase.from('sources').select('id, title').limit(5);
    assert.ifError(sErr);
    assert.ok(Array.isArray(src) && src.length > 0, 'Must read sources as anon');

    const { data: ws, error: wErr } = await supabase.from('wealth_snapshots').select('id, net_worth').limit(5);
    assert.ifError(wErr);
    assert.ok(Array.isArray(ws) && ws.length > 0, 'Must read wealth_snapshots as anon');
  });

  // 3. Anonymous Read Access to security_invoker Views
  test('3. Anonymous role can read all 4 security_invoker views without security definer bypass', async () => {
    if (!isConfigured || !supabase) {
      return;
    }

    const { data: vDon, error: vdErr } = await supabase
      .from('v_donations_with_parity')
      .select('id, amount, historical_net_worth, wealth_snapshot_quality')
      .limit(5);
    assert.ifError(vdErr);
    assert.ok(Array.isArray(vDon) && vDon.length > 0, 'v_donations_with_parity readable by anon');

    const { data: vSum, error: vsErr } = await supabase
      .from('v_person_giving_summary')
      .select('person_id, canonical_name, total_personal_giving, peak_historical_percentage')
      .limit(5);
    assert.ifError(vsErr);
    assert.ok(Array.isArray(vSum) && vSum.length > 0, 'v_person_giving_summary readable by anon');

    const { data: vRank, error: vrErr } = await supabase
      .from('v_person_rankings')
      .select('person_id, canonical_name, rank_by_personal_giving, rank_by_peak_percentage')
      .limit(5);
    assert.ifError(vrErr);
    assert.ok(Array.isArray(vRank) && vRank.length > 0, 'v_person_rankings readable by anon');

    const { data: vDash, error: dmErr } = await supabase
      .from('v_advanced_dashboard_metrics')
      .select('*')
      .limit(1);
    assert.ifError(dmErr);
    assert.ok(Array.isArray(vDash) && vDash.length > 0, 'v_advanced_dashboard_metrics readable by anon');
  });

  // 4. Anonymous Writes Are Blocked
  test('4. Anonymous mutations (INSERT, UPDATE, DELETE) are rejected on public tables', async () => {
    if (!isConfigured || !supabase) {
      return;
    }

    // Try inserting into people
    const { error: insErr } = await supabase
      .from('people')
      .insert({ canonical_name: 'Unauthorized Insertion Test' });
    assert.ok(insErr, 'Anonymous INSERT into people must fail');

    // Try updating people
    const { error: updErr } = await supabase
      .from('people')
      .update({ canonical_name: 'Malicious Update' })
      .eq('id', 'b0000000-0000-0000-0000-000000000001');
    assert.ok(updErr, 'Anonymous UPDATE on people must fail');

    // Try deleting from people
    const { error: delErr } = await supabase
      .from('people')
      .delete()
      .eq('id', 'b0000000-0000-0000-0000-000000000001');
    assert.ok(delErr, 'Anonymous DELETE from people must fail');

    // Try inserting into donations
    const { error: donInsErr } = await supabase
      .from('donations')
      .insert({ amount: 999999, donation_date: '2024-01-01', funding_source_type: 'PERSONAL_DIRECT' });
    assert.ok(donInsErr, 'Anonymous INSERT into donations must fail');

    // Try inserting into wealth_snapshots
    const { error: wsInsErr } = await supabase
      .from('wealth_snapshots')
      .insert({ person_id: 'b0000000-0000-0000-0000-000000000001', snapshot_date: '2024-01-01', net_worth: 1000 });
    assert.ok(wsInsErr, 'Anonymous INSERT into wealth_snapshots must fail');
  });

  // 5. Maintenance Functions Blocked from Public Execution
  test('5. Maintenance and test functions cannot be executed by anon or authenticated roles', async () => {
    if (!isConfigured || !supabase) {
      return;
    }

    const { error: rlsErr } = await supabase.rpc('rls_auto_enable');
    assert.ok(rlsErr, 'Execution of rls_auto_enable must fail for anon');

    const { error: cleanErr } = await supabase.rpc('fn_clean_tables');
    assert.ok(cleanErr, 'Execution of fn_clean_tables must fail for anon');

    const { error: tc1Err } = await supabase.rpc('test_cleanup');
    assert.ok(tc1Err, 'Execution of test_cleanup must fail for anon');

    const { error: tc2Err } = await supabase.rpc('test_cleanup2');
    assert.ok(tc2Err, 'Execution of test_cleanup2 must fail for anon');
  });

  // 6. Legitimate Read Functions Work for Anonymous Users
  test('6. Legitimate read-only RPC functions are executable by anonymous users', async () => {
    if (!isConfigured || !supabase) {
      return;
    }

    const { data: nw, error: nwErr } = await supabase.rpc('get_closest_net_worth', {
      p_person_id: 'b0000000-0000-0000-0000-000000000001',
      p_target_date: '2024-06-01'
    });
    assert.ifError(nwErr);
    assert.ok(Number(nw) > 0, 'Must return positive historical net worth');

    const { data: details, error: detErr } = await supabase.rpc('get_historical_snapshot_details', {
      p_person_id: 'b0000000-0000-0000-0000-000000000001',
      p_target_date: '2024-06-01'
    });
    assert.ifError(detErr);
    assert.ok(Array.isArray(details) && details.length > 0);
    assert.notEqual(details[0].quality, 'UNAVAILABLE');
  });

  // 7. Normal Application Data-Access Layer Reads Successfully
  test('7. Application data-access layer loads real Supabase records cleanly', async () => {
    const peopleResult = await getPeople({ limit: 10 });
    assert.ok(peopleResult && peopleResult.people.length > 0);

    const donationsResult = await getDonations({ limit: 10 });
    assert.ok(donationsResult && donationsResult.donations.length > 0);

    const metrics = await getDashboardMetrics();
    assert.ok(metrics && metrics.documentedMetrics && metrics.documentedMetrics.trackedBillionairesCount >= 20);

    const rankings = await getRankings({ metric: 'peak_percentage', limit: 10 });
    assert.ok(rankings && rankings.rankings.length > 0);

    // Verify Carnegie historical data in data access layer
    const carnegie = peopleResult.people.find(p => p.canonical_name.includes('Carnegie'));
    if (carnegie) {
      const wh = await getWealthHistory(carnegie.person_id);
      assert.ok(wh && wh.snapshots.length > 0);
      const snap1901 = wh.snapshots.find(s => s.snapshot_date.startsWith('1901'));
      assert.ok(snap1901, 'Must have 1901 snapshot');
      assert.equal(snap1901.net_worth, 350000000, 'Carnegie wealth must be nominal $350M');
    }
  });
});

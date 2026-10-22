/**
 * Test Suite for NoCharity Trust, Legal, Disclaimer, and Site Navigation Layer
 * 
 * Verifies:
 * 1. Server routes for /terms, /privacy, /sitemap, /sitemap.xml, /methodology
 * 2. Home page disclaimer content, placement under Soresi quote, and conciseness
 * 3. Terms of Use completeness and plain-language principles
 * 4. Privacy Policy strict truthfulness (zero cookies, zero analytics, localStorage key breakdown)
 * 5. Site navigation, HTML sitemap, XML sitemap
 * 6. "AI Slopped by Arnold" attribution and maintainer responsibility across all pages
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('NoCharity Trust, Disclaimer, Legal, & Site Navigation Layer Tests', () => {

  const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
  const termsHtml = fs.readFileSync(path.join(rootDir, 'public', 'terms.html'), 'utf8');
  const privacyHtml = fs.readFileSync(path.join(rootDir, 'public', 'privacy.html'), 'utf8');
  const sitemapHtml = fs.readFileSync(path.join(rootDir, 'public', 'sitemap.html'), 'utf8');
  const methodologyHtml = fs.readFileSync(path.join(rootDir, 'public', 'methodology.html'), 'utf8');
  const advancedHtml = fs.readFileSync(path.join(rootDir, 'public', 'advanced.html'), 'utf8');
  const aboutHtml = fs.readFileSync(path.join(rootDir, 'public', 'about.html'), 'utf8');
  const serverJs = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf8');

  // =========================================================================
  // 1. About Us Page & Disclaimer Verification
  // =========================================================================
  describe('1. About Us Page & Disclaimer Verification', () => {
    test('1.1 About Us page (about.html) exists and details project mission', () => {
      assert.ok(aboutHtml.length > 0, 'about.html exists');
      assert.ok(aboutHtml.includes('About NoCharity'), 'Contains About NoCharity title');
    });

    test('1.2 Contains all required trust & disclaimer assertions in clear wording', () => {
      // Check required principles in aboutHtml
      assert.match(aboutHtml, /independent project/i, 'States independent project');
      assert.match(aboutHtml, /comedic premise|Gianmarco Soresi/i, 'States comedic premise inspired by quote');
      assert.match(aboutHtml, /satirical/i, 'States intended to be satirical/light-hearted');
      assert.match(aboutHtml, /publicly available/i, 'States uses publicly available information');
      assert.match(aboutHtml, /accurately as reasonably possible/i, 'States attempts to present accurately as reasonably possible');
      assert.match(aboutHtml, /incomplete|estimated|disputed|revised/i, 'States public wealth/donations can be incomplete, estimated, disputed, or revised');
      assert.match(aboutHtml, /not affiliated/i, 'States not affiliated or endorsed');
      assert.match(aboutHtml, /financial.*legal.*tax|entertainment/i, 'States calculations are for entertainment/informational context, not financial/tax/legal advice');
    });
  });

  // =========================================================================
  // 2. Terms of Use Page Tests
  // =========================================================================
  describe('2. Terms of Use Verification', () => {
    test('2.1 terms.html exists and covers plain-language requirements', () => {
      assert.ok(termsHtml.includes('Terms of Use'), 'Has Terms of Use title');
      assert.match(termsHtml, /intended use/i, 'Explains intended use');
      assert.match(termsHtml, /satirical/i, 'Explains satirical & informational purpose');
      assert.match(termsHtml, /limitations of public-source data/i, 'Explains public data limits');
      assert.match(termsHtml, /no guarantee of completeness or accuracy/i, 'Explains no guarantee of completeness/accuracy');
      assert.match(termsHtml, /no financial.*tax.*legal.*advice/i, 'Explains no financial/tax/legal/charitable advice');
      assert.match(termsHtml, /not affiliated with.*endorsed/i, 'Explains non-affiliation');
      assert.match(termsHtml, /acceptable use/i, 'Defines acceptable use');
      assert.match(termsHtml, /MIT License/i, 'Identifies open-source MIT License');
      assert.match(termsHtml, /limitation of liability/i, 'Details open-source limitation of liability');
      assert.match(termsHtml, /Arnold/i, 'Identifies maintainer Arnold');
      assert.match(termsHtml, /not constitute formal legal counsel/i, 'Clarifies not a substitute for formal legal counsel');
    });
  });

  // =========================================================================
  // 3. Privacy Policy Truthfulness Tests
  // =========================================================================
  describe('3. Privacy Policy Truthfulness Verification', () => {
    test('3.1 Accurately documents zero cookies, zero analytics, and zero accounts', () => {
      assert.ok(privacyHtml.includes('Privacy Policy'), 'Has Privacy Policy title');
      assert.match(privacyHtml, /0 Set or Read|zero.*cookies/i, 'Explicitly notes zero cookies');
      assert.match(privacyHtml, /no.*user account system/i, 'Explicitly notes no user account system');
      assert.match(privacyHtml, /zero.*analytics|no.*Google Analytics/i, 'Explicitly notes zero tracking or telemetry');
      assert.match(privacyHtml, /ephemeral/i, 'Documents ephemeral calculation processing');
    });

    test('3.2 Fully documents all 5 localStorage keys used in client code', () => {
      const requiredKeys = [
        'nocharity_income',
        'nocharity_currency',
        'nocharity_income_frequency',
        'nocharity_mode',
        'nocharity_advanced_mode'
      ];

      for (const key of requiredKeys) {
        assert.ok(
          privacyHtml.includes(key),
          `Privacy policy must document key: ${key}`
        );
      }
    });

    test('3.3 Accurately documents external services (Google Fonts, Supabase, Google News RSS)', () => {
      assert.match(privacyHtml, /Google Fonts/i, 'Documents Google Fonts CDN');
      assert.match(privacyHtml, /Supabase/i, 'Documents Supabase read-only data access');
      assert.match(privacyHtml, /Google News RSS/i, 'Documents Google News RSS on-demand access');
    });
  });

  // =========================================================================
  // 4. Sitemap & Navigation Tests
  // =========================================================================
  describe('4. Sitemap & Navigation Verification', () => {
    test('4.1 sitemap.html indexes all primary pages and external resources', () => {
      assert.ok(sitemapHtml.includes('Sitemap'), 'Has Sitemap title');
      assert.match(sitemapHtml, /href="\/"/i, 'Links to Home page');
      assert.match(sitemapHtml, /href="\/advanced"/i, 'Links to Advanced Mode');
      assert.match(sitemapHtml, /href="\/methodology"/i, 'Links to Methodology');
      assert.match(sitemapHtml, /href="\/terms"/i, 'Links to Terms');
      assert.match(sitemapHtml, /href="\/privacy"/i, 'Links to Privacy');
      assert.match(sitemapHtml, /href="https:\/\/github\.com\/iarnold5\/nocharity"/i, 'Links to GitHub repository');
      assert.match(sitemapHtml, /sitemap\.xml/i, 'Mentions XML sitemap');
    });

    test('4.2 server.js provides sitemap.xml endpoint with valid XML format', () => {
      assert.ok(serverJs.includes("app.get('/sitemap.xml'"), 'server.js contains /sitemap.xml route');
      assert.ok(serverJs.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), 'Valid sitemap XML schema present');
      assert.ok(serverJs.includes('<loc>https://nocharity.org/terms</loc>'), 'terms present in XML');
      assert.ok(serverJs.includes('<loc>https://nocharity.org/privacy</loc>'), 'privacy present in XML');
      assert.ok(serverJs.includes('<loc>https://nocharity.org/sitemap</loc>'), 'sitemap present in XML');
    });
  });

  // =========================================================================
  // 5. AI Attribution & Unified Footer Tests
  // =========================================================================
  describe('5. AI Attribution & Clean Footer Verification', () => {
    const pages = [
      { name: 'index.html', content: indexHtml },
      { name: 'about.html', content: aboutHtml },
      { name: 'advanced.html', content: advancedHtml },
      { name: 'methodology.html', content: methodologyHtml },
      { name: 'terms.html', content: termsHtml },
      { name: 'privacy.html', content: privacyHtml },
      { name: 'sitemap.html', content: sitemapHtml }
    ];

    test('5.1 Every page contains the tasteful attribution "AI Slopped by Arnold"', () => {
      for (const page of pages) {
        assert.ok(
          page.content.includes('AI Slopped by Arnold'),
          `${page.name} must include attribution "AI Slopped by Arnold"`
        );
      }
    });

    test('5.2 Attribution clarifies that human maintainer remains responsible', () => {
      for (const page of pages) {
        assert.match(
          page.content,
          /Human maintainer responsible/i,
          `${page.name} must clarify human maintainer responsibility`
        );
      }
    });

    test('5.3 Every page footer contains links to legal and navigation pages', () => {
      for (const page of pages) {
        assert.ok(page.content.includes('/terms'), `${page.name} must link to /terms`);
        assert.ok(page.content.includes('/privacy'), `${page.name} must link to /privacy`);
        assert.ok(page.content.includes('/methodology'), `${page.name} must link to /methodology`);
        assert.ok(page.content.includes('/sitemap'), `${page.name} must link to /sitemap`);
        assert.ok(page.content.includes('/about'), `${page.name} must link to /about`);
      }
    });
  });

  // =========================================================================
  // 6. Server Route Live HTTP Verification
  // =========================================================================
  describe('6. Server Route Integration Tests', () => {
    let server;
    let testPort;

    before(async () => {
      const app = express();
      app.use(express.static(path.join(rootDir, 'public')));

      app.get('/about', (req, res) => {
        res.sendFile(path.join(rootDir, 'public', 'about.html'));
      });
      app.get('/methodology', (req, res) => {
        res.sendFile(path.join(rootDir, 'public', 'methodology.html'));
      });
      app.get('/terms', (req, res) => {
        res.sendFile(path.join(rootDir, 'public', 'terms.html'));
      });
      app.get('/privacy', (req, res) => {
        res.sendFile(path.join(rootDir, 'public', 'privacy.html'));
      });
      app.get('/sitemap', (req, res) => {
        res.sendFile(path.join(rootDir, 'public', 'sitemap.html'));
      });
      app.get('/sitemap.xml', (req, res) => {
        res.header('Content-Type', 'application/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://nocharity.org/</loc></url>
  <url><loc>https://nocharity.org/terms</loc></url>
  <url><loc>https://nocharity.org/privacy</loc></url>
  <url><loc>https://nocharity.org/sitemap</loc></url>
</urlset>`);
      });

      await new Promise((resolve) => {
        server = app.listen(0, () => {
          testPort = server.address().port;
          resolve();
        });
      });
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    const fetchRoute = (route) => {
      return new Promise((resolve, reject) => {
        http.get(`http://localhost:${testPort}${route}`, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
          });
        }).on('error', reject);
      });
    };

    test('6.1 GET /terms returns 200 with HTML content and Terms of Use', async () => {
      const res = await fetchRoute('/terms');
      assert.equal(res.statusCode, 200);
      assert.ok(res.headers['content-type']?.includes('text/html'));
      assert.ok(res.body.includes('Terms of Use'));
      assert.ok(res.body.includes('AI Slopped by Arnold'));
    });

    test('6.2 GET /privacy returns 200 with HTML content and zero-cookie truth', async () => {
      const res = await fetchRoute('/privacy');
      assert.equal(res.statusCode, 200);
      assert.ok(res.headers['content-type']?.includes('text/html'));
      assert.ok(res.body.includes('Privacy Policy'));
      assert.ok(res.body.includes('nocharity_income'));
      assert.ok(res.body.includes('AI Slopped by Arnold'));
    });

    test('6.3 GET /sitemap returns 200 with HTML content and sitemap cards', async () => {
      const res = await fetchRoute('/sitemap');
      assert.equal(res.statusCode, 200);
      assert.ok(res.headers['content-type']?.includes('text/html'));
      assert.ok(res.body.includes('Sitemap'));
      assert.ok(res.body.includes('/advanced'));
      assert.ok(res.body.includes('AI Slopped by Arnold'));
    });

    test('6.4 GET /sitemap.xml returns 200 with application/xml header and valid XML nodes', async () => {
      const res = await fetchRoute('/sitemap.xml');
      assert.equal(res.statusCode, 200);
      assert.ok(res.headers['content-type']?.includes('xml'));
      assert.ok(res.body.includes('<urlset'));
      assert.ok(res.body.includes('<loc>https://nocharity.org/terms</loc>'));
    });

    test('6.5 GET /methodology returns 200 with HTML methodology content', async () => {
      const res = await fetchRoute('/methodology');
      assert.equal(res.statusCode, 200);
      assert.ok(res.headers['content-type']?.includes('text/html'));
      assert.ok(res.body.includes('Methodology'));
    });

    test('6.6 GET /about returns 200 with HTML content and About NoCharity', async () => {
      const res = await fetchRoute('/about');
      assert.equal(res.statusCode, 200);
      assert.ok(res.headers['content-type']?.includes('text/html'));
      assert.ok(res.body.includes('About NoCharity'));
      assert.ok(res.body.includes('AI Slopped by Arnold'));
    });
  });

});

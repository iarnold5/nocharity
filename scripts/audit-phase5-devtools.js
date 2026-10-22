/**
 * Phase 5 Comprehensive Chrome DevTools Interactive Audit Script
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\iarno\\.gemini\\antigravity-ide\\brain\\ea65b322-f84c-4832-a93b-6a41449364a4';

function extractJson(text) {
  if (!text) return null;
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) {
    try { return JSON.parse(match[1]); } catch (e) { return null; }
  }
  try { return JSON.parse(text); } catch { return text; }
}

async function main() {
  console.log('====================================================');
  console.log('   NOCHARITY PHASE 5 STRICT COMPLETION AUDIT       ');
  console.log('====================================================\n');

  const transport = new StdioClientTransport({
    command: 'cmd.exe',
    args: ['/c', 'npx', '-y', 'chrome-devtools-mcp@latest', '--channel=stable']
  });

  const client = new Client({ name: 'nocharity-audit-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  console.log('✓ Connected to Chrome DevTools MCP via stdio.\n');

  const call = async (name, args) => client.callTool({ name, arguments: args });

  const evalScript = async (pageId, fnStr) => {
    const res = await call('evaluate_script', { pageId: Number(pageId), function: fnStr });
    const text = res.content?.[0]?.text;
    return extractJson(text);
  };

  // Open Home Page
  console.log('--- 1. AUDITING BASIC MODE (DESKTOP: 1280x800) ---');
  await call('new_page', { url: 'http://localhost:3000' });
  const pagesList = await call('list_pages', {});
  const pageMatch = pagesList.content[0]?.text?.match(/(\d+): .*?NoCharity/);
  const pageId = pageMatch ? parseInt(pageMatch[1], 10) : 2;
  await call('select_page', { pageId });
  await call('resize_page', { pageId, width: 1280, height: 800 });
  await call('wait_for', { pageId, timeout: 1500 });

  // Audit 1.1: Core copy & 10-second comprehension
  const basicInfo = await evalScript(pageId, `() => {
    return {
      title: document.title,
      brandTitle: document.querySelector('.brand-title')?.textContent?.trim(),
      tagline: document.querySelector('.app-header p')?.textContent?.trim(),
      soresiQuotePresent: Boolean(document.querySelector('.soresi-credit-banner')),
      disclaimerPresent: Boolean(document.querySelector('.home-disclaimer-card')),
      disclaimerText: document.querySelector('.home-disclaimer-card .disclaimer-text')?.textContent?.trim(),
      heroAmount: document.getElementById('matchHeroAmount')?.textContent?.trim(),
      targetQuote: document.getElementById('matchTargetQuote')?.textContent?.trim(),
      satiricalLead: document.getElementById('satiricalLeadText')?.textContent?.trim(),
      tangibleText: document.getElementById('tangibleText')?.textContent?.trim(),
      currentBillionaireCounter: document.getElementById('carouselCounter')?.textContent?.trim(),
      footerAiAttribution: document.querySelector('.badge-slopped')?.textContent?.trim(),
      footerLinksCount: document.querySelectorAll('.footer-nav-row a').length
    };
  }`);
  console.log('Basic Mode Page Elements:');
  console.log('  Tagline:', basicInfo?.tagline);
  console.log('  Satirical Lead:', basicInfo?.satiricalLead);
  console.log('  Hero Amount:', basicInfo?.heroAmount);
  console.log('  Tangible Match:', basicInfo?.tangibleText);
  console.log('  Soresi Quote Present:', basicInfo?.soresiQuotePresent);
  console.log('  Disclaimer Present:', basicInfo?.disclaimerPresent);
  console.log('  AI Disclosure:', basicInfo?.footerAiAttribution);
  console.log('  Footer Nav Links:', basicInfo?.footerLinksCount);

  // Take Desktop Basic Screenshot
  await call('take_screenshot', {
    pageId,
    filePath: path.join(ARTIFACTS_DIR, 'audit_desktop_basic.png'),
    fullPage: false
  });

  // Audit 1.2: Interactive switching of billionaires
  console.log('\n--- Interacting with Carousel ---');
  await evalScript(pageId, `() => document.getElementById('nextBillionaireBtn')?.click()`);
  await call('wait_for', { pageId, timeout: 600 });
  const afterNext = await evalScript(pageId, `() => {
    return {
      counter: document.getElementById('carouselCounter')?.textContent?.trim(),
      quote: document.getElementById('matchTargetQuote')?.textContent?.trim(),
      hero: document.getElementById('matchHeroAmount')?.textContent?.trim()
    };
  }`);
  console.log('  After Next Billionaire:', afterNext?.counter, '-> Hero:', afterNext?.hero);

  // Audit 1.3: Timeframe filter interaction
  console.log('\n--- Interacting with Timeframe Filter ---');
  await evalScript(pageId, `() => {
    const btn = document.querySelector('button[data-timeframe="past_year"]');
    if (btn) btn.click();
  }`);
  await call('wait_for', { pageId, timeout: 600 });
  const afterTimeframe = await evalScript(pageId, `() => {
    return {
      activeTimeframe: document.querySelector('.time-btn.active')?.textContent?.trim(),
      quote: document.getElementById('matchTargetQuote')?.textContent?.trim(),
      hero: document.getElementById('matchHeroAmount')?.textContent?.trim()
    };
  }`);
  console.log('  Active Timeframe:', afterTimeframe?.activeTimeframe, '-> Quote:', afterTimeframe?.quote);

  // Audit 1.4: Settings modal flow
  console.log('\n--- Testing Settings Modal Flow ---');
  await evalScript(pageId, `() => document.getElementById('openSettingsBtn')?.click()`);
  await call('wait_for', { pageId, timeout: 500 });
  const settingsModalState = await evalScript(pageId, `() => {
    const modal = document.getElementById('settingsModal');
    return {
      isActive: modal?.classList.contains('active'),
      currencyVal: document.getElementById('settingsCurrencySelect')?.value,
      incomeVal: document.getElementById('settingsIncomeInput')?.value,
      calcModeMonthlyChecked: document.getElementById('calcModeMonthly')?.checked,
      advancedTogglePresent: Boolean(document.getElementById('settingsAdvancedModeToggle'))
    };
  }`);
  console.log('  Settings Modal Opened:', settingsModalState?.isActive);
  console.log('  Current Income:', settingsModalState?.currencyVal, settingsModalState?.incomeVal);

  // Change currency to $ and income to 6000 and save
  await evalScript(pageId, `() => {
    const curSelect = document.getElementById('settingsCurrencySelect');
    if (curSelect) { curSelect.value = '$'; curSelect.dispatchEvent(new Event('change')); }
    const incInput = document.getElementById('settingsIncomeInput');
    if (incInput) { incInput.value = '6000'; incInput.dispatchEvent(new Event('input')); }
    document.getElementById('btnSaveSettings')?.click();
  }`);
  await call('wait_for', { pageId, timeout: 600 });
  const afterSettingsSave = await evalScript(pageId, `() => {
    return {
      hero: document.getElementById('matchHeroAmount')?.textContent?.trim(),
      headerLabel: document.getElementById('headerSettingsLabel')?.textContent?.trim()
    };
  }`);
  console.log('  After Changing to $6,000/mo:', afterSettingsSave?.headerLabel, '-> Hero:', afterSettingsSave?.hero);

  // Audit 2: Mobile Viewport (390x844)
  console.log('\n--- 2. AUDITING MOBILE VIEWPORT (390x844) ---');
  await call('resize_page', { pageId, width: 390, height: 844 });
  await call('wait_for', { pageId, timeout: 800 });
  const mobileMetrics = await evalScript(pageId, `() => {
    const docW = document.documentElement.scrollWidth;
    const winW = window.innerWidth;
    return {
      docWidth: docW,
      winWidth: winW,
      hasOverflow: docW > winW
    };
  }`);
  console.log('  Mobile ScrollWidth:', mobileMetrics?.docWidth, 'vs ViewportWidth:', mobileMetrics?.winWidth);
  console.log('  Horizontal Overflow?:', mobileMetrics?.hasOverflow);
  await call('take_screenshot', {
    pageId,
    filePath: path.join(ARTIFACTS_DIR, 'audit_mobile_basic.png'),
    fullPage: false
  });

  // Audit 3: Advanced Mode
  console.log('\n--- 3. AUDITING ADVANCED MODE (/advanced) ---');
  await call('resize_page', { pageId, width: 1280, height: 900 });
  await call('navigate_page', { pageId, url: 'http://localhost:3000/advanced' });
  await call('wait_for', { pageId, timeout: 2500 });

  const advInit = await evalScript(pageId, `() => {
    return {
      activeTab: document.querySelector('.nav-tab-item.active')?.dataset?.tab,
      heroHeadline: document.getElementById('calcHeroHeadlineAmount')?.textContent?.trim(),
      heroReaction: document.getElementById('calcHeroReaction')?.textContent?.trim(),
      heroWealth: document.getElementById('calcHeroWealthStatement')?.textContent?.trim(),
      heroRatio: document.getElementById('calcHeroRatio')?.textContent?.trim(),
      userEquivalent: document.getElementById('calcHeroEquivalent')?.textContent?.trim(),
      paycheckInterpretation: document.getElementById('calcIncomeInterpretationText')?.textContent?.trim(),
      satireCallout: document.getElementById('calcHeroSatireBox')?.textContent?.trim(),
      accordionsCount: document.querySelectorAll('.receipt-accordion').length,
      qualityScoreText: document.getElementById('calcQualityScorePill')?.textContent?.trim()
    };
  }`);
  console.log('  Advanced Mode Initial State:');
  console.log('    Active Default Tab:', advInit?.activeTab);
  console.log('    Donation Headline:', advInit?.heroHeadline);
  console.log('    Satirical Reaction:', advInit?.heroReaction);
  console.log('    Wealth at Donation:', advInit?.heroWealth);
  console.log('    Wealth Ratio:', advInit?.heroRatio);
  console.log('    User Equivalent:', advInit?.userEquivalent);
  console.log('    Paycheck Context:', advInit?.paycheckInterpretation);
  console.log('    Receipts Accordions Count:', advInit?.accordionsCount);
  console.log('    Quality Score Pill:', advInit?.qualityScoreText);

  // Interact with Advanced Mode: Change selection
  console.log('\n--- Testing Advanced Mode Dropdown Selection ---');
  const billionaireSelectResult = await evalScript(pageId, `() => {
    const bSelect = document.getElementById('calcBillionaireSelect');
    if (!bSelect) return { error: 'calcBillionaireSelect not found' };
    const len = bSelect.options.length;
    if (len > 1) {
      bSelect.selectedIndex = 1;
      bSelect.dispatchEvent(new Event('change'));
      return { len, selectedName: bSelect.options[1].text, val: bSelect.options[1].value };
    }
    return { len, selectedName: null, optionsHtml: bSelect.innerHTML };
  }`);
  console.log('  Billionaire select debug:', billionaireSelectResult);
  await call('wait_for', { pageId, timeout: 800 });

  const afterBillionaireChange = await evalScript(pageId, `() => {
    return {
      headline: document.getElementById('calcHeroHeadlineAmount')?.textContent?.trim(),
      wealth: document.getElementById('calcHeroWealthStatement')?.textContent?.trim(),
      ratio: document.getElementById('calcHeroRatio')?.textContent?.trim(),
      userEquiv: document.getElementById('calcHeroEquivalent')?.textContent?.trim()
    };
  }`);
  console.log('  Recalculated Advanced Result:');
  console.log('    Headline:', afterBillionaireChange?.headline);
  console.log('    Wealth Statement:', afterBillionaireChange?.wealth);
  console.log('    Ratio:', afterBillionaireChange?.ratio);
  console.log('    User Equivalent:', afterBillionaireChange?.userEquiv);

  // Expand Progressive Disclosure Accordions
  console.log('\n--- Testing Progressive Disclosure Accordions ---');
  await evalScript(pageId, `() => {
    document.querySelectorAll('.receipt-accordion').forEach(a => a.open = true);
  }`);
  await call('wait_for', { pageId, timeout: 500 });
  const accordionsContent = await evalScript(pageId, `() => {
    return {
      formulaStep1: document.getElementById('calcReceiptRatioFormula')?.textContent?.trim(),
      formulaStep2: document.getElementById('calcReceiptEquivFormula')?.textContent?.trim(),
      historicalWealthVal: document.getElementById('receiptValWealth')?.textContent?.trim(),
      wealthBadge: document.getElementById('badgeWealthProximity')?.textContent?.trim(),
      recipient: document.getElementById('calcReceiptRecipient')?.textContent?.trim(),
      sourcesCount: document.querySelectorAll('#calcReceiptSourcesContainer .source-evidence-card')?.length,
      qualityScoreText: document.getElementById('calcQualityScorePill')?.textContent?.trim(),
      checklistItems: document.querySelectorAll('#calcReceiptQualityChecklist .quality-check-item').length
    };
  }`);
  console.log('  Accordion 1 (Math Formula):', accordionsContent?.formulaStep1, '|', accordionsContent?.formulaStep2);
  console.log('  Accordion 2 (Historical Wealth):', accordionsContent?.historicalWealthVal, `(${accordionsContent?.wealthBadge})`);
  console.log('  Accordion 3 (Donation Details): Recipient =', accordionsContent?.recipient);
  console.log('  Accordion 4 (Citations): Source cards count =', accordionsContent?.sourcesCount);
  console.log('  Accordion 5 (Quality Audit): Score =', accordionsContent?.qualityScoreText, '| Checklist items =', accordionsContent?.checklistItems);

  await call('take_screenshot', {
    pageId,
    filePath: path.join(ARTIFACTS_DIR, 'audit_desktop_advanced.png'),
    fullPage: false
  });

  // Audit Tab Navigation in Advanced Mode
  console.log('\n--- Testing Advanced Mode Tab Switching ---');
  for (const tabName of ['donations', 'billionaires', 'rankings', 'dashboard', 'methodology']) {
    await evalScript(pageId, `() => {
      const btn = document.querySelector('button[data-tab="${tabName}"]');
      if (btn) btn.click();
    }`);
    await call('wait_for', { pageId, timeout: 500 });
    const tabActive = await evalScript(pageId, `() => {
      const activeSection = document.querySelector('.view-section.active');
      return { tab: "${tabName}", activeSectionId: activeSection?.id };
    }`);
    console.log(`  Tab [${tabName}] -> Active View Section:`, tabActive?.activeSectionId);
  }

  // Audit 4: Legal & Policy Pages
  console.log('\n--- 4. AUDITING LEGAL, POLICY & SITEMAP PAGES ---');
  for (const pagePath of ['/terms', '/privacy', '/methodology', '/sitemap']) {
    await call('navigate_page', { pageId, url: `http://localhost:3000${pagePath}` });
    await call('wait_for', { pageId, timeout: 800 });
    const pageCheck = await evalScript(pageId, `() => {
      return {
        path: window.location.pathname,
        title: document.title,
        h1: document.querySelector('h1')?.textContent?.trim(),
        hasFooter: Boolean(document.querySelector('footer')),
        hasAttribution: document.body.textContent.includes('AI Slopped by Arnold')
      };
    }`);
    console.log(`  Page [${pageCheck?.path}]: H1="${pageCheck?.h1}", Footer=${pageCheck?.hasFooter}, Attribution=${pageCheck?.hasAttribution}`);
  }

  // Check Console Messages across session
  console.log('\n--- 5. CHECKING BROWSER CONSOLE LOGS & ERRORS ---');
  const consoleMessages = await call('list_console_messages', { pageId: Number(pageId) });
  console.log(consoleMessages.content?.[0]?.text || 'No console messages.');

  console.log('\n====================================================');
  console.log('   CHROME DEVTOOLS AUDIT RUN COMPLETED CLEANLY      ');
  console.log('====================================================\n');

  await client.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});

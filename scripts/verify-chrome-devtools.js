import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import fs from 'node:fs';

const ARTIFACTS_DIR = 'C:\\Users\\iarno\\.gemini\\antigravity-ide\\brain\\ea65b322-f84c-4832-a93b-6a41449364a4';

async function main() {
  console.log('=== Step 1: Connecting to Chrome DevTools MCP ===');
  const transport = new StdioClientTransport({
    command: 'npx.cmd',
    args: [
      '-y',
      'chrome-devtools-mcp@latest',
      '--channel=stable',
      '--no-usage-statistics',
      '--viewport=1280x800'
    ]
  });

  const client = new Client(
    { name: 'nocharity-verifier', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('Connected to Chrome DevTools MCP.');

  // Helper to call tools
  async function call(name, args = {}) {
    const res = await client.callTool({ name, arguments: args });
    return res;
  }

  // --- 1. Home Page Verification ---
  console.log('\n=== Step 2: Navigating to Home Page (http://localhost:3000) ===');
  const openRes = await call('new_page', { url: 'http://localhost:3000' });
  console.log('Home page opened.');

  // List pages to obtain target pageId
  const pagesRes = await call('list_pages');
  console.log('Pages list:', pagesRes.content[0].text);
  
  // Parse page ID
  let pageId = 0;
  const pageMatch = pagesRes.content[0].text.match(/(\d+):.*localhost:3000/);
  if (pageMatch) {
    pageId = parseInt(pageMatch[1], 10);
  }
  console.log('Using target pageId:', pageId);

  // Allow page scripts and fonts to settle
  await call('wait_for', { pageId, timeout: 2500 });

  // Take Desktop Screenshot
  const desktopScreenshotPath = path.join(ARTIFACTS_DIR, 'home_desktop.png');
  console.log('\n=== Step 3: Taking Desktop Screenshot ===');
  await call('take_screenshot', {
    pageId,
    filePath: desktopScreenshotPath,
    fullPage: false
  });
  console.log('Saved desktop screenshot to:', desktopScreenshotPath);

  // Take Accessibility / Page Structure Snapshot
  console.log('\n=== Step 4: Inspecting Page Structure & Accessibility Tree ===');
  const snapshotRes = await call('take_snapshot', { pageId, verbose: false });
  const snapshotText = snapshotRes.content[0]?.text || '';
  console.log('Snapshot snippet (first 1000 chars):');
  console.log(snapshotText.substring(0, 1000));
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'home_a11y_tree.txt'), snapshotText, 'utf8');

  // Check Console Messages
  console.log('\n=== Step 5: Checking Browser Console Messages ===');
  const consoleRes = await call('list_console_messages', { pageId });
  console.log('Console logs:', consoleRes.content[0]?.text || 'None');

  // Check Network Requests
  console.log('\n=== Step 6: Checking Network Requests ===');
  const networkRes = await call('list_network_requests', { pageId });
  const networkText = networkRes.content[0]?.text || '';
  const lines = networkText.split('\n').filter(Boolean);
  console.log(`Recorded ${lines.length} network events. Sample:`);
  console.log(lines.slice(0, 8).join('\n'));

  // --- 2. Interactive Verification on Home Page ---
  console.log('\n=== Step 7: Testing Interaction — Switching Billionaire ===');
  await call('evaluate_script', {
    pageId,
    function: "() => document.getElementById('nextBillionaireBtn')?.click()"
  });
  await call('wait_for', { pageId, timeout: 800 });
  const updatedHero = await call('evaluate_script', {
    pageId,
    function: "() => document.getElementById('matchHeroAmount')?.textContent + ' | ' + document.getElementById('matchTargetQuote')?.textContent"
  });
  console.log('Recalculated output after clicking Next Billionaire:', updatedHero.content[0]?.text);

  // Open Settings Modal
  console.log('\n=== Step 8: Testing Settings Modal ===');
  await call('evaluate_script', {
    pageId,
    function: "() => document.getElementById('openSettingsBtn')?.click()"
  });
  await call('wait_for', { pageId, timeout: 600 });
  
  const settingsModalScreenshotPath = path.join(ARTIFACTS_DIR, 'settings_modal.png');
  await call('take_screenshot', {
    pageId,
    filePath: settingsModalScreenshotPath,
    fullPage: false
  });
  console.log('Saved settings modal screenshot to:', settingsModalScreenshotPath);

  // Close Settings Modal
  await call('evaluate_script', {
    pageId,
    function: "() => document.getElementById('closeSettingsModal')?.click()"
  });
  await call('wait_for', { pageId, timeout: 500 });
  console.log('Settings modal closed.');

  // --- 3. Advanced Mode Verification ---
  console.log('\n=== Step 9: Navigating to Advanced Mode (http://localhost:3000/advanced) ===');
  await call('navigate_page', { pageId, url: 'http://localhost:3000/advanced' });
  await call('wait_for', { pageId, timeout: 2500 });

  const advancedScreenshotPath = path.join(ARTIFACTS_DIR, 'advanced_mode.png');
  await call('take_screenshot', {
    pageId,
    filePath: advancedScreenshotPath,
    fullPage: false
  });
  console.log('Saved Advanced Mode screenshot to:', advancedScreenshotPath);

  // Inspect Advanced Mode console & accessibility
  const advConsoleRes = await call('list_console_messages', { pageId });
  console.log('Advanced Mode console messages:', advConsoleRes.content[0]?.text || 'None');

  const advSnapshotRes = await call('take_snapshot', { pageId, verbose: false });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'advanced_a11y_tree.txt'), advSnapshotRes.content[0]?.text || '', 'utf8');
  console.log('Saved Advanced Mode a11y tree.');

  // Test Tab Switching in Advanced Mode (Click "Donations" tab)
  console.log('\n=== Step 10: Testing Advanced Mode Tab Switching ===');
  const tabClick = await call('evaluate_script', {
    pageId,
    function: `() => {
      const tab = document.querySelector('button[data-tab="donations"]') || document.querySelector('a[href="#donations"]');
      if (tab) { tab.click(); return "Clicked donations tab"; } else { return "Tab not found"; }
    }`
  });
  console.log('Tab switch result:', tabClick.content[0]?.text);
  await call('wait_for', { pageId, timeout: 1000 });

  // --- 4. Mobile Responsiveness Inspection ---
  console.log('\n=== Step 11: Testing Mobile Viewport (390x844) ===');
  await call('resize_page', { pageId, width: 390, height: 844 });
  await call('navigate_page', { pageId, url: 'http://localhost:3000' });
  await call('wait_for', { pageId, timeout: 2000 });

  const mobileScreenshotPath = path.join(ARTIFACTS_DIR, 'home_mobile.png');
  await call('take_screenshot', {
    pageId,
    filePath: mobileScreenshotPath,
    fullPage: false
  });
  console.log('Saved Mobile screenshot to:', mobileScreenshotPath);

  // Check for horizontal overflow on mobile
  const overflowCheck = await call('evaluate_script', {
    pageId,
    function: `() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const elements = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollWidth > winW || el.offsetWidth > winW) {
          elements.push({
            tag: el.tagName,
            id: el.id,
            className: typeof el.className === 'string' ? el.className : '',
            offsetWidth: el.offsetWidth,
            scrollWidth: el.scrollWidth
          });
        }
      });
      return {
        documentWidth: docW,
        viewportWidth: winW,
        hasHorizontalOverflow: docW > winW,
        overflowingElements: elements.slice(0, 10)
      };
    }`
  });
  console.log('Mobile horizontal overflow check:', overflowCheck.content[0]?.text);

  console.log('\n=== Visual Inspection and Verification Completed Successfully! ===');
  await client.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Error during Chrome DevTools verification:', err);
  process.exit(1);
});

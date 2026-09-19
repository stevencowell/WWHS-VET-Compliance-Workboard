'use strict';
// Synthetic records and disposable Chromium contexts only. No user profile or files.
const {chromium} = require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {encode} = require('../assets/js/workboard-storage.js');
const base = process.env.WORKBOARD_TEST_URL || 'http://127.0.0.1:43175';
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) throw Error('Use a disposable local preview.');
const output = path.resolve(__dirname, '../../../outputs/launchpad-storage-quota-browser-report.json');
const INBOX = 'morning-launchpad-summary:v1', VET = 'wwhs-vet-compliance-workboard:v3';
const FILLER = 'synthetic-unrelated-quota-filler';
const json = JSON.stringify;
const report = {pass: false, syntheticOnly: true, results: [], errors: [], externalRequests: []};
const inbox = items => ({version: 2, items, briefing: '', pinWorkflowVersion: 1, workboardImports: [], forecastContexts: {}});
const randomText = length => {
  let seed = 135791113, text = '';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    text += alphabet[(seed >>> 0) % alphabet.length];
  }
  return text;
};
async function waitReady(page) {
  await page.waitForFunction(() => document.querySelector('summary-import')?.started && window.WWHS_STORAGE && window.WWHS_PRIVATE_NOTES_BACKUP && !window.WWHS_PRIVATE_NOTES_BACKUP.state().checking);
}
async function read(page) { return page.evaluate(key => window.WWHS_STORAGE.getItem(key), INBOX); }
async function openImport(page, payload) {
  await page.locator('[aria-label="Private Launchpad backup"] [data-backup-action="import"]').click();
  const dialog = page.getByRole('dialog', {name: 'Import backup', exact: true});
  await dialog.waitFor({state: 'visible'});
  await page.locator('#launchpad-backup-file').setInputFiles({name: 'launchpad-task-backup.json', mimeType: 'application/json', buffer: Buffer.from(json(payload))});
  await dialog.getByRole('button', {name: 'Import backup', exact: true}).click();
  return dialog;
}
async function fillOrigin(page) {
  return page.evaluate(key => {
    let low = 0, high = 8 * 1024 * 1024, quotaFailures = 0;
    while (low < high) {
      const length = Math.ceil((low + high) / 2);
      try { localStorage.setItem(key, 'q'.repeat(length)); low = length; }
      catch (error) { if (error.name !== 'QuotaExceededError') throw error; quotaFailures++; high = length - 1; }
    }
    localStorage.setItem(key, 'q'.repeat(low));
    return {fillerCharacters: low, quotaFailures};
  }, FILLER);
}
async function fillerDigest(page) {
  return page.evaluate(async key => {
    const value = localStorage.getItem(key);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return {length: value.length, sha256: [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')};
  }, FILLER);
}
async function nativeProbe(page, value) {
  return page.evaluate(({key, value}) => {
    const before = localStorage.getItem(key);
    let errorName = null;
    try { localStorage.setItem(key, value); }
    catch (error) { errorName = error.name; }
    if (errorName === null) localStorage.setItem(key, before);
    return {errorName, unchanged: localStorage.getItem(key) === before};
  }, {key: INBOX, value});
}
async function newContext(browser, entries) {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, timezoneId: 'Australia/Sydney', acceptDownloads: true, serviceWorkers: 'block'});
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === base && route.request().method() === 'GET') return route.continue();
    report.externalRequests.push(route.request().url()); return route.abort();
  });
  await context.addInitScript(entries => {
    if (localStorage.getItem('synthetic-fixture-ready') === null) {
      for (const [key, value] of entries) localStorage.setItem(key, value);
      localStorage.setItem('synthetic-fixture-ready', 'yes');
    }
    window.__syntheticBackupWrites = [];
    window.showSaveFilePicker = async () => ({createWritable: async () => ({write: async blob => window.__syntheticBackupWrites.push(await blob.text()), close: async () => { window.__syntheticBackupClosed = true; }})});
  }, entries);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('dialog', dialog => dialog.accept());
  page.on('pageerror', error => report.errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-09-19T01:00:00.000Z'));
  await page.goto(base + '/morning-launchpad/', {waitUntil: 'networkidle'});
  await waitReady(page);
  return {context, page};
}

(async () => {
  const {enrich, validateInbox, mergeInbox} = await import(pathToFileURL(path.resolve(__dirname, '../morning-launchpad/assets/summary-core.mjs')));
  const richHtml = '<p><strong>Keep café 日本語 🐟 e\u0301</strong></p><ul><li>Original rich note</li></ul><p>' + 'Preserve this synthetic paragraph. '.repeat(1600) + '</p>';
  const original = enrich({id: 'quota-existing', taskKey: 'personal:quota-existing', title: 'Synthetic completed task', action: 'Keep my edited action', personal: true, status: 'done', source: 'Keep my source wording', noteText: 'Keep my edited note café 🐟', noteHtml: richHtml, dirty: ['action', 'source', 'noteText', 'noteHtml'], createdOn: '2026-09-18'});
  const incomingOld = enrich({...original, id: 'old-backup-id', status: 'review', action: 'Stale action', source: 'Stale source', noteText: 'Stale text', noteHtml: '<p>Stale HTML</p>', dirty: []});
  const addition = enrich({id: 'quota-addition', taskKey: 'personal:quota-addition', title: 'Synthetic imported reference note', action: '', personal: true, status: 'note', source: 'Synthetic imported source', noteText: 'Imported Unicode: café 日本語 🐟 e\u0301', noteHtml: '<p><em>Imported rich HTML</em></p><p>' + randomText(220000) + '</p>', createdOn: '2026-09-19'});
  const payload = validateInbox(json(inbox([incomingOld, addition])));
  assert.ok(Buffer.byteLength(json(payload)) > 160000, 'use a substantive 160 KB-plus backup');
  const browser = await chromium.launch({headless: true});
  try {
    const legacyVet = json({schemaVersion: 3, role: 'htvet', guidance: true, links: {}, records: {'synthetic-source': {status: 'in-progress', exceptionSummary: 'Synthetic old progress '.repeat(14000)}}, assignments: {}, gaps: {}, eventOccurrences: []});
    const {context, page} = await newContext(browser, [[INBOX, json(inbox([original]))], [VET, legacyVet]]);
    try {
      const initialRaw = await read(page);
      const initial = JSON.parse(initialRaw);
      const merged = {...initial, items: mergeInbox(initial.items, payload.items).items, importedAt: '2026-09-19T01:00:00.000Z'};
      const plainCandidate = json(merged), packedCandidate = encode(INBOX, plainCandidate);
      assert.ok(packedCandidate.length > initialRaw.length, 'incoming entropy makes compression alone insufficient until existing records are compacted');
      const quota = await fillOrigin(page), fillerBefore = await fillerDigest(page);
      assert.ok(quota.fillerCharacters > 1024 * 1024);
      const plainProbe = await nativeProbe(page, plainCandidate), packedProbe = await nativeProbe(page, packedCandidate);
      assert.deepEqual(plainProbe, {errorName: 'QuotaExceededError', unchanged: true});
      assert.deepEqual(packedProbe, {errorName: 'QuotaExceededError', unchanged: true});
      const dialog = await openImport(page, payload);
      await dialog.waitFor({state: 'hidden'});
      const saved = JSON.parse(await read(page));
      const kept = saved.items.find(item => item.taskKey === original.taskKey), imported = saved.items.find(item => item.taskKey === addition.taskKey);
      assert.equal(saved.items.length, 2);
      for (const field of ['id', 'status', 'action', 'source', 'noteText', 'noteHtml']) assert.equal(kept[field], original[field], `existing ${field} remains exact`);
      for (const field of ['source', 'noteText', 'noteHtml']) assert.equal(imported[field], addition[field], `imported ${field} remains exact`);
      assert.deepEqual(await fillerDigest(page), fillerBefore, 'unrelated filler is byte-for-byte unchanged');
      const physical = await page.evaluate(({inbox, vet}) => ({inboxCompressed: localStorage.getItem(inbox).startsWith('WWHS-LZ1:'), vetCompressed: localStorage.getItem(vet).startsWith('WWHS-LZ1:'), vetLogical: window.WWHS_STORAGE.getItem(vet)}), {inbox: INBOX, vet: VET});
      assert.equal(physical.inboxCompressed, true);
      assert.equal(physical.vetCompressed, true, 'quota retry compacted another existing allowlisted record');
      assert.equal(physical.vetLogical, legacyVet);
      await page.locator('[aria-label="Private Launchpad backup"] [data-backup-action="save"]').click();
      await page.waitForFunction(() => window.__syntheticBackupClosed && window.__syntheticBackupWrites.length === 1);
      const backupText = await page.evaluate(() => window.__syntheticBackupWrites[0]);
      assert.ok(backupText.trim().startsWith('{'), 'actual Save backup control exports plain JSON');
      assert.deepEqual(JSON.parse(backupText), saved);
      await page.reload({waitUntil: 'networkidle'}); await waitReady(page);
      assert.deepEqual(JSON.parse(await read(page)), saved);
      await page.getByRole('button', {name: /^My Notes \(/}).click();
      await page.getByRole('textbox', {name: `Edit card text for ${addition.title}`, exact: true}).waitFor({state: 'visible'});
      await page.getByRole('button', {name: /^Done \(/}).click();
      await page.getByRole('textbox', {name: `Edit card text for ${original.title}`, exact: true}).waitFor({state: 'visible'});
      assert.equal(await page.getByRole('textbox', {name: `Edit card text for ${original.title}`, exact: true}).inputValue(), original.action);
      assert.deepEqual(await fillerDigest(page), fillerBefore);
      report.results.push({name: 'Real quota recovers through lossless compaction and UI import', passed: true, backupBytes: Buffer.byteLength(json(payload)), legacyInboxCharacters: initialRaw.length, candidateCompressedCharacters: packedCandidate.length, nativePlainError: plainProbe.errorName, nativePackedError: packedProbe.errorName, existingRichTextAndEditsPreserved: true, unrelatedFillerPreserved: true, plainJsonSave: true, reloadVisible: true});

      const second = await context.newPage();
      second.on('dialog', dialog => dialog.accept());
      await second.goto(base + '/morning-launchpad/', {waitUntil: 'networkidle'}); await waitReady(second);
      const changedRaw = await second.evaluate(key => {
        const saved = JSON.parse(window.WWHS_STORAGE.getItem(key));
        saved.items[0].noteText = 'Newer saved note from a second tab — café 🐟';
        const text = JSON.stringify(saved); window.WWHS_STORAGE.setItem(key, text); return text;
      }, INBOX);
      await page.waitForFunction(() => document.querySelector('summary-import').blocked === true);
      assert.equal(await page.getByRole('button', {name: 'Reload saved work', exact: true}).isVisible(), true);
      const guarded = await openImport(page, payload);
      await guarded.getByRole('alert').filter({hasText: 'changed in another tab'}).waitFor({state: 'visible'});
      assert.equal(await read(page), changedRaw, 'stale tab import must not overwrite another tab');
      await page.keyboard.press('Escape');
      await page.getByRole('button', {name: 'Reload saved work', exact: true}).click();
      await page.waitForFunction(() => document.querySelector('summary-import').blocked === false);
      assert.equal(await page.evaluate(() => document.querySelector('summary-import').inbox.items[0].noteText), 'Newer saved note from a second tab — café 🐟');
      report.results.push({name: 'Compressed cross-tab change preserves conflict/reload guard', passed: true});
      await second.close();
    } finally { await context.close(); }

    const small = enrich({id: 'tiny-kept', taskKey: 'personal:tiny-kept', title: 'Synthetic tiny original task', action: 'Keep this original', personal: true, status: 'done', source: 'Original tiny source', createdOn: '2026-09-19'});
    const full = await newContext(browser, [[INBOX, json(inbox([small]))]]);
    try {
      const before = await read(full.page), quota = await fillOrigin(full.page), fillerBefore = await fillerDigest(full.page);
      const nativeBefore = await full.page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
      const dialog = await openImport(full.page, inbox([addition]));
      await dialog.getByRole('alert').filter({hasText: 'storage is full'}).waitFor({state: 'visible'});
      assert.match(await dialog.getByRole('alert').innerText(), /previous records are kept.*do not clear browser data/i);
      assert.equal(await read(full.page), before);
      assert.deepEqual(await fillerDigest(full.page), fillerBefore);
      const nativeAfter = await full.page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
      assert.deepEqual(nativeAfter, nativeBefore, 'unrecoverably full origin keeps every native value intact');
      await full.page.keyboard.press('Escape');
      await full.page.reload({waitUntil: 'networkidle'}); await waitReady(full.page);
      assert.equal(await read(full.page), before);
      await full.page.getByRole('button', {name: /^Done \(/}).click();
      await full.page.getByRole('textbox', {name: `Edit card text for ${small.title}`, exact: true}).waitFor({state: 'visible'});
      report.results.push({name: 'Truly full unrelated storage fails safely with a clear message', passed: true, fillerCharacters: quota.fillerCharacters, exactSavedValuesPreserved: true, originalVisibleAfterReload: true});
    } finally { await full.context.close(); }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.externalRequests, []);
    report.pass = true;
  } finally {
    await browser.close();
    await fs.writeFile(output, json(report, null, 2) + '\n');
  }
  console.log(`PASS Launchpad real-storage quota: ${report.results.length} scenarios, synthetic disposable Chromium only.`);
  console.log(`Report: ${output}`);
})().catch(error => { console.error(error); process.exitCode = 1; });

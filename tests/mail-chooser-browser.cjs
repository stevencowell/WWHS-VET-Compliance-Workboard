// Disposable browser contexts and synthetic storage only. Never opens a mailbox.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = (process.env.TEST_BASE_URL || 'http://127.0.0.1:43175').replace(/\/$/, '');
const output = process.env.OUTPUT_DIR || path.resolve(__dirname, '../../launchpad-deliverables');
const det = 'https://outlook.cloud.microsoft/mail/';
const gmail = 'https://mail.google.com/mail/u/1/#inbox';
const evernoteDesktop = 'evernote:///';
const evernoteWeb = 'https://www.evernote.com/client/web';

async function storageSnapshot(page) {
  return page.evaluate(() => Object.fromEntries(['localStorage', 'sessionStorage'].map(name => [
    name, Object.fromEntries(Object.keys(window[name]).sort().map(key => [key, window[name].getItem(key)]))
  ])));
}

async function isFocused(locator) {
  return locator.evaluate(node => node === document.activeElement);
}

async function assertClosed(dialog, trigger) {
  assert.equal(await dialog.evaluate(node => node.open), false, 'Dialog closes');
  assert.equal(await isFocused(trigger), true, 'Focus returns to the visible launcher');
}

async function assertFocusContained(page, dialog) {
  for (const key of ['Tab', 'Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true,
      `${key} must keep keyboard focus in the modal`);
  }
}

async function assertLayout(page, dialog, width) {
  const box = await dialog.boundingBox();
  assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1,
    `Dialog fits ${width}px: ${JSON.stringify(box)}`);
  assert.ok(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1), 'Dialog has no horizontal overflow');
  for (const control of await dialog.locator('a,button').all()) {
    const rect = await control.boundingBox();
    assert.ok(rect && rect.x >= box.x && rect.x + rect.width <= box.x + box.width + 1,
      'Choice and Cancel remain inside the dialog');
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    'Page has no horizontal overflow');
}

async function openByKeyboard(page, card, dialog) {
  await card.focus();
  await page.keyboard.press('Enter');
  await dialog.waitFor({state: 'visible'});
  assert.equal(await isFocused(dialog.getByRole('button', {name: 'Cancel', exact: true})), true,
    'Cancel receives initial focus');
}

async function choose(page, dialog, href) {
  const before = await page.evaluate(() => window.__chooserNavigation.length);
  await dialog.locator(`a[href="${href}"]`).click();
  assert.equal(await dialog.evaluate(node => node.open), false, 'Choosing a destination closes the dialog');
  const calls = await page.evaluate(() => window.__chooserNavigation);
  assert.equal(calls.length, before + 1);
  assert.equal(calls.at(-1).href, href, 'The selected link retains its exact destination');
}

(async () => {
  fs.mkdirSync(output, {recursive: true});
  const browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium'});
  try {
    for (const width of [1440, 390, 320]) for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({viewport: {width, height: 900}, colorScheme: theme, serviceWorkers: 'block'});
      const external = [], errors = [];
      await context.route('**/*', route => {
        if (new URL(route.request().url()).origin === new URL(base).origin) return route.continue();
        external.push(route.request().url());
        return route.abort();
      });
      await context.addInitScript(({theme}) => {
        localStorage.setItem('morning-launchpad-theme', theme);
        localStorage.setItem('mail-chooser-synthetic-original', 'Preserve this original test value');
        sessionStorage.setItem('mail-chooser-synthetic-session', 'Preserve this session value');
        window.__chooserNavigation = [];
        // Record navigation intent and cancel browser navigation before any request.
        // Propagation continues, so the real chooser close handlers still execute.
        window.addEventListener('click', event => {
          const anchor = event.target.closest?.('#mail-chooser a,#evernote-chooser a');
          if (!anchor) return;
          event.preventDefault();
          window.__chooserNavigation.push({href: anchor.href, target: anchor.target});
        }, true);
      }, {theme});
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(10000);
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}/morning-launchpad/`);
        await page.waitForFunction(() => document.querySelector('summary-import')?.started &&
          document.querySelector('.destination-card[aria-controls="mail-chooser"]') &&
          (!window.WWHS_PRIVATE_NOTES_BACKUP || !window.WWHS_PRIVATE_NOTES_BACKUP.state().checking));
        const mail = page.getByRole('link', {name: 'Choose where to open Mail', exact: true});
        const dialog = page.locator('#mail-chooser');
        const cancel = dialog.getByRole('button', {name: 'Cancel', exact: true});
        const quickToggle = page.getByRole('button', {name: 'Quick links ↗', exact: true});
        const before = await storageSnapshot(page);
        assert.equal(await mail.getAttribute('href'), det, 'Mail retains its original DET fallback');
        assert.equal(await mail.getAttribute('aria-haspopup'), 'dialog');
        assert.equal(await mail.getAttribute('aria-controls'), 'mail-chooser');
        assert.equal(await dialog.getAttribute('aria-labelledby'), 'mail-choice-title');
        assert.equal(await dialog.getByRole('heading', {name: 'Open Mail', exact: true, includeHidden: true}).count(), 1);
        assert.equal(await dialog.locator('input[type=checkbox],input[type=radio]').count(), 0,
          'Chooser has no persistence preference controls');
        for (const href of [det, gmail]) {
          const link = dialog.locator(`a[href="${href}"]`);
          assert.equal(await link.count(), 1);
          assert.equal(await link.getAttribute('target'), '_blank');
          assert.ok((await link.getAttribute('rel')).split(/\s+/).includes('noopener'));
          assert.ok((await link.getAttribute('rel')).split(/\s+/).includes('noreferrer'));
        }
        const gmailTarget = new URL(await dialog.getByRole('link', {name: 'Gmail', exact: true, includeHidden: true}).getAttribute('href'));
        assert.equal(gmailTarget.origin, 'https://mail.google.com');
        assert.equal(gmailTarget.pathname, '/mail/u/1/', 'Use the exact inbox route Steve verified in his browser session');
        assert.equal(gmailTarget.search, '');
        assert.equal(gmailTarget.hash, '#inbox');

        await openByKeyboard(page, mail, dialog);
        await assertLayout(page, dialog, width);
        await page.screenshot({path: path.join(output, `mail-chooser-${theme}-${width}.png`)});
        await assertFocusContained(page, dialog);
        await page.keyboard.press('Escape');
        await assertClosed(dialog, mail);

        await mail.click();
        await cancel.click();
        await assertClosed(dialog, mail);
        await mail.click();
        const bounds = await dialog.boundingBox();
        await page.mouse.click(bounds.x + 5, bounds.y + 5);
        assert.equal(await dialog.evaluate(node => node.open), true, 'Clicking interior padding does not dismiss');
        await page.mouse.click(5, 5);
        await assertClosed(dialog, mail);
        for (const href of [det, gmail]) {
          await mail.click();
          await choose(page, dialog, href);
          assert.equal(await isFocused(mail), true);
        }

        await quickToggle.click();
        const quickMail = page.locator('#quick-links-panel').getByRole('button', {name: /^Mail/});
        await quickMail.click();
        assert.equal(await dialog.evaluate(node => node.open), true, 'Quick links opens the same Mail dialog');
        assert.equal(await page.locator('#quick-links-panel').isHidden(), true);
        await page.keyboard.press('Escape');
        await assertClosed(dialog, quickToggle);
        await quickToggle.click();
        await quickMail.click();
        await choose(page, dialog, gmail);
        assert.equal(await isFocused(quickToggle), true);

        const evernote = page.getByRole('link', {name: 'Choose how to open Evernote', exact: true});
        const original = page.locator('#evernote-chooser');
        await evernote.click();
        await assertLayout(page, original, width);
        const style = locator => locator.evaluate(node => {
          const css = getComputedStyle(node);
          return Object.fromEntries(['backgroundColor', 'color', 'borderRadius', 'padding'].map(key => [key, css[key]]));
        });
        const originalStyle = await style(original);
        await page.keyboard.press('Escape');
        await assertClosed(original, evernote);
        await mail.click();
        assert.deepEqual(await style(dialog), originalStyle, 'Mail reuses the Evernote chooser design');
        await page.keyboard.press('Escape');
        for (const href of [evernoteDesktop, evernoteWeb]) {
          await evernote.click();
          await choose(page, original, href);
        }
        await quickToggle.click();
        await page.locator('#quick-links-panel').getByRole('button', {name: /^Evernote/}).click();
        assert.equal(await original.evaluate(node => node.open), true);
        await page.keyboard.press('Escape');
        await assertClosed(original, quickToggle);

        assert.deepEqual(await storageSnapshot(page), before, 'Chooser interactions preserve existing browser storage');
        assert.equal(page.url(), `${base}/morning-launchpad/`, 'Launchpad remains open');
        assert.ok(external.every(url => !/mail\.google\.com|outlook\.cloud\.microsoft|evernote\.com/.test(url)),
          'No destination service request was made');
        assert.deepEqual(errors, []);
        console.log(`PASS ${theme} ${width}px: Mail targets, keyboard focus, dismissal, Quick links, Evernote and storage preservation`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

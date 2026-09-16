import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Export only the built page and the assets it references. Never copy the
// Launchpad source directory, retained briefings, backups or browser data.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw new Error('Pass the local Launchpad dist-links directory.');
const built = resolve(process.argv[2]);
const destination = resolve(repo, 'morning-launchpad');
// The online edition now includes a maintained import/review extension.
// Stop an older local build from silently removing it or its plan integration.
const currentPage = await readFile(resolve(destination, 'index.html'), 'utf8').catch(() => '');
if (currentPage.includes('summary-import.css')) {
  throw new Error('The online Launchpad includes summary import. Update the maintained online files directly; port summary-import and useSummaryBridge to the local source before replacing this build. See docs/morning-launchpad-online.md.');
}
const original = (await readFile(resolve(built, 'index.html'), 'utf8')).replace(/\r\n/g, '\n');
if (!/<title>(?:Morning|Daily) Launchpad<\/title>/.test(original)) throw new Error('Unexpected page.');
const references = [...original.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
if (references.length !== 4 || references.some(path => !/^\/(?:favicon\.svg|assets\/(?:theme|launchpad)-[a-zA-Z0-9]+\.(?:js|css))$/.test(path))) {
  throw new Error('Unexpected assets; review the build before exporting it.');
}
const policy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'";
const html = original.replace('<head>', `<head>\n  <meta http-equiv="Content-Security-Policy" content="${policy}">\n  <meta name="robots" content="noindex, nofollow">\n  <meta name="referrer" content="no-referrer">`)
  .replace(/((?:src|href)=")\//g, '$1./');
const files = new Map([['index.html', Buffer.from(html)]]);
for (const reference of references) {
  const text = (await readFile(resolve(built, reference.slice(1)), 'utf8')).replace(/\r\n/g, '\n');
  files.set(reference.slice(1), Buffer.from(text));
}
// Load and validate the entire package before writing any public files.
for (const [path, bytes] of files) {
  const target = resolve(destination, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
}
const manifest = [...files].map(([path, bytes]) => `${createHash('sha256').update(bytes).digest('hex')}\tmorning-launchpad/${path}`).join('\n') + '\n';
await writeFile(resolve(repo, 'docs/morning-launchpad-2026-09-15.sha256'), manifest);
console.log(`Exported ${files.size} public application files. No personal records copied.`);

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
const original = await readFile(resolve(built, 'index.html'), 'utf8');
if (!original.includes('<title>Morning Launchpad</title>')) throw new Error('Unexpected page.');
const references = [...original.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
if (references.length !== 4 || references.some(path => !/^\/(?:favicon\.svg|assets\/(?:theme|launchpad)-[a-zA-Z0-9]+\.(?:js|css))$/.test(path))) {
  throw new Error('Unexpected assets; review the build before exporting it.');
}
const policy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'";
const html = original.replace('<head>', `<head>\n  <meta http-equiv="Content-Security-Policy" content="${policy}">\n  <meta name="robots" content="noindex, nofollow">\n  <meta name="referrer" content="no-referrer">`)
  .replace(/((?:src|href)=")\//g, '$1./');
const files = new Map([['index.html', Buffer.from(html)]]);
for (const reference of references) {
  files.set(reference.slice(1), await readFile(resolve(built, reference.slice(1))));
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

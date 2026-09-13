/**
 * Regression test for the browser upload path: POST a FormData object via
 * fetch exactly the way lib/client.ts (postForm) does — no explicit
 * Content-Type, browser/undici sets the multipart boundary.
 *
 * Usage: node scripts/regression_upload.mjs
 */
import { readFileSync, existsSync } from 'node:fs';

const BASE = 'http://localhost:3000';
const imgPath = process.argv[2];
if (!imgPath || !existsSync(imgPath)) {
  console.error('usage: node scripts/regression_upload.mjs <image.png>');
  process.exit(1);
}

// 1. owner session
const session = await fetch(`${BASE}/api/session`, { method: 'POST' });
const cookie = (session.headers.get('set-cookie') || '').split(';')[0];
if (!cookie.startsWith('smp_session=')) throw new Error('no session cookie set');
const { data: sess } = await session.json();

// 2. create a project for this session
const pr = await fetch(`${BASE}/api/projects`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ title: 'Upload regression' }),
});
const { data: prData } = await pr.json();
const projectId = prData.project.id;

// 3. upload via FormData (browser path)
const form = new FormData();
const bytes = readFileSync(imgPath);
form.append('file', new Blob([bytes], { type: 'image/png' }), 'browser upload.png');
form.append('width', '1200');
form.append('height', '675');
const up = await fetch(`${BASE}/api/projects/${projectId}/variants`, {
  method: 'POST',
  body: form,
  headers: { Cookie: cookie },
});
const payload = await up.json();
if (up.status === 200 && payload.success && payload.data.variant.asset.width === 1200) {
  console.log('PASS browser-equivalent FormData upload →', payload.data.variant.name);
} else {
  console.error('FAIL', up.status, JSON.stringify(payload).slice(0, 300));
  process.exit(1);
}

// 4. replace via FormData (same wrapper)
const variantId = payload.data.variant.id;
const form2 = new FormData();
form2.append('file', new Blob([bytes], { type: 'image/png' }), 'replaced.png');
const rep = await fetch(`${BASE}/api/variants/${variantId}/replace`, {
  method: 'POST',
  body: form2,
  headers: { Cookie: cookie },
});
if (rep.status === 200) {
  console.log('PASS browser-equivalent FormData replace');
} else {
  console.error('FAIL replace', rep.status, JSON.stringify(await rep.json()).slice(0, 200));
  process.exit(1);
}

// cleanup: delete the regression project
await fetch(`${BASE}/api/projects/${projectId}`, { method: 'DELETE', headers: { Cookie: cookie } });
console.log('cleanup ok');

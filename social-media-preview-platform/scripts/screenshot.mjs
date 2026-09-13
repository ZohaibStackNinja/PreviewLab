/**
 * Headless screenshot driver (Chrome/Edge DevTools Protocol, no deps).
 *
 * Usage: node scripts/screenshot.mjs <url> <outfile> [--cookie name=value] [--width 1440] [--height 900] [--wait ms] [--click "selector"]
 *
 * Sets the optional cookie before navigation so authenticated pages
 * (owner workspace) can be captured.
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const url = args[0];
const out = args[1];

function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
}

const cookieArg = args.indexOf('--cookie') >= 0 ? args[args.indexOf('--cookie') + 1] : null;
const width = Number(argValue('--width', '1440'));
const height = Number(argValue('--height', '900'));
const waitMs = Number(argValue('--wait', '1500'));
const clickSelector = args.indexOf('--click') >= 0 ? args[args.indexOf('--click') + 1] : null;

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const exe = BROWSERS.find((p) => existsSync(p));
if (!exe) {
  console.error('No Chrome/Edge found');
  process.exit(1);
}

const port = 9333 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'smp-shot-'));

const proc = spawn(exe, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--window-size=1440,900',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function send(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const onMsg = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', onMsg);
        if (msg.error) reject(new Error(method + ': ' + JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  // wait for the debugger endpoint
  let target = null;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) break;
    } catch {}
    await sleep(250);
  }
  const created = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  target = await created.json();

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });

  await send(ws, 1, 'Page.enable');
  await send(ws, 2, 'Runtime.enable');
  await send(ws, 3, 'Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false,
  });

  if (cookieArg) {
    const [name, ...rest] = cookieArg.split('=');
    const origin = new URL(url).origin;
    await send(ws, 4, 'Network.setCookie', {
      name, value: rest.join('='), url: origin, httpOnly: true,
    });
  }

  await send(ws, 5, 'Page.navigate', { url });
  await sleep(waitMs);

  if (clickSelector) {
    await send(ws, 6, 'Runtime.evaluate', {
      expression: `document.querySelector(${JSON.stringify(clickSelector)})?.click()`,
    });
    await sleep(900);
  }

  const shot = await send(ws, 7, 'Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('saved', out);
  ws.close();
  proc.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  proc.kill();
  process.exit(1);
});

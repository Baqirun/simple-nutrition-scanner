// Dev-only visual audit harness. Drives the already-installed Chrome over the
// DevTools Protocol so UI changes can be checked without adding a dependency.
//
// Usage:
//   1. bun run build && bun run preview -- --port 4173 --host 127.0.0.1
//   2. node scripts/ui-audit.mjs scripts/ui-audit/audit.spec.json
//
// The spec is JSON: { origin, outDir, width, height, waitMs, seedScript, pages }.
// Each page gets a screenshot in `outDir` plus a probe result and any console
// issues, and machine-readable results land in `outDir/report.json`.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME_CANDIDATES = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
].filter(Boolean);

const specPath = process.argv[2];
if (!specPath) {
    console.error('usage: node scripts/ui-audit.mjs <spec.json>');
    process.exit(1);
}

const { existsSync } = await import('node:fs');
const CHROME = CHROME_CANDIDATES.find(candidate => existsSync(candidate));
if (!CHROME) {
    console.error('No Chrome or Edge binary found. Set CHROME_PATH to one.');
    process.exit(1);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const root = resolve('.');
const outDir = resolve(root, spec.outDir ?? 'temp/ui-audit/run');
const PORT = Number(process.env.CDP_PORT ?? 9222);
const PROFILE = `${process.env.TEMP ?? '/tmp'}/cdp-profile-${Date.now()}`;

mkdirSync(outDir, { recursive: true });

const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    `--user-data-dir=${PROFILE}`,
    'about:blank'
], { detached: true, stdio: 'ignore' });
chrome.unref();

async function waitForChrome() {
    for (let i = 0; i < 60; i++) {
        try {
            const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
            if (response.ok) return await response.json();
        } catch { /* not up yet */ }
        await sleep(500);
    }
    throw new Error('Chrome did not expose the DevTools Protocol');
}

async function newTarget(url) {
    const response = await fetch(
        `http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`,
        { method: 'PUT' }
    );
    return await response.json();
}

class Session {
    #ws; #id = 0; #pending = new Map(); events = [];

    constructor(ws) {
        this.#ws = ws;
        ws.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (message.id && this.#pending.has(message.id)) {
                const { resolve: settle, reject } = this.#pending.get(message.id);
                this.#pending.delete(message.id);
                message.error ? reject(new Error(JSON.stringify(message.error))) : settle(message.result);
            } else if (message.method) {
                this.events.push(message);
            }
        });
    }

    static async connect(wsUrl) {
        const ws = new WebSocket(wsUrl);
        await new Promise((settle, reject) => {
            ws.addEventListener('open', settle, { once: true });
            ws.addEventListener('error', reject, { once: true });
        });
        return new Session(ws);
    }

    send(method, params = {}, timeoutMs = 20000) {
        const id = ++this.#id;
        return new Promise((settle, reject) => {
            const timer = setTimeout(() => {
                this.#pending.delete(id);
                reject(new Error(`timeout: ${method}`));
            }, timeoutMs);
            this.#pending.set(id, {
                resolve: (value) => { clearTimeout(timer); settle(value); },
                reject: (error) => { clearTimeout(timer); reject(error); }
            });
            this.#ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async eval(expression) {
        const result = await this.send('Runtime.evaluate', {
            expression,
            awaitPromise: true,
            returnByValue: true
        }, 30000);

        if (result.exceptionDetails) {
            throw new Error(
                'eval failed: ' +
                (result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
            );
        }
        return result.result.value;
    }

    close() { this.#ws.close(); }
}

const version = await waitForChrome();
const report = { browser: version.Browser, pages: [] };

for (const page of spec.pages) {
    const target = await newTarget('about:blank');
    const session = await Session.connect(target.webSocketDebuggerUrl);

    await session.send('Runtime.enable');
    await session.send('Log.enable');
    await session.send('Page.enable');
    await session.send('Emulation.setDeviceMetricsOverride', {
        width: spec.width ?? 412,
        height: spec.height ?? 900,
        deviceScaleFactor: 2,
        mobile: true
    });

    if (spec.seedScript) {
        await session.send('Page.addScriptToEvaluateOnNewDocument', {
            source: spec.seedScript.replace(/__ORIGIN__/g, spec.origin)
        });
    }

    session.events.length = 0;
    await session.send('Page.navigate', { url: spec.origin + page.path });
    await sleep(page.waitMs ?? spec.waitMs ?? 3500);

    const entry = { path: page.path };

    const consoleIssues = session.events
        .filter(event => event.method === 'Log.entryAdded' && ['error', 'warning'].includes(event.params.entry.level))
        .map(event => `${event.params.entry.level}: ${event.params.entry.text}`);
    const exceptions = session.events
        .filter(event => event.method === 'Runtime.exceptionThrown')
        .map(event => event.params.exceptionDetails.exception?.description ?? event.params.exceptionDetails.text);

    if (page.probe) {
        try {
            entry.probe = await session.eval(page.probe);
        } catch (error) {
            entry.probeError = String(error);
        }
    }

    entry.consoleIssues = [...exceptions, ...consoleIssues];

    if (page.screenshot !== false) {
        const shot = await session.send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: !!page.fullPage
        });
        const file = resolve(outDir, `${page.name}.png`);
        writeFileSync(file, Buffer.from(shot.data, 'base64'));
        entry.screenshot = file;
    }

    report.pages.push(entry);
    session.close();
    await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`);
}

writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

try { process.kill(-chrome.pid); } catch { try { chrome.kill(); } catch { /* already gone */ } }
process.exit(0);

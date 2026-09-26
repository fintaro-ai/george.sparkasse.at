// Sparkasse / Erste Bank George (AT) — shared helpers.
// Auth: George keeps an OAuth bearer token in page memory only. We open George in the
// logged-in browser profile (SSO re-auths new tabs), hook fetch/XHR to capture the
// Authorization header, then call the JSON APIs from inside the page (same origin/CORS).
import { AuthRequiredError, CommandExecutionError, TimeoutError } from '@jackwener/opencli/errors';

export const GEORGE_URL = 'https://george.sparkasse.at/index.html#/overview';
export const DOMAIN = 'george.sparkasse.at';
export const API = 'https://api.sparkasse.at';
export const NB = `${API}/rest/netbanking/my`;
export const G = `${API}/proxy/g/api/my`;
export const GGW = `${API}/proxy/ggw`;
export const SAM = 'https://sam.sparkasse.at/netbanking/my/electronicstorage/cases';
export const MSG = 'https://messaging.sparkasse.at/my/messenger';
export const CARDS = 'https://cards-api.sparkasse.at/rest/netbanking/my/cards';

export async function ensureGeorge(page) {
    const url = String(await page.evaluate(() => location.href));
    if (!url.startsWith('https://george.sparkasse.at/')) {
        await page.goto(GEORGE_URL);
        await page.wait(6);
    }
    const now = String(await page.evaluate(() => location.href));
    if (!now.startsWith('https://george.sparkasse.at/')) {
        throw new AuthRequiredError(DOMAIN, 'Bitte in Brave bei George (Sparkasse) einloggen und erneut ausführen.');
    }
    await page.evaluate(() => {
        if (window.__opencliHooked) return;
        window.__opencliHooked = true;
        const set = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
            if (/authorization/i.test(k) && /^Bearer /.test(v)) window.__gAuth = v;
            return set.apply(this, arguments);
        };
        const f = window.fetch;
        window.fetch = function (i, init) {
            try {
                const a = new Headers((init && init.headers) || (i && i.headers) || {}).get('authorization');
                if (a && /^Bearer /.test(a)) window.__gAuth = a;
            } catch { /* ignore */ }
            return f.apply(this, arguments);
        };
    });
    for (let i = 0; i < 8; i++) {
        const has = await page.evaluate(() => Boolean(window.__gAuth));
        if (has) return;
        await page.evaluate((h) => { location.hash = h; }, i % 2 ? '#/overview' : '#/orders');
        await page.wait(2);
    }
    throw new TimeoutError('george auth token', 16);
}

/** GET JSON from a George API inside the page. */
export async function gget(page, url) {
    const r = await page.evaluate(async (u) => {
        try {
            // Some netbanking endpoints answer 406 to a strict JSON Accept; retry with */*.
            let res = await fetch(u, { headers: { authorization: window.__gAuth, accept: 'application/json' } });
            if (res.status === 406) res = await fetch(u, { headers: { authorization: window.__gAuth, accept: '*/*' } });
            return { s: res.status, t: await res.text() };
        } catch (e) { return { s: 0, t: String(e) }; }
    }, url);
    if (r.s === 401 || r.s === 403) throw new AuthRequiredError(DOMAIN, `George-Sitzung abgelaufen (${r.s}). Neu einloggen.`);
    if (r.s < 200 || r.s >= 300) throw new CommandExecutionError(`GET ${url.replace(/[A-F0-9]{16,}/g, '{id}')} -> HTTP ${r.s}`);
    try { return JSON.parse(r.t); } catch { throw new CommandExecutionError(`GET ${url} returned non-JSON`); }
}

/** Like gget but returns null instead of throwing (for optional features in export). */
export async function tryGet(page, url) {
    try { return await gget(page, url); } catch (e) { if (e instanceof AuthRequiredError) throw e; return null; }
}

/** Binary download inside the page → Buffer. */
export async function gbin(page, url, method = 'GET') {
    const r = await page.evaluate(async (u, m) => {
        try {
            const res = await fetch(u, { method: m, headers: { authorization: window.__gAuth, accept: '*/*' } });
            const b = new Uint8Array(await res.arrayBuffer());
            let bin = '';
            for (let i = 0; i < b.length; i += 32768) bin += String.fromCharCode.apply(null, b.subarray(i, i + 32768));
            return { s: res.status, ct: res.headers.get('content-type'), b64: btoa(bin) };
        } catch (e) { return { s: 0, ct: '', b64: '', e: String(e) }; }
    }, url, method);
    if (r.s === 401 || r.s === 403) throw new AuthRequiredError(DOMAIN, 'George-Sitzung abgelaufen.');
    if (r.s < 200 || r.s >= 300) throw new CommandExecutionError(`download -> HTTP ${r.s} ${r.e || ''}`);
    return { buf: Buffer.from(r.b64, 'base64'), contentType: r.ct };
}

export const amount = (a) => (a && a.value != null ? a.value / 10 ** (a.precision ?? 2) : null);
export const day = (v) => {
    if (v == null || v === '') return '';
    const d = typeof v === 'number' ? new Date(v) : new Date(String(v));
    if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const listOf = (j) => (Array.isArray(j) ? j : (j && Object.values(j).find(Array.isArray)) || []);

export async function getAccounts(page) {
    const j = await gget(page, `${NB}/accounts?size=500`);
    return listOf(j).map((a) => ({
        ...a,
        _label: a.type === 'CURRENT' ? 'Girokonto' : a.type === 'SAVING' ? 'Sparkonto' : (a.productI18N || a.type),
    }));
}

export async function allTransactions(page, { from = '2000-01-01', to = '', accountId = '' } = {}) {
    const all = [];
    let p = 0, tp = 1;
    while (p < tp && p < 500) {
        const q = new URLSearchParams({ page: String(p), pageSize: '100', from, continuousCardIdFiltering: 'false', includeContainedTransactions: 'false' });
        if (to) q.set('to', to);
        if (accountId) q.set('id', accountId);
        const j = await gget(page, `${G}/transactions?${q}`);
        tp = j.totalPages ?? 0;
        all.push(...(j.collection || []));
        p++;
    }
    return all;
}

export function txRow(t, accName) {
    const at = t.additionalTexts || {};
    const cat = (t.categories || [])[0] || {};
    return {
        date: day(t.bookingDate),
        valuta: day(t.valuationDate),
        account: accName[t.ownerAccount?.id] || t.ownerAccount?.alias || '',
        amount: amount(t.amount),
        currency: t.amount?.currency || '',
        partner: t.partnerName || t.merchantName || t.title || '',
        partnerIban: t.partner?.iban || '',
        reference: [t.reference, t.paymentReference, at.text1, at.text2, at.text3, ...(at.lineItems || [])].filter(Boolean).join(' | '),
        bookingType: t.bookingTypeTranslation || t.bookingType || '',
        category: cat.mainCategory || '',
        subcategory: cat.subCategory || '',
        tags: (t.tags || []).map((x) => (typeof x === 'string' ? x : x.name || x.id)).join(' '),
        card: t.maskedCardNumber || '',
        place: [t.merchantShopTown, t.merchantShopCountry].filter(Boolean).join(' '),
        balance: amount(t.balance),
        attachment: t.attachment ? 'ja' : '',
        id: t.id,
    };
}

// opencli sparkasse export — full local backup of everything George shows (read-only).
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { DOMAIN, NB, SAM, ensureGeorge, gget, tryGet, gbin, amount, day, listOf, getAccounts, allTransactions, txRow } from './utils.js';
import { FEATURES } from './features.js';

const safe = (s) => String(s || '').replace(/[\\/:*?"<>|\n\r\t]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120);
const csvCell = (v) => {
    if (v == null) return '';
    if (typeof v === 'number') return String(v).replace('.', ',');
    const s = String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function writeCsv(file, rows) {
    const cols = Object.keys(rows[0] || {});
    const body = [cols.join(';'), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(';'))].join('\r\n');
    fs.writeFileSync(file, '﻿' + body, { mode: 0o600 });
}
const eur = (n) => (n == null ? '' : n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export const exportCommand = cli({
    site: 'sparkasse',
    name: 'export',
    access: 'read',
    description: 'Komplett-Export: Buchungen (CSV/JSON), Auszüge (PDF), Postfach-Dokumente, alle Funktionen als JSON, Übersicht + Feature-Karte',
    domain: DOMAIN,
    strategy: Strategy.COOKIE,
    browser: true,
    navigateBefore: false,
    args: [
        { name: 'out', type: 'string', default: '', help: 'Zielordner (Default ~/Documents/Sparkasse-Export/<heute>)' },
        { name: 'pdfs', type: 'bool', default: true, help: 'Kontoauszüge als PDF laden' },
        { name: 'documents', type: 'bool', default: true, help: 'Postfach-Dokumente (Dokumente & Anträge) laden' },
        { name: 'timeout', type: 'int', default: 1800, help: 'max. Laufzeit in Sekunden' },
    ],
    columns: ['feature', 'area', 'status', 'count', 'file'],
    func: async (page, args) => {
        const out = path.resolve((args.out || path.join(os.homedir(), 'Documents', 'Sparkasse-Export', new Date().toISOString().slice(0, 10))).replace(/^~(?=\/)/, os.homedir()));
        if (out === '/' || out === os.homedir()) throw new ArgumentError('--out ist zu allgemein');
        for (const d of ['', 'buchungen', 'kontoauszuege', 'dokumente', 'daten']) fs.mkdirSync(path.join(out, d), { recursive: true, mode: 0o700 });
        const report = [];
        const log = (feature, area, status, count, file) => report.push({ feature, area, status, count, file: file ? path.relative(out, file) : '' });

        await ensureGeorge(page);
        const acc = await getAccounts(page);
        const names = Object.fromEntries(acc.map((a) => [a.id, a._label]));
        const cards = listOf(await gget(page, `${NB}/cards?size=500`));

        // 1) every mapped feature as raw JSON
        for (const f of FEATURES) {
            if (!f.url) continue;
            const targets = f.scope === 'global' ? [[null, '']] : f.scope === 'card' ? cards.map((c) => [c.id, safe(c.productI18N || c.id)]) : acc.map((a) => [a.id, a._label]);
            let n = 0, ok = 0, file = '';
            for (const [id, label] of targets) {
                const j = await tryGet(page, f.url(id));
                if (j == null) continue;
                ok++;
                n += Array.isArray(j) ? j.length : listOf(j).length;
                file = path.join(out, 'daten', `${f.key}${label ? '_' + label : ''}.json`);
                fs.writeFileSync(file, JSON.stringify(j, null, 1), { mode: 0o600 });
            }
            log(f.key, f.area, ok === targets.length ? 'ok' : ok ? 'teilweise' : 'nicht verfügbar', n, file);
        }

        // 2) transactions
        const tx = await allTransactions(page);
        const rows = tx.map((t) => txRow(t, names)).sort((a, b) => (a.date + a.id < b.date + b.id ? -1 : 1));
        fs.writeFileSync(path.join(out, 'buchungen', 'alle.json'), JSON.stringify(tx, null, 1), { mode: 0o600 });
        writeCsv(path.join(out, 'buchungen', 'alle.csv'), rows);
        for (const a of acc) {
            const r = rows.filter((x) => x.account === a._label);
            if (r.length) writeCsv(path.join(out, 'buchungen', `${a._label}.csv`), r);
        }
        log('transactions', 'Kontohistorie / Buchungen', 'ok', rows.length, path.join(out, 'buchungen', 'alle.csv'));

        // 3) statement PDFs
        let pdfN = 0;
        const stmts = [];
        for (const a of acc) {
            for (const s of listOf(await gget(page, `${NB}/accounts/${a.id}/statements?size=500`))) {
                stmts.push({ a, s });
                if (!args.pdfs) continue;
                const file = path.join(out, 'kontoauszuege', `${a._label}_${s.minBookingDate}_bis_${s.maxBookingDate}_Nr${s.number}.pdf`);
                if (!fs.existsSync(file)) {
                    const { buf } = await gbin(page, `${NB}/accounts/${a.id}/statements/signed/download?format=PDF_A4&statementId=${encodeURIComponent(s.id)}`, 'POST');
                    if (buf.subarray(0, 5).toString() !== '%PDF-') continue;
                    fs.writeFileSync(file, buf, { mode: 0o600 });
                }
                pdfN++;
            }
        }
        log('statement-pdfs', 'Kontoauszüge als PDF', args.pdfs ? (pdfN === stmts.length ? 'ok' : 'teilweise') : 'übersprungen', pdfN, path.join(out, 'kontoauszuege'));

        // 4) documents & requests (postbox)
        let docN = 0, docTotal = 0;
        if (args.documents) {
            const cases = listOf(await gget(page, `${SAM}?size=500`));
            const idx = [];
            for (const c of cases) {
                const det = await tryGet(page, `${SAM}/${c.id}`);
                for (const [di, d] of (det?.documents || []).entries()) {
                    docTotal++;
                    const dir = path.join(out, 'dokumente', safe(`${day(c.creationDate)}_${c.name}_${String(c.id).slice(-6)}`));
                    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
                    const file = path.join(dir, safe(((det.documents.length > 1) ? `${di + 1}_` : '') + (d.fileName || d.niceName || d.id)));
                    idx.push({ date: day(c.creationDate), case: c.name, type: c.caseType, state: c.state, file: path.relative(out, file) });
                    if (fs.existsSync(file)) { docN++; continue; }
                    try {
                        const { buf } = await gbin(page, `${SAM}/${c.id}/documents/${d.id}/download`);
                        fs.writeFileSync(file, buf, { mode: 0o600 });
                        docN++;
                    } catch { /* counted as missing */ }
                }
            }
            writeCsv(path.join(out, 'dokumente', 'index.csv'), idx.length ? idx : [{ date: '', case: '', type: '', state: '', file: '' }]);
        }
        log('document-files', 'Postfach-Dokumente (Dateien)', args.documents ? (docN === docTotal ? 'ok' : 'teilweise') : 'übersprungen', docN, path.join(out, 'dokumente'));

        // 5) overview + feature map
        const giro = rows.filter((r) => r.account === 'Girokonto' && r.amount != null);
        const byYear = {}, byMonth = {}, byCat = {}, byPartner = {};
        for (const r of giro) {
            const i = r.amount >= 0 ? 0 : 1;
            (byYear[r.date.slice(0, 4)] ||= [0, 0])[i] += r.amount;
            (byMonth[r.date.slice(0, 7)] ||= [0, 0])[i] += r.amount;
            if (i) { byCat[r.category || 'ohne'] = (byCat[r.category || 'ohne'] || 0) + r.amount; byPartner[r.partner.slice(0, 40)] = (byPartner[r.partner.slice(0, 40)] || 0) + r.amount; }
        }
        const top = (o, n) => Object.entries(o).sort((a, b) => a[1] - b[1]).slice(0, n);
        const dates = rows.map((r) => r.date).sort();
        const L = [
            `# Sparkasse Export (${new Date().toISOString().slice(0, 10)})`, '',
            '## Konten', ...acc.map((a) => `- **${a._label}** (${a.productI18N || a.product}): Saldo **${eur(amount(a.balance))} €**, verfügbar ${eur(amount(a.disposable))} €, IBAN ${a.accountno?.iban || ''}`), '',
            '## Karten', ...cards.map((c) => `- ${c.productI18N || c.product} · ${c.number || ''} · gültig bis ${day(c.expiryDate)} · ${c.state}`), '',
            `## Buchungen: ${rows.length} (${dates[0] || '-'} bis ${dates[dates.length - 1] || '-'})`, '',
            '## Girokonto pro Jahr (Eingang / Ausgang / Differenz)', ...Object.keys(byYear).sort().map((y) => `- ${y}: +${eur(byYear[y][0])} / ${eur(byYear[y][1])} / ${eur(byYear[y][0] + byYear[y][1])}`), '',
            '## Girokonto pro Monat', ...Object.keys(byMonth).sort().map((m) => `- ${m}: +${eur(byMonth[m][0])} / ${eur(byMonth[m][1])} / ${eur(byMonth[m][0] + byMonth[m][1])}`), '',
            '## Ausgaben nach Kategorie', ...top(byCat, 20).map(([k, v]) => `- ${k}: ${eur(v)}`), '',
            '## Top 15 Empfänger', ...top(byPartner, 15).map(([k, v]) => `- ${k}: ${eur(v)}`), '',
            `## Kontoauszüge: ${pdfN} PDF · Postfach-Dokumente: ${docN}/${docTotal}`,
        ];
        fs.writeFileSync(path.join(out, 'UEBERSICHT.md'), L.join('\n'), { mode: 0o600 });
        const F = ['# George Feature-Karte', '', '| Funktion | Bereich | George-Route | Status | Anzahl | Datei | Befehl |', '|---|---|---|---|---|---|---|',
            ...report.map((r) => {
                const f = FEATURES.find((x) => x.key === r.feature);
                return `| ${r.feature} | ${r.area} | ${f?.route || ''} | ${r.status} | ${r.count} | ${r.file} | \`opencli sparkasse ${f?.command || (f ? 'raw ' + f.key : 'export')}\` |`;
            })];
        fs.writeFileSync(path.join(out, 'FEATURES.md'), F.join('\n'), { mode: 0o600 });
        log('overview', 'UEBERSICHT.md + FEATURES.md', 'ok', report.length, path.join(out, 'UEBERSICHT.md'));
        return report;
    },
});

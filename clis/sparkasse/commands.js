// opencli sparkasse <command> — read-only George (Sparkasse/Erste AT) CLI.
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, EmptyResultError } from '@jackwener/opencli/errors';
import { DOMAIN, NB, G, SAM, ensureGeorge, gget, amount, day, listOf, getAccounts, allTransactions, txRow } from './utils.js';
import { FEATURES } from './features.js';

const base = {
    site: 'sparkasse',
    access: 'read',
    domain: DOMAIN,
    strategy: Strategy.COOKIE,
    browser: true,
    navigateBefore: false,
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const accountsCommand = cli({
    ...base,
    name: 'accounts',
    description: 'Konten mit IBAN, Saldo und verfügbarem Betrag',
    args: [],
    columns: ['name', 'product', 'iban', 'balance', 'disposable', 'currency', 'accountId'],
    func: async (page) => {
        await ensureGeorge(page);
        const acc = await getAccounts(page);
        if (!acc.length) throw new EmptyResultError('sparkasse accounts', 'keine Konten');
        return acc.map((a) => ({
            name: a._label, product: a.productI18N || a.product || '', iban: a.accountno?.iban || '',
            balance: amount(a.balance), disposable: amount(a.disposable), currency: a.balance?.currency || '', accountId: a.id,
        }));
    },
});

export const cardsCommand = cli({
    ...base,
    name: 'cards',
    description: 'Bankkarten (Debit/Kredit) mit Status und Ablaufdatum',
    args: [],
    columns: ['product', 'number', 'holder', 'expiry', 'state', 'cardId'],
    func: async (page) => {
        await ensureGeorge(page);
        const cards = listOf(await gget(page, `${NB}/cards?size=500`));
        if (!cards.length) throw new EmptyResultError('sparkasse cards', 'keine Karten');
        return cards.map((c) => ({
            product: c.productI18N || c.product || '', number: c.number || c.maskedNumber || '', holder: c.owner || c.cardHolder || '',
            expiry: day(c.expiryDate), state: c.state || '', cardId: c.id,
        }));
    },
});

export const transactionsCommand = cli({
    ...base,
    name: 'transactions',
    description: 'Buchungen (alle Seiten) mit Partner, IBAN, Zweck, Kategorie, Saldo',
    args: [
        { name: 'from', type: 'string', default: '2000-01-01', help: 'ab Datum YYYY-MM-DD' },
        { name: 'to', type: 'string', default: '', help: 'bis Datum YYYY-MM-DD (leer = heute)' },
        { name: 'account', type: 'string', default: 'all', help: 'all | giro | spar | <accountId>' },
        { name: 'limit', type: 'int', default: 0, help: 'max. Zeilen (0 = alle)' },
    ],
    columns: ['date', 'valuta', 'account', 'amount', 'currency', 'partner', 'partnerIban', 'reference', 'bookingType', 'category', 'subcategory', 'tags', 'card', 'place', 'balance', 'attachment', 'id'],
    func: async (page, args) => {
        if (!DATE.test(args.from)) throw new ArgumentError('--from muss YYYY-MM-DD sein');
        if (args.to && !DATE.test(args.to)) throw new ArgumentError('--to muss YYYY-MM-DD sein');
        const limit = Number(args.limit ?? 0);
        if (!Number.isInteger(limit) || limit < 0) throw new ArgumentError('--limit muss >= 0 sein');
        await ensureGeorge(page);
        const acc = await getAccounts(page);
        const names = Object.fromEntries(acc.map((a) => [a.id, a._label]));
        const sel = String(args.account || 'all').toLowerCase();
        let accountId = '';
        if (sel === 'giro') accountId = acc.find((a) => a.type === 'CURRENT')?.id || '';
        else if (sel === 'spar') accountId = acc.find((a) => a.type === 'SAVING')?.id || '';
        else if (sel !== 'all') accountId = args.account;
        if (sel !== 'all' && !accountId) throw new ArgumentError(`Konto "${args.account}" nicht gefunden`);
        const rows = (await allTransactions(page, { from: args.from, to: args.to, accountId })).map((t) => txRow(t, names));
        if (!rows.length) throw new EmptyResultError('sparkasse transactions', 'keine Buchungen im Zeitraum');
        rows.sort((a, b) => (a.date < b.date ? 1 : -1));
        return limit ? rows.slice(0, limit) : rows;
    },
});

export const statementsCommand = cli({
    ...base,
    name: 'statements',
    description: 'Kontoauszüge aller Konten (Liste; PDFs via "sparkasse export")',
    args: [],
    columns: ['account', 'number', 'from', 'to', 'statementDate', 'statementId'],
    func: async (page) => {
        await ensureGeorge(page);
        const rows = [];
        for (const a of await getAccounts(page)) {
            const st = listOf(await gget(page, `${NB}/accounts/${a.id}/statements?size=500`));
            for (const s of st) rows.push({ account: a._label, number: s.number, from: s.minBookingDate, to: s.maxBookingDate, statementDate: day(s.statementDate), statementId: s.id });
        }
        if (!rows.length) throw new EmptyResultError('sparkasse statements', 'keine Auszüge');
        return rows;
    },
});

export const documentsCommand = cli({
    ...base,
    name: 'documents',
    description: 'Postfach "Dokumente & Anträge" (Verträge, AGB, signierte Auszüge)',
    args: [],
    columns: ['date', 'name', 'type', 'state', 'caseId'],
    func: async (page) => {
        await ensureGeorge(page);
        const cases = listOf(await gget(page, `${SAM}?size=500`));
        if (!cases.length) throw new EmptyResultError('sparkasse documents', 'Postfach leer');
        return cases.map((c) => ({ date: day(c.creationDate), name: c.name, type: c.caseType, state: c.state, caseId: c.id }));
    },
});

export const ordersCommand = cli({
    ...base,
    name: 'orders',
    description: 'Zahlungsaufträge (finished = abgeschlossen, active = offen/terminiert)',
    args: [{ name: 'state', type: 'string', default: 'finished', help: 'finished | active' }],
    columns: ['date', 'state', 'amount', 'currency', 'receiver', 'receiverIban', 'payeeCheck', 'orderType', 'referenceId'],
    func: async (page, args) => {
        if (!['finished', 'active'].includes(args.state)) throw new ArgumentError('--state muss finished oder active sein');
        await ensureGeorge(page);
        const o = listOf(await gget(page, `${NB}/orders/payments?page=0&size=1000&stateGroup=${args.state}`));
        if (!o.length) throw new EmptyResultError('sparkasse orders', `keine ${args.state}-Aufträge`);
        return o.map((x) => ({
            date: day(x.executionDate || x.transferDate || x.modificationDate || x.creationDate), state: x.state || '',
            amount: amount(x.amount), currency: x.amount?.currency || '', receiver: x.receiverName || '',
            receiverIban: x.receiver?.iban || '', payeeCheck: x.payeeVerificationResult?.result || '', orderType: x.orderType || x.type || '', referenceId: x.referenceId || x.id,
        }));
    },
});

export const spendingsCommand = cli({
    ...base,
    name: 'spendings',
    description: 'Ausgaben nach Kategorie (Finanz-Helfer) für einen Zeitraum',
    args: [
        { name: 'from', type: 'string', default: '', help: 'YYYY-MM-DD (leer = Monatsanfang)' },
        { name: 'to', type: 'string', default: '', help: 'YYYY-MM-DD (leer = heute)' },
    ],
    columns: ['category', 'amount', 'currency', 'count', 'share'],
    func: async (page, args) => {
        const to = args.to || new Date().toISOString().slice(0, 10);
        const from = args.from || to.slice(0, 8) + '01';
        if (!DATE.test(from) || !DATE.test(to)) throw new ArgumentError('Datum muss YYYY-MM-DD sein');
        await ensureGeorge(page);
        const j = await gget(page, `${G}/fh/calculations/spending?from=${from}&to=${to}`);
        const cats = listOf(j.categories ? j.categories : j);
        if (!cats.length) throw new EmptyResultError('sparkasse spendings', 'keine Ausgaben im Zeitraum');
        return cats.map((c) => ({
            category: c.category || c.mainCategory || c.id || c.name || '', amount: amount(c.amount || c.sum), currency: (c.amount || c.sum)?.currency || '',
            count: c.count ?? c.transactionCount ?? '', share: c.percentage ?? c.share ?? '',
        }));
    },
});

export const rawCommand = cli({
    ...base,
    name: 'raw',
    description: 'Rohdaten (JSON) einer George-Funktion; ohne Argument: Liste aller Funktionen',
    defaultFormat: 'json',
    args: [{ name: 'feature', type: 'string', positional: true, required: false, default: '', help: 'z.B. standing-orders, sepa-mandates, budgets, cashflow, hashtags …' }],
    columns: ['feature', 'target', 'data'],
    func: async (page, args) => {
        if (!args.feature) return FEATURES.map((f) => ({ feature: f.key, target: f.area, data: f.route }));
        const f = FEATURES.find((x) => x.key === args.feature);
        if (!f || f.scope === 'special') throw new ArgumentError(`Unbekannt: ${args.feature}. Gültig: ${FEATURES.filter((x) => x.url).map((x) => x.key).join(', ')}`);
        await ensureGeorge(page);
        if (f.scope === 'global') return [{ feature: f.key, target: 'all', data: await gget(page, f.url()) }];
        const ids = f.scope === 'card'
            ? listOf(await gget(page, `${NB}/cards?size=500`)).map((c) => [c.id, c.productI18N || c.id])
            : (await getAccounts(page)).map((a) => [a.id, a._label]);
        const out = [];
        for (const [id, label] of ids) out.push({ feature: f.key, target: label, data: await gget(page, f.url(id)) });
        return out;
    },
});

export const featuresCommand = cli({
    ...base,
    name: 'features',
    description: 'Feature-Karte: jede George-Funktion → Route → API → opencli-Befehl',
    browser: false,
    args: [],
    columns: ['feature', 'area', 'georgeRoute', 'api', 'command'],
    func: async () => FEATURES.map((f) => ({
        feature: f.key, area: f.area, georgeRoute: f.route,
        api: f.url ? f.url('{id}').replace(/^https:\/\//, '').split('?')[0] : 'proxy/g/api/my/transactions (paged)',
        command: `opencli sparkasse ${f.command || `raw ${f.key}`}`,
    })),
});

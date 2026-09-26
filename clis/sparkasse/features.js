// Feature map: every George (Sparkasse AT) area → live API → opencli command.
// Mapped from a live read-only crawl of 90 George routes + the 572 web-app chunks (2026-09-26).
import { NB, G, GGW, SAM, MSG, CARDS } from './utils.js';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => today().slice(0, 8) + '01';

// scope: 'global' = one call, 'account' = per account id, 'card' = per card id
export const FEATURES = [
    { key: 'accounts', area: 'Konten', route: '#/overview', scope: 'global', url: () => `${NB}/accounts?size=500`, command: 'accounts' },
    { key: 'accounts-g', area: 'Konten (George-Ansicht)', route: '#/overview', scope: 'global', url: () => `${G}/accounts` },
    { key: 'transactions', area: 'Kontohistorie / Buchungen', route: '#/currentAccount/{id}/transactions', scope: 'special', command: 'transactions' },
    { key: 'reservations', area: 'Vorgemerkte Umsätze', route: '#/currentAccount/{id}', scope: 'account', url: (id) => `${GGW}/reservation/public/reservation?productId=${id}&aggregations=SUM%2CCOUNT&size=999` },
    { key: 'statements', area: 'Kontoauszüge (Liste + PDF)', route: '#/currentAccount/{id}/statements', scope: 'account', url: (id) => `${NB}/accounts/${id}/statements?size=500`, command: 'statements' },
    { key: 'statement-delivery', area: 'Auszugs-Zustellung', route: '#/currentAccount/{id}/statements', scope: 'account', url: (id) => `${NB}/accounts/${id}/statements/delivery/definitions` },
    { key: 'standing-orders', area: 'Daueraufträge', route: '#/standing-orders/{id}', scope: 'account', url: (id) => `${NB}/accounts/${id}/standingorders?size=500`, command: 'raw standing-orders' },
    { key: 'sepa-mandates', area: 'SEPA-Mandate / Lastschriften', route: '#/currentAccount/{id}/sepamandates', scope: 'account', url: (id) => `${NB}/accounts/${id}/sepadirectdebits?size=500&page=0`, command: 'raw sepa-mandates' },
    { key: 'orders-finished', area: 'Zahlungsaufträge (abgeschlossen)', route: '#/orders', scope: 'global', url: () => `${NB}/orders/payments?page=0&size=1000&stateGroup=finished`, command: 'orders' },
    { key: 'orders-active', area: 'Zahlungsaufträge (offen/terminiert)', route: '#/orders', scope: 'global', url: () => `${NB}/orders/payments?page=0&size=1000&stateGroup=active`, command: 'orders --state active' },
    { key: 'payment-limits', area: 'Überweisungslimits', route: '#/orders', scope: 'global', url: () => `${NB}/orders/payments/limits` },
    { key: 'cards', area: 'Karten', route: '#/currentAccount/{id}/cards', scope: 'global', url: () => `${NB}/cards?size=500`, command: 'cards' },
    { key: 'card-details', area: 'Kartendetails', route: '#/currentAccount/{id}/cards/{card}', scope: 'card', url: (id) => `${NB}/cards/${id}?featureSet=ALL` },
    { key: 'card-limits', area: 'Kartenlimits', route: '#/currentAccount/{id}/cards/{card}', scope: 'card', url: (id) => `${CARDS}/${id}/card-limits` },
    { key: 'card-trackings', area: 'Karten-Versand/Status', route: '#/currentAccount/{id}/cards/{card}', scope: 'card', url: (id) => `${NB}/cards/${id}/trackings` },
    { key: 'documents', area: 'Dokumente & Anträge (Postfach, signierte PDFs)', route: '#/documents-and-requests', scope: 'global', url: () => `${SAM}?size=500`, command: 'documents' },
    { key: 'bank-messages', area: 'Bankmitteilungen', route: '#/contact/overview/general-messages', scope: 'global', url: () => `${NB}/messages?size=500&page=0`, command: 'raw bank-messages' },
    { key: 'notifications', area: 'Benachrichtigungen', route: '#/contact/overview/notifications', scope: 'global', url: () => `${NB}/watchdogs/notifications?size=500&page=0` },
    { key: 'watchdogs', area: 'Benachrichtigungs-Regeln (Watchdogs)', route: '#/settings/watchdogs', scope: 'global', url: () => `${NB}/watchdogs` },
    { key: 'messenger-personal', area: 'Nachrichten an Berater', route: '#/messenger', scope: 'global', url: () => `${MSG}/threads?size=500&page=0&searchString=&type=personal` },
    { key: 'messenger-chat', area: 'Support-Chats', route: '#/support-chat-conversations', scope: 'global', url: () => `${MSG}/threads?size=500&page=0&searchString=&type=chat` },
    { key: 'budgets', area: 'Budgets (Finanz-Helfer)', route: '#/fh/budgets', scope: 'global', url: () => `${G}/fh/budgets?withRemaining=true`, command: 'raw budgets' },
    { key: 'spendings', area: 'Ausgaben nach Kategorie (akt. Monat)', route: '#/fh/spendings', scope: 'global', url: () => `${G}/fh/calculations/spending?from=${monthStart()}&to=${today()}`, command: 'spendings' },
    { key: 'cashflow', area: 'Cashflow pro Monat', route: '#/fh/cashflow', scope: 'global', url: () => `${G}/fh/cashflow?interval=MONTH`, command: 'raw cashflow' },
    { key: 'hashtags', area: 'Hashtags', route: '#/fh/hashtags', scope: 'global', url: () => `${G}/tags/amounts`, command: 'raw hashtags' },
    { key: 'fh-settings', area: 'Finanz-Helfer Einstellungen', route: '#/fh/settings', scope: 'global', url: () => `${G}/fh/settings` },
    { key: 'addressbook', area: 'Kontakte & Vorlagen', route: '#/addressbook', scope: 'global', url: () => `${G}/addressbook?page=0&pageSize=500&type=CONTACT&type=TRANSFER&type=DIRECT_DEBIT`, command: 'raw addressbook' },
    { key: 'contacts', area: 'Empfänger (netbanking)', route: '#/addressbook', scope: 'global', url: () => `${NB}/contacts` },
    { key: 'profile', area: 'Profil', route: '#/settings/user', scope: 'global', url: () => `${NB}/profile`, command: 'raw profile' },
    { key: 'personal-info', area: 'Persönliche Daten', route: '#/settings/about-you', scope: 'global', url: () => `${NB}/profile/personalinfo` },
    { key: 'plugins', area: 'Plug-ins', route: '#/settings/plugins', scope: 'global', url: () => `${NB}/plugins` },
    { key: 'multibanking', area: 'Multi Banking (Fremdbanken)', route: '#/multibanking/connections', scope: 'global', url: () => `${G}/external-banks/connections` },
    { key: 'donations', area: 'Spenden', route: '#/currentAccount/{id}/donations', scope: 'global', url: () => `${GGW}/address-book/public/donations?size=500` },
    { key: 'securities', area: 'Wertpapiere / Depot', route: '#/securityaccount', scope: 'global', url: () => `${NB}/securities` },
    { key: 'price-alerts', area: 'Kursalarme', route: '#/investments/price-alerts', scope: 'global', url: () => `${GGW}/investment/public/price-alerts?platform=WEB` },
    { key: 'pensions', area: 'Pensionsvorsorge', route: '#/pension', scope: 'global', url: () => `${NB}/pensions` },
    { key: 'insurances', area: 'Versicherungen', route: '#/insurance', scope: 'global', url: () => `${NB}/contracts/insurances` },
    { key: 'buildings', area: 'Bausparen', route: '#/building', scope: 'global', url: () => `${NB}/contracts/buildings` },
    { key: 'leasings', area: 'Leasing', route: '#/leasing', scope: 'global', url: () => `${NB}/contracts/leasings` },
    { key: 'instant-cash', area: 'Sofortkredit-Angebot', route: '#/overview', scope: 'global', url: () => `${NB}/instant-cash` },
    { key: 'datacarriers', area: 'Daten-Import (Sammelaufträge)', route: '#/datacarrier/orders', scope: 'global', url: () => `${NB}/orders/datacarriers?order=desc&size=2000&sort=uploadedDate` },
];

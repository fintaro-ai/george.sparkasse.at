| Funktion | Bereich | George-Route | API | Befehl |
|---|---|---|---|---|
| accounts | Konten | `#/overview` | `api.sparkasse.at/rest/netbanking/my/accounts` | `opencli sparkasse accounts` |
| accounts-g | Konten (George-Ansicht) | `#/overview` | `api.sparkasse.at/proxy/g/api/my/accounts` | `opencli sparkasse raw accounts-g` |
| transactions | Kontohistorie / Buchungen | `#/currentAccount/{id}/transactions` | `proxy/g/api/my/transactions (paged)` | `opencli sparkasse transactions` |
| reservations | Vorgemerkte Umsätze | `#/currentAccount/{id}` | `api.sparkasse.at/proxy/ggw/reservation/public/reservation` | `opencli sparkasse raw reservations` |
| statements | Kontoauszüge (Liste + PDF) | `#/currentAccount/{id}/statements` | `api.sparkasse.at/rest/netbanking/my/accounts/{id}/statements` | `opencli sparkasse statements` |
| statement-delivery | Auszugs-Zustellung | `#/currentAccount/{id}/statements` | `api.sparkasse.at/rest/netbanking/my/accounts/{id}/statements/delivery/definitions` | `opencli sparkasse raw statement-delivery` |
| standing-orders | Daueraufträge | `#/standing-orders/{id}` | `api.sparkasse.at/rest/netbanking/my/accounts/{id}/standingorders` | `opencli sparkasse raw standing-orders` |
| sepa-mandates | SEPA-Mandate / Lastschriften | `#/currentAccount/{id}/sepamandates` | `api.sparkasse.at/rest/netbanking/my/accounts/{id}/sepadirectdebits` | `opencli sparkasse raw sepa-mandates` |
| orders-finished | Zahlungsaufträge (abgeschlossen) | `#/orders` | `api.sparkasse.at/rest/netbanking/my/orders/payments` | `opencli sparkasse orders` |
| orders-active | Zahlungsaufträge (offen/terminiert) | `#/orders` | `api.sparkasse.at/rest/netbanking/my/orders/payments` | `opencli sparkasse orders --state active` |
| payment-limits | Überweisungslimits | `#/orders` | `api.sparkasse.at/rest/netbanking/my/orders/payments/limits` | `opencli sparkasse raw payment-limits` |
| cards | Karten | `#/currentAccount/{id}/cards` | `api.sparkasse.at/rest/netbanking/my/cards` | `opencli sparkasse cards` |
| card-details | Kartendetails | `#/currentAccount/{id}/cards/{card}` | `api.sparkasse.at/rest/netbanking/my/cards/{id}` | `opencli sparkasse raw card-details` |
| card-limits | Kartenlimits | `#/currentAccount/{id}/cards/{card}` | `cards-api.sparkasse.at/rest/netbanking/my/cards/{id}/card-limits` | `opencli sparkasse raw card-limits` |
| card-trackings | Karten-Versand/Status | `#/currentAccount/{id}/cards/{card}` | `api.sparkasse.at/rest/netbanking/my/cards/{id}/trackings` | `opencli sparkasse raw card-trackings` |
| documents | Dokumente & Anträge (Postfach, signierte PDFs) | `#/documents-and-requests` | `sam.sparkasse.at/netbanking/my/electronicstorage/cases` | `opencli sparkasse documents` |
| bank-messages | Bankmitteilungen | `#/contact/overview/general-messages` | `api.sparkasse.at/rest/netbanking/my/messages` | `opencli sparkasse raw bank-messages` |
| notifications | Benachrichtigungen | `#/contact/overview/notifications` | `api.sparkasse.at/rest/netbanking/my/watchdogs/notifications` | `opencli sparkasse raw notifications` |
| watchdogs | Benachrichtigungs-Regeln (Watchdogs) | `#/settings/watchdogs` | `api.sparkasse.at/rest/netbanking/my/watchdogs` | `opencli sparkasse raw watchdogs` |
| messenger-personal | Nachrichten an Berater | `#/messenger` | `messaging.sparkasse.at/my/messenger/threads` | `opencli sparkasse raw messenger-personal` |
| messenger-chat | Support-Chats | `#/support-chat-conversations` | `messaging.sparkasse.at/my/messenger/threads` | `opencli sparkasse raw messenger-chat` |
| budgets | Budgets (Finanz-Helfer) | `#/fh/budgets` | `api.sparkasse.at/proxy/g/api/my/fh/budgets` | `opencli sparkasse raw budgets` |
| spendings | Ausgaben nach Kategorie (akt. Monat) | `#/fh/spendings` | `api.sparkasse.at/proxy/g/api/my/fh/calculations/spending` | `opencli sparkasse spendings` |
| cashflow | Cashflow pro Monat | `#/fh/cashflow` | `api.sparkasse.at/proxy/g/api/my/fh/cashflow` | `opencli sparkasse raw cashflow` |
| hashtags | Hashtags | `#/fh/hashtags` | `api.sparkasse.at/proxy/g/api/my/tags/amounts` | `opencli sparkasse raw hashtags` |
| fh-settings | Finanz-Helfer Einstellungen | `#/fh/settings` | `api.sparkasse.at/proxy/g/api/my/fh/settings` | `opencli sparkasse raw fh-settings` |
| addressbook | Kontakte & Vorlagen | `#/addressbook` | `api.sparkasse.at/proxy/g/api/my/addressbook` | `opencli sparkasse raw addressbook` |
| contacts | Empfänger (netbanking) | `#/addressbook` | `api.sparkasse.at/rest/netbanking/my/contacts` | `opencli sparkasse raw contacts` |
| profile | Profil | `#/settings/user` | `api.sparkasse.at/rest/netbanking/my/profile` | `opencli sparkasse raw profile` |
| personal-info | Persönliche Daten | `#/settings/about-you` | `api.sparkasse.at/rest/netbanking/my/profile/personalinfo` | `opencli sparkasse raw personal-info` |
| plugins | Plug-ins | `#/settings/plugins` | `api.sparkasse.at/rest/netbanking/my/plugins` | `opencli sparkasse raw plugins` |
| multibanking | Multi Banking (Fremdbanken) | `#/multibanking/connections` | `api.sparkasse.at/proxy/g/api/my/external-banks/connections` | `opencli sparkasse raw multibanking` |
| donations | Spenden | `#/currentAccount/{id}/donations` | `api.sparkasse.at/proxy/ggw/address-book/public/donations` | `opencli sparkasse raw donations` |
| securities | Wertpapiere / Depot | `#/securityaccount` | `api.sparkasse.at/rest/netbanking/my/securities` | `opencli sparkasse raw securities` |
| price-alerts | Kursalarme | `#/investments/price-alerts` | `api.sparkasse.at/proxy/ggw/investment/public/price-alerts` | `opencli sparkasse raw price-alerts` |
| pensions | Pensionsvorsorge | `#/pension` | `api.sparkasse.at/rest/netbanking/my/pensions` | `opencli sparkasse raw pensions` |
| insurances | Versicherungen | `#/insurance` | `api.sparkasse.at/rest/netbanking/my/contracts/insurances` | `opencli sparkasse raw insurances` |
| buildings | Bausparen | `#/building` | `api.sparkasse.at/rest/netbanking/my/contracts/buildings` | `opencli sparkasse raw buildings` |
| leasings | Leasing | `#/leasing` | `api.sparkasse.at/rest/netbanking/my/contracts/leasings` | `opencli sparkasse raw leasings` |
| instant-cash | Sofortkredit-Angebot | `#/overview` | `api.sparkasse.at/rest/netbanking/my/instant-cash` | `opencli sparkasse raw instant-cash` |
| datacarriers | Daten-Import (Sammelaufträge) | `#/datacarrier/orders` | `api.sparkasse.at/rest/netbanking/my/orders/datacarriers` | `opencli sparkasse raw datacarriers` |

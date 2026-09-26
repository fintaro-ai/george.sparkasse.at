# george.sparkasse.at — opencli-Adapter

🏦 Liest **George** (Sparkasse / Erste Bank Österreich) aus und macht daraus die Kommandozeile `opencli sparkasse …`.
Der Adapter **liest nur**: keine Überweisungen, keine Signaturen, keine Einstellungen.

## ⚡ Schnellstart

```bash
# 1. Adapter installieren
mkdir -p ~/.opencli/clis && cp -r clis/sparkasse ~/.opencli/clis/

# 2. Im Browser mit der opencli-Erweiterung einmal bei George einloggen (s Identity)

# 3. Alles sichern
opencli sparkasse export                 # → ~/Documents/Sparkasse-Export/<heute>/
```

## 🧰 Befehle

| Befehl | Was |
|---|---|
| `opencli sparkasse export` | Komplett-Backup: Buchungen (CSV + JSON), Kontoauszüge (PDF), Postfach-Dokumente (PDF), jede Funktion als JSON, `UEBERSICHT.md`, `FEATURES.md` |
| `opencli sparkasse accounts` | Konten, IBAN, Saldo |
| `opencli sparkasse transactions --from 2025-01-01 --account giro` | Buchungen (alle Seiten) |
| `opencli sparkasse statements` | Liste der Kontoauszüge |
| `opencli sparkasse documents` | Postfach „Dokumente & Anträge“ |
| `opencli sparkasse orders [--state active]` | Zahlungsaufträge |
| `opencli sparkasse spendings --from … --to …` | Ausgaben nach Kategorie |
| `opencli sparkasse cards` | Karten |
| `opencli sparkasse raw <feature>` | Rohdaten jeder Funktion (ohne Argument: Liste) |
| `opencli sparkasse features` | Feature-Karte, siehe [FEATURES.md](FEATURES.md) |

Alle Befehle können `-f json|csv|yaml|table` ausgeben.

## 🔐 So funktioniert es

- George hält das OAuth-Bearer-Token **nur im Speicher der Seite**. Der Adapter öffnet George im eingeloggten Browserprofil (neue Tabs meldet SSO automatisch an), hängt sich an `fetch`/`XHR` und merkt sich den `Authorization`-Header.
- Alle Aufrufe laufen **aus der Seite heraus**, also mit gleicher Herkunft und ohne Cookie-Export.
- Das Token wird nie ausgegeben und nie gespeichert.
- Exportdateien bekommen die Rechte `0600`, Ordner `0700`.

## 🗺️ Feature-Karte

Erstellt am 2026-09-26 durch einen Live-Durchlauf (nur lesend) über 90 George-Seiten und durch Auswertung der 572 Web-App-Chunks. Alle **42 Funktionen** mit Route, API und Befehl stehen in [FEATURES.md](FEATURES.md).

Wichtige, schlecht dokumentierte Aufrufe:
- Kontoauszug-PDF: `POST rest/netbanking/my/accounts/{id}/statements/signed/download?format=PDF_A4&statementId={sid}`. Die Parameter gehören in die **Query**; stehen sie im Body, kommt `NO_STATEMENT_SELECTED`.
- Postfach-Datei: `GET sam.sparkasse.at/netbanking/my/electronicstorage/cases/{case}/documents/{doc}/download`, nur mit `Accept: */*`.
- `orders/payments` antwortet mit 406 auf `Accept: application/json`. Der Adapter fragt dann mit `*/*` nach.

## ⚠️ Grenzen

- Die Buchungshistorie reicht so weit zurück, wie George sie anbietet (hier ab 2023). Ältere Jahre stehen in den Auszugs-PDFs.
- Den ersten Login macht immer ein Mensch. Es werden keine Zugangsdaten gespeichert.
- Inoffizielle Web-APIs: Wenn George etwas umbaut, zuerst `opencli sparkasse features` und `raw` prüfen.

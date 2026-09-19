# TradingView MCP — Repository-Regeln

## Zweck und Einstieg

JavaScript-ESM-Brücke für Chartanalyse, Pine-Entwicklung und Desktop-Steuerung:
MCP-Client → stdio → `src/server.js` → `src/tools/*.js` → `src/core/*.js`
→ `src/connection.js` → CDP → TradingView Desktop (Electron).
Die CLI nutzt dieselbe Core-Schicht, ohne MCP-Transport.

| Pfad | Verantwortung |
|---|---|
| `src/server.js` | MCP-Server, Registrierung aller Tool-Gruppen, stdio-Start |
| `src/tools/` | Zod-Eingabeschemas und dünne MCP-Adapter; `_format.js`: `jsonResult` |
| `src/core/` | Implementierungen; `index.js`: öffentliche Exporte für `tradingview-mcp/core` |
| `src/connection.js`, `src/wait.js` | CDP-Verbindung, API-Pfade, sichere Interpolation, Zustands-/Render-Warten |
| `src/cli/index.js`, `src/cli/router.js`, `src/cli/commands/` | CLI-Einstieg, `node:util`-Argumentparser, Befehlsadapter |
| `tests/`, `.github/workflows/ci.yml`, `eslint.config.mjs` | Node-Test-Runner, CI und Lint-Regeln |
| `skills/*/SKILL.md`, `agents/performance-analyst.md` | Workflow-Beschreibungen, keine Servermodule |
| `scripts/`, `verify_connection.js` | Desktop-Launcher, Pine-Pull/Push, Verbindungsdiagnose |

Vor Änderungen `package.json`, `CONTRIBUTING.md`, betroffene Implementierung und
Tests lesen; `README.md`, `SETUP_GUIDE.md`, `SECURITY.md` ergänzen den Kontext.
Für einen MCP-Client lautet der Prozess `node` mit dem absoluten Pfad zu
`src/server.js` als Argument. Client-Konfiguration gezielt ergänzen, keine fremden
Einträge überschreiben; Claude-Konfigurationspfade und Neustart-Anweisungen sind
keine Codex-Voraussetzung.

## Installation, Entwicklung und Checks

Alle Befehle im Repository-Root. README nennt Node 18+; CI prüft Node 20 und 22.
`package.json` enthält kein `engines`-Feld. Für CI-Parität eine CI-Version verwenden.

| Befehl | Zweck / Voraussetzung |
|---|---|
| `npm ci` | Reproduzierbare Installation aus `package-lock.json`, auch in CI |
| `npm install` | Dokumentierter Erstinstallationsweg; Lockfile-Änderungen prüfen |
| `npm start` | MCP-Server direkt aus JavaScript starten |
| `npm run tv -- --help` | CLI ohne globale Installation; alternativ `node src/cli/index.js --help` |
| `npm run tv -- status` | CDP-/Chartzustand prüfen |
| `npm run lint` | ESLint auf `src/` |
| `npm run test:unit` | Acht Testdateien ohne Desktop, aber mit Pine-Compiler-Netzwerkzugriff |
| `npm run test:cli` | CLI-Routing, Analyse und Netzwerk-Compile |
| `npm test` | E2E plus Pine-Analyse/Compile; nicht die gesamte Unit-Suite |
| `npm run test:e2e` | Live-Desktop-Suite |
| `npm run test:all` | Alle neun im Script aufgelisteten Testdateien |
| `npm run test:verbose` | Wie `npm test`, Spec-Reporter |
| `npm run test:count` | E2E-Ausgabe durch `tail -5`; kein verlässliches Erfolgsgate |
| `npm audit --audit-level=high` | CI führt diesen Check nicht-blockierend aus |

Es gibt **kein Build-, Dev-/Watch-, Format- oder Typecheck-Script**. Keines erfinden;
kein Build-Artefakt nötig. Vor Abschluss mindestens Lint und Unit-Tests ausführen,
bei Runtime-Änderungen gezielt Live-Verhalten prüfen. Fehler, Warnungen und
übersprungene Checks mit tatsächlicher Ausgabe berichten.

## Tool-Verträge und Änderungen

- Tool-Namen, Parameter, Optionalität, Defaults, Rückgabefelder und Fehlersignale
  sind Schnittstellen für MCP-Clients, CLI und Workflows. Bestehende Aufrufe erhalten;
  neue Parameter nach Möglichkeit optional. Breaking Changes ausdrücklich benennen.
- Schemas in `src/tools/` definieren, Verarbeitung in `src/core/` halten; betroffene
  CLI-Adapter, Registrierung in `src/server.js` und öffentliche Exporte mitprüfen.
  Zod wird aus `zod` importiert, derzeit über die SDK-Abhängigkeit installiert.
  Manche Objektparameter (`inputs`, `overrides`) sind absichtlich JSON-Strings;
  vorhandene `z.coerce.*`-Semantik nicht still ändern.
- `jsonResult` liefert MCP-`content` mit JSON-Text. Geworfene Fehler werden typischerweise
  `{ success: false, error: err.message }` plus `isError: true`; der Core liefert
  teilweise selbst Fehlerobjekte. Beide Pfade prüfen, nicht nur Exceptions.
- Strings in CDP-Ausdrücken über `safeString`/`JSON.stringify` als JS-Literale
  einsetzen; numerische Eingaben mit `requireFinite` validieren. Keine rohe
  Stringinterpolation aus Tool-Eingaben. `ui_evaluate` ist ausdrücklich Code-Ausführung.
- Vorhandenes `_deps`/`_resolve(_deps)`-Muster für isolierte Core-Tests wiederverwenden.
  Neue Testdateien in den expliziten `package.json`-Listen berücksichtigen.
- Bei Tool-Änderungen Beispiele in README, Server-Instructions, `CLAUDE.md`,
  betroffenen `skills/` und `agents/` auf Namen, Parameter und Nebenwirkungen prüfen.
  Skill-Frontmatter (`name`, `description`) erhalten. `model: sonnet` und `tools: ["*"]`
  im Agenten sind Claude-Metadaten, keine Codex-Modellwahl oder Berechtigung.
  Keine automatische Installation oder Agentenregistrierung voraussetzen.

## Sicherheit und praktische Fallstricke

- CDP bleibt lokal: Default `127.0.0.1:9222`; `TV_CDP_HOST`/`TV_CDP_PORT` haben Vorrang
  vor `CDP_HOST`/`CDP_PORT`. Port nicht öffentlich exponieren. Interne TradingView-APIs
  sind undokumentiert; Änderungen anhand realer API-Verfügbarkeit verifizieren.
- MCP-stdout ist ausschließlich Protokoll; Diagnose nach stderr. CLI-Daten sind JSON,
  Streams JSONL auf stdout. Keine Tokens, Cookies, private Pine-Skripte oder persönliche
  Konfiguration in Logs, Fixtures oder versionierte Dateien aufnehmen.
  `.gitignore` ignoriert u. a. `screenshots/`, `rules.json`, `scripts/current.pine`,
  aber **nicht** pauschal `.env` oder `.mcp.json`: Ignorierung vor Ablage prüfen.
  Ein committetes Secret muss rotiert werden.
- CONTRIBUTING begrenzt neue Funktionen auf die Desktop-Brücke: keine Auth-/Paywall-
  Umgehung, Marktdaten-Datenbanken/Redistribution oder automatisierte echte Orders.
  Private Handelskonfigurationen und Strategien gehören nicht in dieses Repository.
- E2E hardcodiert `localhost:9222`, ignoriert die CDP-Umgebungsvariablen und beendet
  sich ohne Verbindung mit Exit 1. **Nur in einer entbehrlichen Testsitzung ausführen**:
  Tests löschen Zeichnungen, ändern Charts und überschreiben Pine-Editor-Inhalte.
  Launcher können laufendes TradingView beenden; nicht als beiläufigen Check starten.
- `test:count` maskiert Fehler durch den Exitcode von `tail`; Ausgabe kontrollieren.
  Die E2E-Suite prüft vielfach eigene CDP-Ausdrücke statt echter MCP-Handler;
  `pine_analyze.test.js` enthält eine kopierte Analysefunktion. Grün belegt nicht
  automatisch den Produktpfad. Windows-Launch-Verhalten zusätzlich auf Windows prüfen.
- Erst `chart_get_state` für aktuelle Entity-IDs lesen; IDs nicht über Sitzungen
  hinweg speichern. Pine-Grafikdaten benötigen sichtbare Indikatoren. Für aktuelle
  Werte `data_get_study_values`, bei bekannten Studien `study_filter` nutzen.
  OHLCV bevorzugt mit `summary: true` (max. 500 Bars), Trades max. 20,
  Labels standardmäßig 50 pro Studie. Große Quellen/raw-Ausgaben nur gezielt lesen.
- Strategie-Datenzugriffe können Panels öffnen und versteckte Strategien einblenden;
  Quotes für andere Symbole schalten den Chart vorübergehend um. Screenshots per CDP
  schreiben nach `screenshots/` und liefern einen Pfad; `method: api` kann nur die
  TradingView-eigene Screenshot-UI auslösen. Erfolg am Ergebnis prüfen.

## Verifizierte Dokumentationsabweichungen

Stand 2026-09-20, Basis `c05b8f5`: MCP-`tools/list` liefert **84** Tools.
`CLAUDE.md`, Server-Instructions und die README-Architektur nennen inzwischen 84;
die README-Überschrift „Tool Reference (78 MCP tools)“ ist noch widersprüchlich.
README-Testzahlen nicht übernehmen.
Die Behauptung „nur lokal/keine Serververbindungen“ ist keine Bestandsbeschreibung:
`src/core/pine.js` sendet bei `check` Quelltext direkt an den Pine-Compiler;
`open`/`listScripts` verwenden authentifizierte Browser-Fetches. Auch `test:unit`
und `test:cli` sind deshalb nicht offline. Diese bestehenden Ausnahmen sind keine
Erlaubnis, den in CONTRIBUTING definierten Umfang um weitere Direktzugriffe zu erweitern.
`verbose` existiert bei Pine-Linien, -Labels und -Boxen, nicht bei -Tabellen;
keine pauschalen Tool-Annahmen aus `CLAUDE.md` übernehmen.

## Git und übergeordnete Regeln

- Dieses Verzeichnis ist ein eigenes Git-Repository. Vor Arbeit Status, Branch und
  Worktrees prüfen; Änderungen anderer bewahren. Feature-Arbeit in isolierten
  Worktrees, Haupt-Checkouts auf `main`. Nicht ohne Auftrag committen oder pushen;
  Conventional-Commit-Message vorschlagen. Kein ungezieltes `git stash`/`pop`.
- Vor neuem Code: Notwendigkeit → vorhandener Code → Standardbibliothek → Plattform
  → vorhandene Dependency → minimale Umsetzung. Vorher betroffene Dateien nennen.
- Bugfix: ganze Fehlerklasse suchen; Annahmen durch Tests sichern; den falschen
  Nutzeroutput tatsächlich beseitigen. Automationen prüfen ihren Effekt, nicht nur
  Exitcodes. Vor PRs bestehende PRs auf Überschneidungen prüfen.
- Vor Merge `gh pr checks <n>` selbst grün sehen; danach Branch und Worktree aufräumen.
  Keine destruktiven Aktionen ohne Auftrag. Secrets nie in Commit-/PR-Texten.
- Im lokalen Dachprojekt gelten `/Users/leo/Desktop/Py/AGENTS.md` und die zentralen
  Wiki-/Ticket-Regeln: `wiki/index.md`, letzte drei Log-Einträge und relevante Seiten
  lesen; `wiki/log.md` und `TODO.md` nie vollständig laden. Nach relevanten Änderungen
  Ticket samt Fortschrittstabelle, Wiki-Log und Index-Header synchron halten.
  In separaten Worktrees zentrale Pfade ausdrücklich auflösen, nicht `../wiki` vermuten.
  `~/.codex/skills/` ist generiert; dort keine Quellen bearbeiten.

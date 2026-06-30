# DugganUSA Slack Bot

**Paste an IP. Get threat intel. 1.5M+ IOCs in your Slack channel.**

## What's New (v1.2.1)

- **Four live, no-auth validation endpoints** now prove feed quality, and you can cite them straight from your channel:
  - **Novelty** — [feed-uniqueness](https://analytics.dugganusa.com/api/v1/feed-uniqueness): ~75%+ of what we publish ThreatFox doesn't have (measured live, durable across deploys).
  - **Timeliness** — [kev-lead](https://analytics.dugganusa.com/api/v1/kev-lead): a live ledger of how far ahead of CISA KEV we flagged each exploited CVE — positive leads, same-day, and no-receipt all shown honestly, with receipts.
  - **Accuracy** — [spamhaus-validation](https://analytics.dugganusa.com/api/v1/spamhaus-validation): Spamhaus independently corroborates our first-hand contributions.
  - **Liveness** — [feed-efficacy](https://analytics.dugganusa.com/api/v1/feed-efficacy): opt-in consumer reports of when our indicators actually fire on real traffic — proof the feed is operationally live, not just large.
- **Supply-chain coverage** — the corpus now ingests OSV malicious-package feeds for **both npm and PyPI** (named-malicious packages, zero-heuristic), plus daily GitHub Hunt detections of malware-staging repos. Paste a package name or repo URL into `/dugganusa scan` and known-bad packages light up too.
- **STIX feed is now API-key-enforced** — see Setup. The free tier is a free *registered* key, not anonymous.

## Commands

```
/dugganusa 185.39.19.176          → single IOC lookup
/dugganusa scan <paste text>      → extract + check all IOCs in pasted text
/dugganusa aipm google.com        → AIPM audit link
/dugganusa help                   → usage
```

Also responds to @mentions: `@DugganUSA what about 185.39.19.176?`

## Setup

### 1. Create Slack App

Visit [api.slack.com/apps](https://api.slack.com/apps) → Create New App → From Scratch.

### 2. Configure

**Bot Token Scopes** (OAuth & Permissions):
- `chat:write`
- `commands`
- `app_mentions:read`

**Slash Commands:**
- Command: `/dugganusa`
- Request URL: `https://your-server.com/slack/events`
- Description: "Look up threat indicators against 1.5M+ IOCs"

**Event Subscriptions:**
- Request URL: `https://your-server.com/slack/events`
- Subscribe to bot events: `app_mention`

### 3. Deploy

```bash
git clone https://github.com/pduggusa/dugganusa-slack.git
cd dugganusa-slack
npm install

# Set environment variables
export SLACK_BOT_TOKEN=xoxb-your-token
export SLACK_SIGNING_SECRET=your-signing-secret
export DUGGANUSA_API_KEY=dugusa_your_key  # required — register a free key (see below)

npm start
```

The STIX feed is API-key-enforced: anonymous requests get `401`, an unregistered Bearer gets `429`. Grab a **free registered key** at [analytics.dugganusa.com/stix/register](https://analytics.dugganusa.com/stix/register) and set it as `DUGGANUSA_API_KEY`.

For Socket Mode (no public URL needed):
```bash
export SLACK_APP_TOKEN=xapp-your-app-token
npm start
```

### 4. Install to Workspace

OAuth & Permissions → Install to Workspace → Authorize.

## What It Does

- Extracts IOCs (IPs, domains, SHA256, CVEs) from any text
- Correlates each against 1.5M+ indicators across 65 indexes (~38M+ documents)
- Returns enrichment: malware family, threat type, source, hit count
- Links to full correlation view
- Powered by the same STIX feed trusted by 275+ consumers in 46 countries

## Part of the DugganUSA Ecosystem

- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=DugganUSALLC.dugganusa-threat-intel)
- [CLI Tool](https://github.com/pduggusa/dugganusa-cli) — `npx dugganusa-cli`
- [GitHub Action](https://github.com/pduggusa/dugganusa-action)
- [Chrome Extension](https://github.com/pduggusa/dugganusa-chrome)
- [STIX Feed](https://analytics.dugganusa.com/api/v1/stix-feed)
- [AIPM](https://aipmsec.com)
- [dugganusa.com](https://www.dugganusa.com)

## License

MIT — [DugganUSA LLC](https://www.dugganusa.com)

---

<!-- DUGGANUSA-FAMILY-FOOTER-V1 -->
## DugganUSA Defender Family

Same threat corpus, surfaced wherever you live. Open source, MIT licensed, receipts on every repo.

| Plugin | Surface |
|---|---|
| [dugganusa-scanner-core](https://github.com/pduggusa/dugganusa-scanner-core) | Core IOC scanning engine |
| [dugganusa-vscode](https://github.com/pduggusa/dugganusa-vscode) | VS Code extension |
| [dugganusa-splunk](https://github.com/pduggusa/dugganusa-splunk) | Splunk Technology Add-on |
| **dugganusa-slack** _(this repo)_ | Slack bot |
| [dugganusa-raycast](https://github.com/pduggusa/dugganusa-raycast) | Raycast extension |
| [dugganusa-sentinel](https://github.com/pduggusa/dugganusa-sentinel) | Microsoft Sentinel TAXII connector |
| [dugganusa-obsidian](https://github.com/pduggusa/dugganusa-obsidian) | Obsidian plugin |
| [dugganusa-nvim](https://github.com/pduggusa/dugganusa-nvim) | Neovim plugin |
| [dugganusa-elastic](https://github.com/pduggusa/dugganusa-elastic) | Elastic / OpenSearch integration |
| [dugganusa-edge-shield](https://github.com/pduggusa/dugganusa-edge-shield) | Cloudflare Worker |
| [dugganusa-cli](https://github.com/pduggusa/dugganusa-cli) | CLI scanner |
| [dugganusa-chrome](https://github.com/pduggusa/dugganusa-chrome) | Chrome extension |
| [dugganusa-action](https://github.com/pduggusa/dugganusa-action) | GitHub Action |
| [dredd-mcp](https://github.com/pduggusa/dredd-mcp) | Pre-flight MCP security (this repo) |

Backed by the live DugganUSA threat intel platform: [analytics.dugganusa.com](https://analytics.dugganusa.com).

_Jeevesus saves. Dredd judges._

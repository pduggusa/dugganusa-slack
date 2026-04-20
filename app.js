#!/usr/bin/env node
/**
 * DugganUSA Slack Bot — threat intel enrichment in any channel.
 *
 * Slash commands:
 *   /dugganusa 185.39.19.176       → single IOC lookup
 *   /dugganusa scan <paste text>   → extract + check all IOCs in text
 *   /dugganusa aipm google.com     → AIPM audit URL
 *   /dugganusa help                → usage
 *
 * Also responds to @mentions with IOC extraction.
 *
 * Environment variables:
 *   SLACK_BOT_TOKEN       — xoxb-... Bot User OAuth Token
 *   SLACK_SIGNING_SECRET  — Slack app signing secret
 *   SLACK_APP_TOKEN       — xapp-... for Socket Mode (optional)
 *   DUGGANUSA_API_KEY     — DugganUSA API key (optional, free tier works)
 */

const { App } = require('@slack/bolt');
const https = require('https');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: !!process.env.SLACK_APP_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN || undefined,
});

const API_URL = process.env.DUGGANUSA_API_URL || 'https://analytics.dugganusa.com/api/v1';
const API_KEY = process.env.DUGGANUSA_API_KEY || '';

// ============================================================================
// IOC patterns (inlined for zero-dep reliability)
// ============================================================================

const PATTERNS = {
  ipv4: /\b(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\b/g,
  domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|ai|dev|xyz|info|biz|co|me|app|cloud|online|site|tech|ru|cn|ir|kp|de|fr|nl|uk|au|br|jp|kr|sg|il|sa|ae)\b/gi,
  sha256: /\b[a-fA-F0-9]{64}\b/g,
  cve: /CVE-\d{4}-\d{4,7}/gi,
  onion: /\b[a-z2-7]{56}\.onion\b/g,
};

const SKIP = new Set(['0.0.0.0','127.0.0.1','8.8.8.8','8.8.4.4','1.1.1.1','google.com','github.com','microsoft.com','slack.com','example.com','localhost']);

function extractIOCs(text) {
  const iocs = [];
  for (const [type, regex] of Object.entries(PATTERNS)) {
    for (const m of text.matchAll(regex)) {
      if (SKIP.has(m[0].toLowerCase())) continue;
      iocs.push({ value: m[0], type });
    }
  }
  const seen = new Set();
  return iocs.filter(i => { if (seen.has(i.value.toLowerCase())) return false; seen.add(i.value.toLowerCase()); return true; });
}

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function lookupIOC(value) {
  const url = new URL(API_URL + '/search/correlate');
  url.searchParams.set('q', value);
  const headers = {};
  if (API_KEY) headers['Authorization'] = 'Bearer ' + API_KEY;
  try {
    const json = await httpGet(url.toString(), headers);
    const correlations = json.data?.correlations || {};
    const hits = Object.values(correlations).reduce((s, h) => s + (Array.isArray(h) ? h.length : 0), 0);
    return hits > 0 ? { found: true, hits, data: correlations } : { found: false, hits: 0 };
  } catch (e) { return { found: false, hits: 0, error: e.message }; }
}

function summarize(data) {
  if (!data) return '';
  const parts = [];
  for (const [idx, hits] of Object.entries(data)) {
    if (!Array.isArray(hits) || !hits.length) continue;
    const f = hits[0];
    if (idx === 'iocs') parts.push((f.malware_family || f.threat_type || '?') + ' (via ' + (f.source || '?') + ')');
    else if (idx === 'block_events') parts.push('Blocked ' + hits.length + 'x');
    else if (idx === 'pulses') parts.push(hits.length + ' OTX pulse(s)');
    else if (idx === 'cisa_kev') parts.push('CISA KEV');
    else if (idx === 'adversaries') parts.push('APT: ' + (f.name || '?'));
  }
  return parts.join(' · ');
}

function formatResult(value, result) {
  if (result.found) {
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ':warning: *`' + value + '`* — ' + summarize(result.data) + ' (' + result.hits + ' cross-index hits)\n<' + API_URL + '/search/correlate?q=' + encodeURIComponent(value) + '|View full enrichment>',
      },
    };
  }
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':white_check_mark: *`' + value + '`* — clean. Not found in 1.08M+ IOC index.',
    },
  };
}

// ============================================================================
// Slash command: /dugganusa
// ============================================================================

app.command('/dugganusa', async ({ command, ack, respond }) => {
  await ack();
  const text = (command.text || '').trim();

  if (!text || text === 'help') {
    await respond({
      response_type: 'ephemeral',
      blocks: [{
        type: 'section',
        text: { type: 'mrkdwn', text: [
          '*DugganUSA Threat Intel Bot*',
          '`/dugganusa 185.39.19.176` — look up a single indicator',
          '`/dugganusa scan <paste text>` — extract + check all IOCs',
          '`/dugganusa aipm google.com` — AIPM audit URL',
          '`/dugganusa tor <ip>` — check if IP is a Tor relay',
          '`/dugganusa tor hunt` — suspicious Tor relays',
          '`/dugganusa help` — this message',
          '',
          '1,080,000+ IOCs · 275+ consumers · 46 countries',
          '<https://analytics.dugganusa.com/stix/register|Free API key> · <https://aipmsec.com|AIPM Audit> · <https://www.dugganusa.com|dugganusa.com>',
        ].join('\n') },
      }],
    });
    return;
  }

  // AIPM mode
  if (text.startsWith('aipm ')) {
    const domain = text.slice(5).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    await respond({
      response_type: 'in_channel',
      blocks: [{
        type: 'section',
        text: { type: 'mrkdwn', text: ':mag: *AIPM Audit:* <https://aipmsec.com/audit.html?domain=' + encodeURIComponent(domain) + '|Audit ' + domain + '>\n5 AI models · 7 signals · 15 seconds · Free' },
      }],
    });
    return;
  }

  // Tor relay mode
  if (text.startsWith('tor ')) {
    const torArg = text.slice(4).trim();

    if (torArg === 'hunt') {
      const url = new URL(API_URL + '/tor/hunt');
      const headers = {};
      if (API_KEY) headers['Authorization'] = 'Bearer ' + API_KEY;
      try {
        const json = await httpGet(url.toString(), headers);
        const relays = (json.data?.relays || json.data || []).slice(0, 10);
        if (!relays.length) {
          await respond({ response_type: 'ephemeral', text: 'No suspicious Tor relays found.' });
          return;
        }
        const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: ':onion: *Suspicious Tor Relays* — top ' + relays.length } }];
        for (const r of relays) {
          const flags = Array.isArray(r.flags) ? r.flags.join(',') : (r.flags || '');
          blocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: '`' + (r.address || r.ip || '?') + '` *' + (r.nickname || '?') + '* — ' + flags + ' | ' + (r.country || '?') + ' | ' + (r.asnOrg || '?') + ' | Score: ' + (r.suspicionScore || r.score || '?') },
          });
        }
        blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: 'Powered by <https://www.dugganusa.com|DugganUSA> Tor Attribution Framework' }] });
        await respond({ response_type: 'in_channel', blocks });
      } catch (e) {
        await respond({ response_type: 'ephemeral', text: 'Tor hunt error: ' + e.message });
      }
      return;
    }

    // tor <ip> — check single IP
    const url = new URL(API_URL + '/tor/relays');
    url.searchParams.set('q', torArg);
    url.searchParams.set('limit', '1');
    const headers = {};
    if (API_KEY) headers['Authorization'] = 'Bearer ' + API_KEY;
    try {
      const json = await httpGet(url.toString(), headers);
      const relays = json.data?.relays || json.data?.hits || [];
      if (relays.length > 0 && relays[0].address === torArg) {
        const r = relays[0];
        const flags = Array.isArray(r.flags) ? r.flags.join(', ') : (r.flags || '');
        await respond({
          response_type: 'in_channel',
          blocks: [{
            type: 'section',
            text: { type: 'mrkdwn', text: ':onion: *Tor Relay Found:* `' + torArg + '`\n*Nickname:* ' + (r.nickname || '?') + '\n*Flags:* ' + flags + '\n*Country:* ' + (r.country || '?') + '\n*ASN:* ' + (r.asnOrg || r.asn || '?') + '\n*Bandwidth:* ' + (r.bandwidth || '?') },
          },
          { type: 'divider' },
          { type: 'context', elements: [{ type: 'mrkdwn', text: 'Powered by <https://www.dugganusa.com|DugganUSA> Tor Attribution Framework' }] }],
        });
      } else {
        await respond({ response_type: 'ephemeral', text: ':white_check_mark: `' + torArg + '` is NOT a known Tor relay.' });
      }
    } catch (e) {
      await respond({ response_type: 'ephemeral', text: 'Tor check error: ' + e.message });
    }
    return;
  }

  // Scan mode (extract IOCs from pasted text)
  if (text.startsWith('scan ')) {
    const scanText = text.slice(5);
    const iocs = extractIOCs(scanText);
    if (!iocs.length) {
      await respond({ response_type: 'ephemeral', text: 'No IOC candidates found in the pasted text.' });
      return;
    }

    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: ':shield: *DugganUSA Scan* — checking ' + iocs.length + ' indicator(s)...' } }];
    for (const ioc of iocs.slice(0, 15)) {
      const result = await lookupIOC(ioc.value);
      blocks.push(formatResult(ioc.value, result));
    }
    if (iocs.length > 15) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '_(' + (iocs.length - 15) + ' more indicators not shown — capped at 15)_' } });
    }
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: 'Powered by <https://www.dugganusa.com|DugganUSA> · 1.08M+ IOCs · <https://analytics.dugganusa.com/stix/register|Free API key>' }] });

    await respond({ response_type: 'in_channel', blocks });
    return;
  }

  // Single indicator lookup (default)
  const result = await lookupIOC(text);
  await respond({
    response_type: 'in_channel',
    blocks: [
      formatResult(text, result),
      { type: 'divider' },
      { type: 'context', elements: [{ type: 'mrkdwn', text: 'Powered by <https://www.dugganusa.com|DugganUSA> · 1.08M+ IOCs · <https://aipmsec.com|AIPM Audit>' }] },
    ],
  });
});

// ============================================================================
// App mention: @DugganUSA 185.39.19.176
// ============================================================================

app.event('app_mention', async ({ event, say }) => {
  const text = (event.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
  if (!text) {
    await say('Type `/dugganusa help` for usage.');
    return;
  }

  const iocs = extractIOCs(text);
  if (!iocs.length) {
    // Try treating the whole text as a single indicator
    const result = await lookupIOC(text);
    const blocks = [formatResult(text, result)];
    await say({ blocks });
    return;
  }

  const blocks = [];
  for (const ioc of iocs.slice(0, 10)) {
    const result = await lookupIOC(ioc.value);
    blocks.push(formatResult(ioc.value, result));
  }
  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: 'Powered by <https://www.dugganusa.com|DugganUSA> · <https://aipmsec.com|AIPM Audit>' }] });
  await say({ blocks });
});

// ============================================================================
// Start
// ============================================================================

(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log('DugganUSA Slack bot running on port ' + port);
})();

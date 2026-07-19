# Changelog

## [1.3.0] - 2026-07-19

### Security
- **Fixed a fail-open defect: a failed lookup was posted to Slack as "clean".** `lookupIOC` returned a bare `{ found: false }` on every error path, byte-identical to a verified-clean result, so an expired API key, a 429, a timeout, or an API outage rendered as a green `:white_check_mark: clean. Not found in 1.5M+ IOC index.` in a security channel. Absence of evidence is not evidence of safety.
- Lookups are now tri-state (`ok`, `status: 'found' | 'not-found' | 'unknown'`), matching `dugganusa-scanner-core` v1.3.0. `found` is retained for backwards compatibility.
- **`httpGet` never checked `res.statusCode`.** A non-2xx response carries a parseable JSON error body whose absent `correlations` was counted as "no hits". This was live, not theoretical: anonymous access to `/search/correlate` now returns HTTP 401, so a bot running without `DUGGANUSA_API_KEY` was reporting every indicator clean. Non-2xx now rejects.
- `formatResult` renders a distinct `:grey_question: lookup failed` block for unknown results. All four call sites (slash-command scan, single lookup, app-mention scan, app-mention single) inherit the fix.

## [1.2.2] - 2026-06-30

### Fixed
- Aligned in-tool/runtime IOC-count strings to 1.5M+ (the v1.2.1 docs refresh updated the README but missed the strings the tool prints at runtime).

## [1.2.1] - 2026-06-30

### Added
- Documented the fourth live validation axis — Liveness (/api/v1/feed-efficacy).

### Changed
- Refreshed IOC corpus copy to 1.5M+ IOCs (~1.57M live) and ~38M documents across 65 indexes.
- Reworded the Timeliness validation bullet to point at the live kev-lead ledger instead of a fixed "~31 days ahead" average.

## 1.2.0

- Surfaced the three live, no-auth, deploy-durable validation endpoints in the README: feed-uniqueness (novelty, ~75%+ unique vs ThreatFox), kev-lead (timeliness, ~31 days ahead of CISA KEV), and spamhaus-validation (accuracy, independently corroborated).
- Documented expanded supply-chain coverage: OSV malicious-package ingestion for both npm and PyPI plus daily GitHub Hunt malware-staging-repo detections, so `/dugganusa scan` now lights up known-bad packages too.
- Corrected for API-key enforcement: the STIX feed now returns 401 anonymous / 429 unregistered. Free tier is a free *registered* key — README now points to the registration page and treats `DUGGANUSA_API_KEY` as required.
- Aligned IOC corpus copy to 1.10M+ across 44 indexes (~17.9M+ documents), 275+ consumers in 46 countries.
- Fixed dead `npx dugganusa-lookup` reference to `npx dugganusa-cli`.

## 1.1.0

- Slash command + @mention IOC lookup, text scanning, and AIPM audit links.

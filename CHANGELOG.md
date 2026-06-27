# Changelog

## 1.2.0

- Surfaced the three live, no-auth, deploy-durable validation endpoints in the README: feed-uniqueness (novelty, ~75%+ unique vs ThreatFox), kev-lead (timeliness, ~31 days ahead of CISA KEV), and spamhaus-validation (accuracy, independently corroborated).
- Documented expanded supply-chain coverage: OSV malicious-package ingestion for both npm and PyPI plus daily GitHub Hunt malware-staging-repo detections, so `/dugganusa scan` now lights up known-bad packages too.
- Corrected for API-key enforcement: the STIX feed now returns 401 anonymous / 429 unregistered. Free tier is a free *registered* key — README now points to the registration page and treats `DUGGANUSA_API_KEY` as required.
- Aligned IOC corpus copy to 1.10M+ across 44 indexes (~17.9M+ documents), 275+ consumers in 46 countries.
- Fixed dead `npx dugganusa-lookup` reference to `npx dugganusa-cli`.

## 1.1.0

- Slash command + @mention IOC lookup, text scanning, and AIPM audit links.

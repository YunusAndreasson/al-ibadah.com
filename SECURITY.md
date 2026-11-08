# Security policy

al-Ibadah is a static site on Cloudflare Pages with two Pages Functions: the
middleware that redirects old URLs, and `/api/search`, which queries
Cloudflare AI Search. Please report a vulnerability privately.

## Reporting a vulnerability

Use GitHub's private reporting:
[report a vulnerability](https://github.com/YunusAndreasson/al-ibadah.com/security/advisories/new).
Please don't open a public issue.

Include the URL or file, what you did, what happened, and what an attacker
would gain. A fix is coordinated with you before anything is published, and
you're credited in the advisory unless you'd rather not be.

## Supported versions

Only what is live at https://al-ibadah.com, built from `master`.

## Scope

In scope:

- the site at https://al-ibadah.com, including its HTML, scripts and response
  headers (`public/_headers`)
- the Pages Functions in `functions/`
- the build and validation scripts in `scripts/`, and this repository's
  workflows

Out of scope: vulnerabilities in Cloudflare's platform, in Astro or other
dependencies (report those upstream), and findings that need a compromised
browser or device.

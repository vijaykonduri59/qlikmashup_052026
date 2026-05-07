# Security Scanning: The Four-Layer Baseline

_Last updated: 2026-05-07_

> What runs on every push and PR to catch vulnerabilities, leaked secrets, and risky dependencies before they reach `main`. Plus what to do when an alert fires.

---

## 1. What is it?

"Security scanning" is an umbrella term for several distinct checks. They look at _different things_ for _different reasons_ and you generally want all of them. Our baseline is **four layers**, all free and native to GitHub:

| #   | Layer               | Category                                   | What it scans                                                                     |
| --- | ------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | **Semgrep**         | SAST (Static Application Security Testing) | Your _source code_ for known vulnerability patterns                               |
| 2   | **Dependabot**      | SCA (Software Composition Analysis)        | Your _dependencies_ (`package.json`, lockfile) for known CVEs                     |
| 3   | **Secret Scanning** | Secret detection                           | Your _commits and history_ for accidentally-committed API keys, tokens, passwords |
| 4   | **`npm audit`**     | SCA (supplementary)                        | Your dependencies, run as a CI step (defense in depth alongside Dependabot)       |

Each catches things the others miss. SAST won't tell you a dependency has a CVE. Dependabot won't notice you wrote SQL-injectable code. Secret scanning won't catch a vulnerable library version. You need all of them.

## 2. Why we use it (in this project)

- **You asked for it explicitly.** Catching bugs/vulnerabilities/code issues was a stated requirement.
- **Modern enterprise discipline.** Even a personal learning project should follow the same baseline a real corporate codebase would, because that's the habit you want to internalize.
- **Mashups have real attack surface.** A Qlik mashup runs in a browser, talks to an authenticated Qlik server, and may handle sensitive data. XSS, broken auth, leaky tokens — these aren't theoretical.
- **Free.** All four layers cost $0 on a GitHub personal-account private repo.
- **Catches issues at the cheapest point.** Finding a vulnerable dep in CI = 5 minutes. Finding it in production = days plus reputational damage.

## 3. How it works

### Layer 1 — Semgrep (SAST)

[Semgrep](https://semgrep.dev/) is an open-source static analysis engine that pattern-matches code against curated rule packs. For our stack we run five packs in CI:

- `p/security-audit` — generic security rules
- `p/typescript` — TS-specific patterns
- `p/react` — React safety (JSX, hooks, `dangerously*`)
- `p/owasp-top-ten` — web-app OWASP top 10
- `p/javascript` — JS rules (often catches things TS doesn't)

For JavaScript/TypeScript, Semgrep catches the same general classes CodeQL does:

- DOM XSS (e.g., `dangerouslySetInnerHTML` with user input)
- Prototype pollution
- Hard-coded credentials in source
- Insecure RegExp patterns (ReDoS)
- Unsafe `eval`-like usage
- React-specific issues (unsafe refs, hook misuse, etc.)

**How it runs:** workflow at `.github/workflows/semgrep.yml` triggers on every PR + push to `main` + weekly Monday 06:00 UTC scan. Findings show up as workflow log output and **fail the job** when present (`--error` flag). Without GitHub Advanced Security, findings are NOT uploaded to the Security tab — they live in the Actions logs.

> **Cost note:** Semgrep CLI is free + open-source under LGPL 2.1. The rule packs we use (`p/...` from semgrep registry) are also free. Semgrep also offers a free Cloud tier (semgrep.dev) with a UI for findings — we don't use it in v1, but adding it later is just an env var (`SEMGREP_APP_TOKEN`).

### Layer 2 — Dependabot

Three things in one product:

| Sub-feature                     | What it does                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------- |
| **Dependabot alerts**           | Notifies you when a known CVE is published affecting a dep you use              |
| **Dependabot security updates** | Automatically opens PRs that bump the affected dep to a patched version         |
| **Dependabot version updates**  | (Optional) opens PRs for routine non-security version bumps based on a schedule |

**How it runs:** alerts and security updates are enabled in repo Settings → Code security & analysis. Routine version updates require a config file at `.github/dependabot.yml`.

You'll typically see Dependabot PRs land in your inbox; you review the changelog, check CI is green, and merge.

### Layer 3 — Secret Scanning

GitHub continuously scans the repo (including all history) for **token patterns** matching dozens of known providers — AWS, Stripe, Slack, GitHub PATs, Azure, OpenAI, Anthropic, etc. When a match is found:

1. The repo owner gets an alert
2. (Often) the issuing provider is automatically notified and the token is revoked
3. The finding appears in the Security tab

**How it runs:** enabled by default for public repos and **free for private repos** as of 2023. No config needed; just turn it on.

**What you do:** if an alert fires, treat the leaked secret as compromised — rotate it immediately, even if "it was just a test key."

### Layer 4 — `npm audit` (in CI)

`npm audit` is a built-in npm command that checks your installed deps against the npm advisory database. It's similar in spirit to Dependabot but runs synchronously as part of CI:

```yaml
- name: npm audit
  run: npm audit --audit-level=high
```

Fails the build if any high-or-critical vulnerability is found. Acts as a backstop for the (rare) case where Dependabot hasn't caught up to a fresh advisory yet.

### Where they fit in the pipeline

```
                    Every PR
                       |
                       v
   +-------+--------+-------+----------+
   |       |        |       |          |
   v       v        v       v          v
 ESLint  tsc    Prettier  Vitest    Build
                                       |
   +---------+--------------+----------+
   |         |              |
   v         v              v
 CodeQL   npm audit    Bundle size
 (SAST)   (SCA)        budget

      (Continuous, async, repo-wide:)
        - Dependabot CVE monitoring
        - Secret Scanning on every push
```

## 4. Pros

- **Comprehensive coverage** at the four most important attack surfaces, with one stack
- **Zero cost** on personal-account private repos
- **Native integration** — no third-party service to set up, no extra dashboards
- **Findings live in the GitHub UI** — Security tab, PR comments, repo Insights
- **Automated remediation** for many dep CVEs (Dependabot auto-PRs)
- **History-aware** — Secret Scanning checks every commit ever made, not just current state
- **Easy to add second-opinion tools later** — Snyk/Semgrep slot in as additional CI jobs without touching the baseline

## 5. Cons

- **False positives are real.** CodeQL especially flags things that aren't true vulnerabilities in context. You'll need to learn how to suppress findings _with justification_ (not just dismiss them).
- **CodeQL is slow.** Adds a few minutes to each PR. Acceptable, but noticeable.
- **Dependabot PR fatigue.** A repo with many deps generates many PRs. You'll want auto-merge for non-breaking patch updates once the project is mature.
- **`npm audit` over-flags transitive issues** that aren't really exploitable in your context. Sometimes needs `--production` or careful triage.
- **Triage is a real skill.** "There's an alert" doesn't mean "there's a real problem." Learning what's exploitable in your context is part of the work.
- **Doesn't replace human judgment.** SAST catches patterns; it won't catch architectural mistakes (broken auth, leaky logging, bad CORS config). You still need to think.

## 6. Alternatives we considered

| Option                                   | Why we didn't pick it                                                                                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CodeQL**                               | Originally planned. Requires GitHub Advanced Security on private repos (org-only paid feature) — confirmed unavailable for our setup on 2026-05-08. Swap back if/when repo goes public or org is added. |
| **Snyk** (commercial, free tier)         | Strong dep + SAST + slick UI; adds value as a _second opinion_ on top of Semgrep. Easy to add later as an extra CI job.                                                                                 |
| **SonarCloud**                           | Classic enterprise pick; combines code quality + security. Heavier, more setup.                                                                                                                         |
| **eslint-plugin-security**               | Lightweight SAST as ESLint rules; useful as a _third_ layer alongside Semgrep, not as a replacement.                                                                                                    |
| **Skip SAST entirely**                   | Self-defeating — the user explicitly wanted vulnerability scanning.                                                                                                                                     |
| **TruffleHog / GitGuardian for secrets** | GitHub Secret Scanning is already free and native; no reason to add a third-party.                                                                                                                      |

**When we'd swap to CodeQL:** if the repo becomes public OR an org with GitHub Advanced Security takes ownership. The workflow swap is one file (`semgrep.yml` → `codeql.yml`); rule coverage is comparable for our stack.

**When we'd add Snyk on top:** if the project becomes commercial and we want a vendor-supported view of findings + a UI dashboard. Snyk's free tier is generous; adding it is one CI job.

## 7. What this means for our project

In practice:

1. **Before scaffold:** none of this is wired up yet. We turn it on right after the project exists.
2. **Right after scaffold:** in repo Settings → Advanced Security → enable Dependency Graph, Dependabot alerts, Dependabot security updates, Grouped security updates, Secret Scanning, Push protection.
3. **Use `.github/workflows/semgrep.yml`** for the SAST scan (NOT CodeQL — see §1 cost note). Runs on every PR + push to `main` + weekly Monday scan. Findings appear in the Actions log and fail the workflow.
4. **Add `npm audit` to the main CI workflow** as a step (already in `ci.yml`).
5. **Configure `.github/dependabot.yml`** to enable routine version updates with a sensible cadence (weekly grouped npm + GitHub Actions).
6. **Daily loop:** when an alert fires (in PR or workflow log), you triage:
   - **Real issue, easy fix?** Apply the fix in a PR.
   - **Real issue, hard fix?** Open a tracking issue, plan the work.
   - **False positive?** Suppress with a `// nosemgrep: <rule-id>` comment + reason in a PR description. Never silence a rule globally without explicit reasoning.

The single most important habit: **read every alert, even when it's noisy.** The cost of skimming is low; the cost of missing one real CVE is high. Once you've seen a few false positives in the same category, you'll triage faster.

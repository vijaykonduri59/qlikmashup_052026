# Security Scanning: The Four-Layer Baseline

_Last updated: 2026-05-07_

> What runs on every push and PR to catch vulnerabilities, leaked secrets, and risky dependencies before they reach `main`. Plus what to do when an alert fires.

---

## 1. What is it?

"Security scanning" is an umbrella term for several distinct checks. They look at _different things_ for _different reasons_ and you generally want all of them. Our baseline is **four layers**, all free and native to GitHub:

| #   | Layer               | Category                                   | What it scans                                                                     |
| --- | ------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | **CodeQL**          | SAST (Static Application Security Testing) | Your _source code_ for known vulnerability patterns                               |
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

### Layer 1 — CodeQL (SAST)

CodeQL is GitHub's static analysis engine. It builds a queryable model of your code and runs hundreds of pre-written security queries against it. Out of the box for JavaScript/TypeScript it catches things like:

- DOM XSS (e.g., `dangerouslySetInnerHTML` with user input)
- Prototype pollution
- Hard-coded credentials in source
- Insecure RegExp patterns (ReDoS)
- Unsafe `eval`-like usage
- Server-side request forgery (where applicable)

**How it runs:** a workflow file at `.github/workflows/codeql.yml` triggers CodeQL on every PR plus a weekly scheduled deep scan. Findings appear in the **Security** tab of the GitHub repo and as PR comments.

> **Cost note:** Code scanning was historically limited to public repos or paid GitHub Advanced Security on private repos. GitHub has since expanded free code scanning to **personal-account private repositories**. Verify on first setup — if it's gated for any reason, we have free fallbacks (see §6).

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

| Option                                           | Why we didn't pick it (yet)                                                                                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Snyk** (commercial, free tier)                 | Strong dep + SAST scanning, slick UI; adds value as a _second opinion_ but the GitHub baseline already covers our needs. Easy to add later as an extra CI job. |
| **Semgrep** (open-source SAST + cloud free tier) | Excellent rules-based SAST, very fast, great for custom rules. Adds value if we hit CodeQL false-positive fatigue.                                             |
| **SonarCloud**                                   | Classic enterprise pick; combines code quality + security. Heavier, more setup, less "free" feel.                                                              |
| **eslint-plugin-security**                       | Lighter SAST as ESLint rules; useful as a _third_ layer but not a replacement for CodeQL                                                                       |
| **Skip SAST entirely**                           | Self-defeating — the user explicitly wanted vulnerability scanning                                                                                             |
| **TruffleHog / GitGuardian for secrets**         | GitHub Secret Scanning is already free and native; no reason to add a third-party                                                                              |

**When we'd reconsider:** if CodeQL turns out to cost on the private repo, we'd swap to **Semgrep** (free SAST + free CI integration) without losing much. If the project becomes commercial, **Snyk** + **Semgrep** as supplements is a reasonable enterprise upgrade.

## 7. What this means for our project

In practice:

1. **Before scaffold:** none of this is wired up yet. We turn it on right after the project exists.
2. **Right after scaffold:** in repo Settings → Code security & analysis, flip on Dependabot alerts, Dependabot security updates, and Secret Scanning (one-click each).
3. **Add `.github/workflows/codeql.yml`** for the SAST scan. GitHub provides a starter template — we'll customize it for TypeScript.
4. **Add `npm audit` to the main CI workflow** as a step.
5. **Configure `.github/dependabot.yml`** to enable routine version updates with a sensible cadence (weekly for regular deps, daily for security).
6. **Daily loop:** when an alert fires (in PR or repo Security tab), you triage:
   - **Real issue, easy fix?** Apply the fix in a PR.
   - **Real issue, hard fix?** Open a tracking issue, plan the work.
   - **False positive?** Suppress with a comment explaining _why_ it's not exploitable in our context. Never dismiss without writing the reason.

The single most important habit: **read every alert, even when it's noisy.** The cost of skimming is low; the cost of missing one real CVE is high. Once you've seen a few false positives in the same category, you'll triage faster.

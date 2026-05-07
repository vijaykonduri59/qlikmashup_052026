# Source Control & CI/CD: GitHub + GitHub Actions

_Last updated: 2026-05-07_

> Where the code lives, how every change gets validated automatically, and how a solo developer gets the same discipline a real engineering team would have.

---

## 1. What is it?

Three concepts, often confused:

| Term                                      | Meaning                                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Source control**                        | Version-tracked history of your code. Git is the tool; GitHub is where the Git repo is hosted.                                         |
| **CI** (Continuous Integration)           | Automated pipeline that validates every code change — lint, type-check, build, test, security scan. Runs on a server, not your laptop. |
| **CD** (Continuous Deployment / Delivery) | Automated pipeline that ships the validated build to a deploy target (Qlik server, IIS, S3, etc.).                                     |

For our project:

- **Source control:** Git repo hosted on **GitHub** (private, personal account)
- **CI:** **GitHub Actions** — workflows defined in YAML files inside the repo
- **CD:** deferred — we'll wire it up once we choose a deploy target (Open Question §5 in [SKILLS.md](../SKILLS.md))

## 2. Why we use it (in this project)

- **Discipline you can't fake.** Quality gates make broken code _unable_ to reach `main`, even on a Friday afternoon when you're tired.
- **Learning by doing.** A PR-driven workflow with green checks teaches the same habits real engineering teams use — branching, code review (against yourself), CI feedback loops, addressing scanner findings.
- **Future-proofing.** The day a teammate joins or you open-source it, the system is already in place.
- **AI compatibility.** GitHub Actions YAML is the CI format Claude/Copilot understand best. Asking AI to write a workflow file produces working code reliably.
- **Free for our scale.** Solo project on a personal account: $0 for everything we'll need.

## 3. How it works

### The repo

A single Git repository on GitHub, hosted privately under your personal account. Files live in folders (`src/`, `docs/`, `.github/workflows/`). Every change is a **commit**; commits live on **branches**.

### Branching strategy: trunk-based

```
main  ─────●─────●─────●─────●──── (always shippable)
            \           \      \
   feature   ●─●         \      ●── (short-lived branches)
                          ●─●───
```

- `main` is the trunk. It's always in a deployable state.
- Every change starts on a **short-lived feature branch** (typically lives 1–3 days).
- When the work is ready, you open a **Pull Request** from your branch into `main`.
- CI runs automatically on the PR.
- When CI is green, you merge; the branch is deleted.

This is "trunk-based development" — the modern industry default, simpler than GitFlow and ideal for solo or small-team work.

### What runs on every PR (the CI workflow)

A YAML file at `.github/workflows/ci.yml` (we'll create when we scaffold the project) defines parallel jobs:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup Node
      - npm ci
      - npm run lint # ESLint
      - npm run typecheck # tsc --noEmit
      - npm run format:check # Prettier --check
      - npm test # Vitest (when we have tests)

  build:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup Node
      - npm ci
      - npm run build # vite build
      - bundle-size check (later)

  # security/* jobs covered in docs/06-security-scanning.md
```

### Branch protection (the gate)

In GitHub repo settings:

- ✓ Require a pull request before merging
- ✓ Require status checks to pass before merging
  - Required: `quality`, `build`, `semgrep`, etc.
- ✗ Require approvals — _disabled, because solo_
- ✓ Allow administrators to bypass — kept on as an emergency lever

Result: even though you're solo, you can't merge code that fails CI. You can override in a true emergency, but it requires conscious effort.

### Secrets management

API keys, tokens, and Qlik connection details (later) live in **GitHub Actions Secrets** (repo → Settings → Secrets and variables → Actions). They're injected as environment variables at workflow runtime and are never exposed in logs.

**Never** commit secrets to the repo. Secret Scanning (see [docs/06-security-scanning.md](06-security-scanning.md)) catches accidental leaks.

## 4. Pros

- **Free** for a solo personal-account private project (within Actions quota; we'll easily stay under it)
- **Battle-tested** at every scale, from solo to Microsoft-scale
- **Massive marketplace** of pre-built actions (`actions/checkout`, `actions/setup-node`, hundreds more)
- **Native security integrations** — Dependabot, Secret Scanning all "first-party" with one-line setup. (CodeQL would be too if we had GitHub Advanced Security; we use Semgrep instead — see [docs/06](06-security-scanning.md).)
- **Best AI tooling support** of any CI platform
- **Logs and reruns** are kept; debugging a flaky CI run is straightforward
- **Workflow files live with the code**, so history of CI changes is visible alongside code history

## 5. Cons

- **Lock-in.** Workflows aren't portable to other CI systems without rewriting. (Mitigation: keep the actual lint/build/test commands in `package.json` scripts; the workflow just calls them.)
- **YAML is finicky.** Indentation errors, quoting rules, expression syntax — debugging a broken workflow is annoying.
- **Free quota caps.** GitHub Free gives 2,000 Actions minutes/month for private repos. Solo project: easily fits. If we ever hit the cap, public repo = unlimited free.
- **GitHub outages happen.** The GitHub Status page is occasionally relevant. Plan for it as a real, if rare, risk.
- **Secrets in logs.** Misconfigured `echo $SECRET` would leak — Actions auto-redacts known secrets but you should still avoid printing them.

## 6. Alternatives we considered

| Option                               | Why we didn't pick it                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Azure DevOps** (Repos + Pipelines) | Strong choice if your company mandates it; for personal/solo with no constraint, GitHub has better ecosystem and AI support |
| **GitLab** (SaaS or self-hosted)     | Excellent built-in DevSecOps; smaller community for help and weaker AI tooling support                                      |
| **Bitbucket + Bitbucket Pipelines**  | Smaller ecosystem, no compelling advantage                                                                                  |
| **Jenkins**                          | Powerful but heavy; you have to host and maintain it; massive overkill for a solo project                                   |
| **CircleCI / Travis CI**             | No reason to add a third-party CI when GitHub Actions is right there and free                                               |

**When we'd reconsider:** if this becomes a company project and the company already runs Azure DevOps or GitLab, switching matches their compliance and SSO posture. For a personal learning project, GitHub stays.

## 7. What this means for our project

In practice, your daily loop will look like:

1. `git checkout -b feature/something` — start a branch
2. Code, save, watch Vite hot-reload
3. Run `npm run lint` and `npm run typecheck` locally before pushing (catches issues fast)
4. `git commit` and `git push`
5. Open a PR on GitHub (the CLI `gh pr create` makes this one command)
6. Watch CI run — if anything's red, fix and push again
7. When green, merge — branch is auto-deleted
8. `git checkout main && git pull` to sync your local

The `.github/workflows/` folder will appear in the repo right after we scaffold the project. We'll iterate on the workflow as we add tests, security tools, and (eventually) a deploy step.

The single most important habit: **never push directly to `main`**, even though you're solo. The discipline is the point.

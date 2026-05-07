# Testing Strategy

_Last updated: 2026-05-07_

> Three layers of tests, each with a defined scope. The aim is high confidence per minute spent, not 100% coverage.

---

## 1. What is it?

Three test layers, each catching different bugs:

| Layer                      | Tool                                | What it tests                                                  |
| -------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| **Unit tests**             | **Vitest**                          | Pure functions, hooks, utility code, data adapters             |
| **Component tests**        | **Vitest + @testing-library/react** | React components in isolation, with mocked dependencies        |
| **End-to-end (E2E) tests** | **Playwright**                      | Critical user flows from real browser to (mocked or real) Qlik |

We don't pretend to follow a strict pyramid; we test where bugs hide, not where the textbook says.

## 2. Why we use it (in this project)

- **Multi-month project.** Without tests, refactors get scary fast. Tests are how you stay confident enough to clean things up.
- **Qlik integration is brittle.** Hypercube → chart adapters, session lifecycle, error categorization — all easy to silently break. Tests catch regressions.
- **Solo developer.** No second pair of eyes on PRs. Tests are your reviewer.
- **300-user production.** A regression that ships breaks for 300 people. Tests are cheap insurance.

## 3. How it works

### Unit tests (Vitest)

Co-located with code:

```
src/
  lib/qlik/adapters/
    hypercubeToEcharts.ts
    hypercubeToEcharts.test.ts   ← right next to it
```

- Run with `npm test` (sub-second feedback)
- jsdom for DOM-free pure-logic tests
- **Target coverage:** 80%+ for `lib/`, `adapters/`, `stores/` (deterministic code)

### Component tests (Vitest + RTL)

Render a component into a fake DOM (jsdom), interact via accessibility roles, assert on output:

```ts
test('shows error card when chart fails to render', async () => {
  render(<ChartErrorCard error={new Error('boom')} />);
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

**Mock strategy for Qlik:** every component that uses an enigma session takes the session via React context (or a hook). In tests, we provide a stub session that returns predictable layouts. We do **NOT** mock enigma at the WebSocket level — too brittle.

**Target coverage:** 60%+ for `components/`, prioritizing complex stateful components (forms, charts, navigation).

### E2E tests (Playwright)

Real browser, real network, against either:

- **Mocked Qlik** (recommended for CI) — Playwright's network interception returns canned engine responses
- **Dedicated Qlik test environment** — slower, more real, used for nightly builds

```ts
test('user can navigate from sidebar to a sheet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Sales/i }).click();
  await page.getByRole('link', { name: /Pipeline 2026/i }).click();
  await expect(page.getByRole('heading', { name: /Pipeline/i })).toBeVisible();
});
```

**Coverage:** ~10–15 critical flows. Not exhaustive — just the paths real users walk every day.

### CI integration

```
on PR:
  npm run lint
  npm run typecheck
  npm test                                   ← Vitest unit + component
  npm run test:e2e -- --grep @critical       ← only critical Playwright tests

nightly (scheduled):
  npm run test:e2e                           ← full Playwright suite
```

PR latency stays low; full E2E happens overnight.

### What NOT to test

- Trivial UI (a button that just calls an action — let the component using it test integration)
- Third-party library internals (we trust shadcn/ui's button works)
- Snapshot tests for layout (brittle, noisy on every UI change)
- Things whose only purpose is to bump a coverage number

## 4. Pros

- **Catches regressions** before users do
- **Encourages good architecture** — testable code is usually well-structured code
- **Documentation by example** — a test shows how a function is meant to be used
- **Refactor confidence** — change implementation, run tests, ship
- **Fast feedback** — Vitest sub-second on unit; PR feedback within minutes

## 5. Cons

- **Tests are code too.** They take time to write and maintain.
- **Bad tests are worse than no tests.** Brittle/slow tests poison the workflow.
- **Mocking Qlik well is hard.** Real engine has subtleties no mock captures.
- **E2E is slow.** Playwright runs are minutes, not seconds.
- **Coverage targets can become goals instead of byproducts** — chasing % over value.

## 6. Alternatives we considered

| Option                                   | Why we didn't pick it                                    |
| ---------------------------------------- | -------------------------------------------------------- |
| **Jest**                                 | Slower, less Vite-integrated, more config overhead       |
| **Cypress**                              | Heavier than Playwright, slower, less type-friendly      |
| **Skip testing, "it's just personal"**   | Multi-month + 300 users = real production                |
| **100% coverage rule**                   | Toxic incentive; produces brittle tests for trivial code |
| **Snapshot testing as primary strategy** | Brittle, generates noise on every UI change              |

## 7. What this means for our project

Folder structure:

```
src/
  lib/qlik/adapters/hypercubeToEcharts.test.ts   ← unit
  components/charts/NebulaObject.test.tsx        ← component
e2e/
  navigate-to-sheet.spec.ts                       ← E2E
  open-app-and-export.spec.ts                     ← E2E
  session-expiry.spec.ts                          ← E2E
playwright.config.ts
vitest.config.ts
```

Conventions:

- **Co-locate unit + component tests** with the code they test
- **E2E tests in top-level `e2e/`** because they cross the whole app
- **One assertion per test** when possible — failure messages stay readable
- **Test names describe behavior**, not implementation — `it('shows error card on failed render')` not `it('renders ChartErrorCard with error prop')`
- **`@critical` tag** on E2E tests that block PR merge; everything else runs nightly

The single most important habit: **write a failing test BEFORE the fix when you find a bug.** Reproduces the bug; ensures the fix actually fixes it; prevents the bug from coming back.

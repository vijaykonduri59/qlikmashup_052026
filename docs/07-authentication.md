# Authentication: Inherited Session via Content-Library Extension

_Last updated: 2026-05-07_

> The single biggest piece of plumbing we _don't_ have to build, and the one nuance that catches every developer in dev mode.

---

## 1. What is it?

In Qlik Sense Enterprise, a "mashup" can be packaged and uploaded to the **QMC's Content Library** (sometimes labeled "Extensions" depending on your QMC version — Qlik confusingly uses _extension_ for both mashups and custom chart types). Once uploaded, the mashup is accessible at a URL like:

```
https://qlik.company.com/extensions/my-mashup/index.html
```

When a user navigates to that URL:

1. Qlik's **virtual proxy** intercepts the request.
2. If the user isn't already authenticated (no valid session cookie), the proxy redirects them to whatever auth flow your enterprise uses — Windows Integrated Auth, SAML/OIDC, header auth, ticket auth, JWT, etc.
3. After auth, the proxy serves your mashup files.
4. Your mashup is now running with a **valid Qlik session cookie** in the browser, on the **same origin** as the Qlik engine.

That last point is what makes "auth is auto" true: WebSocket connections from the mashup to the engine include the session cookie automatically, and the engine accepts them as authenticated calls from the user.

## 2. Why we use it (in this project)

- **You decided to deploy as a content-library extension.** Locked in [SKILLS.md](../SKILLS.md) §4.
- **It's the lowest-friction option.** No login UI, no token management, no SAML library, no JWT signing, no session refresh code.
- **It inherits your enterprise's existing identity story.** Whatever your IT team already configured (AD, SAML to Okta, Azure AD, etc.) "just works."
- **It's the standard pattern.** Qlik's official examples and docs assume this deployment model.

## 3. How it works

### Production flow (deployed to Content Library)

```
User browser
    |
    v  GET /extensions/my-mashup/index.html
    |
+-----------------------+
| Qlik virtual proxy    |
|  - is user logged in? |---- no --> redirect to SAML / SSO
|  - yes? serve files   |<--- yes (session cookie set)
+-----------------------+
    |
    v  HTML/JS/CSS bundle delivered
    |
    v  enigma.js opens WSS connection
    |
    v  wss://qlik.company.com/app/<id>
        (cookie auto-attached, same origin)
    |
    v  Qlik engine accepts session
    |
    v  Charts render, selections work, etc.
```

### What you (the developer) still do

Even with auth handled, the mashup needs to:

1. **Identify the current user** — via the Engine API call `GetAuthenticatedUser` (returns the user directory + user ID), used for personalization, audit logging, role-based UI.
2. **Detect session expiry** — sessions can time out. enigma.js emits a `closed` event on the WebSocket; you respond by showing a "your session has expired, please reload" UI.
3. **Handle "user not authorized for this app/sheet"** — auth doesn't mean authorization. The user might be signed in but not allowed into this Qlik app. The engine returns errors; you show a friendly access-denied screen.

### Development flow — sense-demo.qlik.com (decided 2026-05-10)

**Dev connects to Qlik's public demo server**, `sense-demo.qlik.com`. Anonymous WebSocket access, real Qlik apps, zero infrastructure setup. The code uses one env-aware switch:

```ts
const host = import.meta.env.PROD
  ? location.host // prod: same origin (Qlik content-library deploy)
  : 'sense-demo.qlik.com'; // dev: Qlik public demo
```

This means **DEV / UAT / PRD QMC environments all use the same build**: once the mashup zip is imported into a QMC's content library, `location.host` resolves to whatever Qlik server hosts the mashup. No per-environment URL config, no separate builds.

**Caveat:** the localhost-to-sense-demo cross-origin connection may need a Vite dev proxy if the demo server's CORS rejects `localhost:5173`. We'll find out on first connection in Stage 7b. If it does, `vite.config.ts` adds a `server.proxy` rule that tunnels `/qlik` to `wss://sense-demo.qlik.com` so the browser only sees same-origin.

### Development flow — the puzzle (still open for non-demo dev work)

In development, things are different:

```
Your laptop                              Qlik server
+-----------------------+                +-----------------------+
| Vite dev server       |                | Virtual proxy         |
| http://localhost:5173 |  cross-origin  | https://qlik.example  |
|                       |   no shared    |                       |
| your mashup runs here |---- session ---|                       |
+-----------------------+   (problem)    +-----------------------+
```

Three options to bridge dev to a real Qlik server:

| Approach                     | How                                                                                                                            | Tradeoffs                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **A. Vite dev proxy**        | Configure `server.proxy` in `vite.config.ts` to tunnel `/api/*` and WebSocket to the Qlik server, including cookie passthrough | Best DX once it works; finicky to configure (HTTPS, WSS, certs); virtual proxy must allow your dev origin |
| **B. Deploy-to-test-server** | Build the mashup, upload to a test Qlik content library, open through the Qlik URL                                             | Always real; slow feedback loop (re-upload per change)                                                    |
| **C. Mock the engine**       | Replace enigma.js with a stub that returns canned responses in dev                                                             | Fast feedback; risky — bugs only surface against real engine                                              |

We'll likely combine A and B: most dev via Vite proxy, occasional deploy-to-test for integration sanity. C is a fallback if Qlik access is intermittent.

**This is an open implementation question.** We'll resolve it when we scaffold and need to actually run code.

## 4. Pros

- **Zero auth code in the mashup.** No login UI, no token storage, no refresh flow.
- **Inherits enterprise identity.** Whatever IT configured (SAML, AD, OIDC) is automatically respected.
- **Same-origin + session cookies = secure by default.** No CORS hacks needed in production.
- **Works for any user the org provisions.** No per-mashup user management.
- **Logout is enterprise-wide.** When the user logs out of Qlik, your mashup loses access too — exactly what you want.

## 5. Cons

- **Tied to deployment model.** If you ever want to host the mashup outside Qlik (standalone web server, S3, CDN), you have to build a real auth flow (ticket-based, header auth via reverse proxy, JWT). All the work you avoided is back.
- **Dev environment is non-trivial.** The Vite proxy configuration for HTTPS + WebSocket + cookie passthrough is genuinely tricky to get right.
- **Session-expiry UX is your job.** Qlik tells you the session died; you have to handle it gracefully (reload prompt, save selections to URL, etc.).
- **No fine-grained auth at the mashup level.** If a user is in Qlik, they can load your mashup. If you need "this mashup is only for managers," you implement that yourself based on `GetAuthenticatedUser`.
- **Debugging auth issues is hard.** When something breaks at the proxy/cookie/WebSocket boundary, the symptoms are usually "WebSocket closed with code 1006" — vague. Network panel + QMC proxy logs become your best friend.

## 6. Alternatives we considered

| Option                                  | Why we didn't pick it (yet)                                                                                                                                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Standalone deployment + ticket auth** | Mashup hosted on separate server (IIS, nginx, S3); user gets a one-time ticket from Qlik, mashup exchanges it for a session. Powerful but ~10× more code. Useful only if we ever need to host outside Qlik. |
| **Standalone + JWT**                    | Sign a JWT yourself with a key the Qlik virtual proxy trusts. Good for embedding in third-party portals; not needed for in-Qlik deployment.                                                                 |
| **Standalone + header auth**            | A reverse proxy injects a `Qlik-User: ...` header. Common in enterprise integrations. Not needed for our case.                                                                                              |
| **Anonymous access**                    | Qlik supports anonymous virtual proxies. Useless for an enterprise audience that needs row-level security.                                                                                                  |
| **Custom OIDC layer in front of Qlik**  | Massive overengineering for a personal-account project.                                                                                                                                                     |

**When we'd reconsider:** if we ever want to embed the mashup in another web app outside the Qlik domain (a corporate intranet portal, a customer-facing site), we'd switch to ticket or JWT auth. That's a future-us problem.

## 7. What this means for our project

In code:

- **No `Login.tsx` component.** No token handling. No `useAuth()` hook for sign-in.
- **There IS a `useCurrentUser()` hook.** It calls `GetAuthenticatedUser` once on app start, caches the result via TanStack Query, exposes the directory + user ID to the rest of the app.
- **There is a session-expiry boundary.** A top-level error boundary watches enigma's WebSocket events; when the session dies it shows a friendly "Reload to sign in again" UI.
- **`vite.config.ts` will have a `server.proxy` block** for dev — that's where we'll spend a real morning getting cookies and WebSocket tunneling right.
- **The build artifact** is a static folder (`dist/`) — HTML, JS, CSS, assets. Zip it, upload to Qlik QMC → Content Library, give it a name. That's "deployment."

The mental shorthand: **Qlik owns identity; you own everything else.** Anytime you find yourself reaching for an auth library, stop and ask "is this a content-library deploy?" — if yes, you don't need it.

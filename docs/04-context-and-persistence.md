# The Context & Persistence System

_Last updated: 2026-05-07_

> A multi-month AI-assisted project lives or dies by how well it remembers itself between sessions. This document explains the four-layer system we set up so that Claude — and you — can pick up cold months later and still know what we decided and why.

---

## 1. What is it?

Four files, each playing a distinct role, working together to preserve project context across sessions:

| Layer                     | Path                            | Role                                                  |
| ------------------------- | ------------------------------- | ----------------------------------------------------- |
| **Memory**                | `~\.claude\projects\…\memory\*` | Claude's private notes; auto-loaded each session      |
| **CLAUDE.md**             | Project root                    | Auto-loaded by Claude Code; thin pointer to SKILLS.md |
| **SKILLS.md**             | Project root                    | Source of truth: stack, decisions, open questions     |
| **docs/**                 | Project root                    | Detailed learning record (you're reading it)          |
| **.claude/settings.json** | Project root                    | Permissions allowlist so common commands run silently |

Without this system, each new chat session starts cold — you'd re-explain the project, re-justify decisions, and burn time and tokens reconstructing context. With it, a new session begins with full background loaded automatically.

## 2. Why we use it (in this project)

This project will run for **multiple months**. AI conversations don't naturally remember each other. Three failure modes happen without persistence:

1. **Drift.** Each session, the AI re-derives the project's stack and may suggest something inconsistent with past decisions.
2. **Re-litigation.** You spend tokens re-explaining decisions you already made — exhausting and wasteful.
3. **Lost rationale.** Six months in, _neither of you_ remembers why you chose nebula.js over Capability API. Decisions you should be defending become decisions you start second-guessing.

The persistence system fixes all three: drift becomes impossible because SKILLS.md is the contract; re-litigation becomes unnecessary because memory + CLAUDE.md auto-load context; lost rationale becomes recoverable because every decision in SKILLS.md ships with its **why**.

## 3. How it works

### Layer 1 — Memory (`~\.claude\projects\…\memory\`)

Claude's private, file-based memory system, scoped to this specific working directory. Lives outside the project itself (in your user profile). Files include:

- `MEMORY.md` — index of all memories
- `project_overview.md` — high-level project context
- `feedback_persistent_context.md` — the rule that I must update SKILLS.md when decisions are made
- More are added as the project evolves

Memory is **automatic**. Every time you start a Claude session in this directory, these files load into Claude's context.

### Layer 2 — CLAUDE.md (project root)

A short file in the project root. Claude Code automatically reads it at session start. Ours says: _"Read SKILLS.md first. Update it when decisions are made."_ That's the entire job — it's a router that sends Claude to SKILLS.md.

### Layer 3 — SKILLS.md (project root)

The **source of truth**. Sections:

1. Project goal
2. Confirmed stack
3. Required skills (by category)
4. **Decisions made** (with date and reasoning)
5. **Open questions** (what we still need to resolve)
6. Project context
7. How to use this document

When a new decision is made, it moves from §5 to §4 in the same conversation. This is the durable artifact you can re-read after months away.

### Layer 4 — docs/ (project root)

This folder. Where SKILLS.md says **what** we decided in one line, `docs/` explains **why and how** in depth. SKILLS.md is the index card; `docs/` is the textbook.

### Layer 5 — .claude/settings.json (project root)

Not memory — **permissions**. Allowlists safe commands (`npm install`, `git status`, `vite`, etc.) so Claude doesn't have to ask permission for every command. Denies destructive commands (`rm -rf`, `git push`, `git reset --hard`) explicitly. Saves friction over months of work.

### How a new session bootstraps

```
Claude session starts
  ├─ memory/* auto-loads        → general project background
  ├─ CLAUDE.md auto-loads       → "read SKILLS.md, update it on decisions"
  ├─ Claude reads SKILLS.md     → current stack, decisions, open questions
  └─ Claude consults docs/ when → detailed reasoning needed for a topic
```

Within 30 seconds of session start, Claude has the same context I had at the end of the last session.

## 4. Pros

- **Zero context-rebuilding cost.** Sessions start hot.
- **Decisions stay grounded.** Once recorded, they're defended consistently.
- **Multi-author / multi-machine resilience.** Anyone (you, a teammate, a future you) can read SKILLS.md + docs/ and onboard themselves.
- **Memory survives tool changes.** SKILLS.md and docs/ are plain Markdown in your repo — they outlive any specific AI tool.
- **Explainable.** Every decision has a date, a reason, and a deeper writeup in docs/. No mystery choices.

## 5. Cons

- **Discipline required.** If decisions don't get logged, the system silently degrades. The single failure mode is "we changed our mind in conversation but never updated SKILLS.md."
- **Slight overhead per decision.** Logging takes 30 seconds — acceptable, but real.
- **Memory is Claude-specific.** The `memory/*` files live in `~\.claude\` and don't move with the project. Only SKILLS.md / docs / .claude/settings.json travel with the repo.
- **Risk of doc rot.** If a decision gets reversed but the old reasoning isn't updated, future-you will read stale advice. Discipline mitigates this.

## 6. Alternatives we considered

| Option                           | Why we didn't pick it                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Just rely on Claude's memory     | Memory alone is private to the harness — invisible to humans, not reviewable, doesn't travel with the repo |
| Just write a single big README   | One file becomes unreadable at scale; no separation between "what we decided" and "how it works"           |
| Use Notion / Confluence for docs | Decouples docs from code; updates lag; not auto-loaded by Claude                                           |
| Just CLAUDE.md without SKILLS.md | CLAUDE.md gets bloated; loses the "decisions log with dates" structure                                     |
| Skip permissions allowlist       | Constant prompts over months adds up to real friction and broken flow                                      |

## 7. What this means for our project

Every meaningful decision we make from now on follows this loop:

1. **Discuss** the choice in conversation
2. **Update [SKILLS.md](../SKILLS.md)** — move the question from §5 to §4 with the date and one-line reason
3. **Write a doc** in `docs/` if the decision is substantial enough to warrant the _why and how_ (not every decision needs this; only ones future-you would want explained)
4. **Save a memory** if the decision implies a _behavior_ I should adopt (e.g., "always test against a real Qlik server, never mock")

If you ever come back to this project after a long break and feel lost, the recovery path is:

- Read SKILLS.md → current state in 2 minutes
- Read `docs/README.md` → topic index
- Read whichever `docs/NN-*.md` matches what you're working on
- Ask Claude — its memory and the auto-loaded CLAUDE.md will fill in the rest

# VPathRewards — Claude Code Rules

## Workflow

**Every change must go through a Pull Request.**

- Never commit directly to `master`.
- All work (features, bug fixes, enhancements, config changes) must be done on a new branch and submitted as a PR.
- Branch naming: `feat/description`, `fix/description`, `chore/description`, or `chore/daily-YYYY-MM-DD` for the daily batch (see below).
- The repo owner (solo) reviews and merges all PRs — do not auto-merge.

## PR Batching (Daily)

**Default: batch multiple unrelated changes into one PR per day.** Avoid opening multiple small PRs in the same session.

- Use one date-stamped branch for the day's work: `chore/daily-YYYY-MM-DD` (or `feat/...` if a single feature dominates).
- Each logical change is its own commit on that branch — keep clean per-commit history so the PR can still be reviewed or reverted change-by-change.
- Open one PR at the end of the session whose description lists all commits and what each one does.
- If an open daily branch from today already exists, add to it instead of creating a new one.

**Exception — split out as its own PR immediately:**
- Production-breaking bugs (live service degraded or down)
- Active security issues (exposed secrets, vulnerability needing a fix now)

Everything else — refactors, docs, copy changes, env example edits, follow-up cleanups — waits for the daily batch.

## Branch Strategy

```
master                       ← production-ready, protected
├── chore/daily-YYYY-MM-DD   ← default: daily batch of mixed changes (PR → master)
├── feat/xxx                 ← single-feature branches when a feature dominates
├── fix/xxx                  ← urgent prod-down / security fix branches
└── chore/xxx                ← (legacy single-purpose branches — prefer daily batch)
```

## PR Checklist

Before opening a PR:
- [ ] TypeScript compiles without new errors (`tsc --noEmit`)
- [ ] No secrets or API keys committed
- [ ] `.env` files are not committed (only `.env.example`)
- [ ] PR description explains what changed and why

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** SQLite (local) / PostgreSQL (production via `DATABASE_URL`)
- **AI:** Anthropic Claude (support chat, recommendations, admin insights)
- **Payments:** Stripe (subscriptions, payouts)
- **Hosting:** Railway (backend), configured via environment variables

## Environment Variables

All secrets are managed via Railway environment variables and a local `.env` file (never committed). See `.env.example` for the required keys.

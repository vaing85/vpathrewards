# VPathRewards — Claude Code Rules

## Workflow

**Every change must go through a Pull Request.**

- Never commit directly to `master`.
- All work (features, bug fixes, enhancements, config changes) must be done on a new branch and submitted as a PR.
- Branch naming: `feat/description`, `fix/description`, `chore/description`
- The repo owner (solo) reviews and merges all PRs — do not auto-merge.

## Branch Strategy

```
master          ← production-ready, protected
└── feat/xxx    ← feature branches (PR → master)
└── fix/xxx     ← bug fix branches (PR → master)
└── chore/xxx   ← maintenance branches (PR → master)
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

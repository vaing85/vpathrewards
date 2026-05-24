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

## PR Lifecycle

**All PRs open as drafts.** GitHub disables the merge button on draft PRs, so this prevents premature merges while more commits are still on the way.

- **Open:** `gh pr create --draft ...` — every PR, no exceptions. Never `gh pr create` without `--draft`.
- **Push commits freely** while the PR is a draft — that's the whole point.
- **Mark Ready:** `gh pr ready <number>` — only when done pushing for the session. The owner only merges Ready PRs, never drafts.
- **If pushing more after marking Ready:** either explicitly tell the owner "one more commit — re-check before merging", or `gh pr ready --undo <number>` to put it back into draft and re-mark Ready when truly done.

**Follow-up work after a PR has already merged:**
- If today's daily PR is merged and the owner then asks for more work, open a new branch named `chore/daily-YYYY-MM-DD-part2` (then `-part3`, etc.) and a new PR from it.
- **Never push to a branch whose PR is merged/closed.** Those commits dangle on the branch but don't reach master until rescued into a new PR — easy to lose.

## Branch Strategy

```
master                              ← production-ready, protected
├── chore/daily-YYYY-MM-DD          ← default: daily batch of mixed changes (PR → master, opens as draft)
├── chore/daily-YYYY-MM-DD-partN    ← follow-up after today's daily PR was already merged
├── feat/xxx                        ← single-feature branches when a feature dominates
├── fix/xxx                         ← urgent prod-down / security fix branches
└── chore/xxx                       ← (legacy single-purpose branches — prefer daily batch)
```

## PR Checklist

Before opening a PR:
- [ ] TypeScript compiles without new errors (`tsc --noEmit`)
- [ ] No secrets or API keys committed
- [ ] `.env` files are not committed (only `.env.example`)
- [ ] PR description explains what changed and why
- [ ] PR opened with `--draft` flag

Before marking the PR Ready (`gh pr ready <num>`):
- [ ] All planned commits for this session have been pushed
- [ ] No "one more thing" you know is coming in the next 30 minutes

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** SQLite (local) / PostgreSQL (production via `DATABASE_URL`)
- **AI:** Anthropic Claude (support chat, recommendations, admin insights)
- **Payments:** Stripe (subscriptions, payouts)
- **Hosting:** Railway (backend), configured via environment variables

## Environment Variables

All secrets are managed via Railway environment variables and a local `.env` file (never committed). See `.env.example` for the required keys.

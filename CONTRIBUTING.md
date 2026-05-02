# Contributing

Thanks for considering a contribution. DevFlow Forge is a small project — keep PRs focused.

## Setup

```bash
git clone https://github.com/<your-fork>/devflow-forge.git
cd devflow-forge
./scripts/setup.sh        # or scripts/setup.ps1 on Windows
pnpm dev
```

## Before you submit

- [ ] `pnpm typecheck` passes
- [ ] You haven't added a new dependency unless it's clearly worth its weight
- [ ] You haven't introduced a new framework or generic abstraction; we keep the surface minimal
- [ ] You haven't checked in `.env.local`, `*.db`, `.settings.json`, or `storage/` (they're gitignored — verify with `git status`)

## What we like

- **Bug fixes with a reproducer.** Open an issue first if it's not obvious.
- **New CLI providers.** Add a definition to `apps/web/lib/ai/cli/providers.ts` with the right `enforcesReadOnly` / `enforcesWriteMode` metadata and the smallest possible `buildArgs` mapping. Verify both modes locally.
- **UI polish.** Stay within the existing aesthetic system (tokens in `apps/web/app/globals.css`). Don't introduce a new utility framework.
- **Documentation improvements** to `README.md` and `SECURITY.md`.

## What we won't take

- A second styling system on top of the current `globals.css`.
- Telemetry / analytics phoning home.
- Anything that lowers the "single-user, self-hosted" trust assumption (multi-user RBAC, public sign-up, etc.) unless paired with a serious security review.
- Cosmetic refactors with no behavior change.

## Commit messages

Conventional Commits style:

```
feat: …
fix: …
chore: …
docs: …
```

## Branching

Fork → feature branch off `main` → PR. Keep branches short-lived.

## Issue triage

Issues without a reproducer or environment info will be closed after 14 days.

## Code of conduct

Be civil. Be concrete. Don't post screenshots of secrets.

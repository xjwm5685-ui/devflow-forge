# Security policy

DevFlow Forge is a **single-user, self-hosted developer workbench**. The threat model assumes the person running the server is also the only person using it. Treat it like Cursor or VS Code: powerful local automation, not a multi-tenant SaaS.

## Trust boundary

| Asset                                | Stored where                                       | Notes                                                                                  |
| ------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| GitHub OAuth access token             | SQLite, encrypted with AES-256-GCM                | Key derived from `SESSION_SECRET` (or explicit `TOKEN_ENCRYPTION_KEY`). Cleartext only in process memory. |
| Session JWT                           | Cookie, HttpOnly + SameSite=Lax + Secure in prod  | 7-day expiry, signed with `SESSION_SECRET`.                                            |
| LLM API key                           | `.settings.json` next to the app, base64 obfuscated | **Not strong encryption.** Filesystem permissions are the real boundary.              |
| GitHub OAuth client secret            | `.env.local`, never persisted in DB                | Only the OAuth callback handler reads it.                                              |
| Repository file snapshot              | `storage/cli-workspaces/<taskId>/`                | Materialized per-task, deleted when the task ends.                                     |
| Generated audio / video               | `storage/audio/<docId>/`, `storage/video/<docId>/` | Served via `/api/generated/...` after session + ownership check + path traversal guard. |

## What's intentionally dangerous

These behaviors exist because the project is for **your own machine**. They become attack surface if you expose the server publicly.

1. **Custom CLI bridge.** `AI_CLI_PROVIDER=custom` lets you specify any binary plus arg templates. Anyone with a session can trigger that binary on the host.
2. **Docker deploy.** The deployments page runs `docker build` and `docker run` against the host's Docker socket. Anyone with a session can spawn containers and bind ports in the 41000-41999 range.
3. **GitHub PR creation.** A signed-in user with a connected GitHub account can open PRs against any repo their token can write.
4. **Workspace-write CLI mode.** When enabled, the CLI can edit files inside the materialized per-task workspace. DevFlow refuses to run if the resolved cwd would overlap the app source tree, but it does not sandbox the CLI itself.

## Mitigations already in place

- ✅ OAuth state CSRF token (10-minute cookie) verified on callback.
- ✅ All cookies HttpOnly + SameSite=Lax + Secure (production with HTTPS hostname).
- ✅ tRPC mutations require `protectedProcedure`; project / workflow / deployment routes enforce per-user ownership.
- ✅ `child_process.spawn(..., { shell: false })` — no shell injection on CLI args.
- ✅ Generated assets endpoint verifies session, document ownership, and rejects path-traversal payloads.
- ✅ GitHub API errors are mapped to TRPC error codes; raw response bodies are only logged server-side.
- ✅ Per-task CLI workspaces are materialized under `storage/cli-workspaces/<taskId>/` and removed when the task finishes.

## Hardening recommendations for self-hosters

- Run inside Docker (`docker compose up`); the supplied compose file uses an unprivileged user.
- Reverse-proxy with HTTPS and a reasonable `Content-Security-Policy`.
- Set `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, and `GITHUB_CLIENT_SECRET` via your secret manager — not committed env files.
- Disable `AI_CLI_PROVIDER=custom` (UI hides it when the env var is unset) before exposing the host to anyone you don't fully trust.
- Don't expose the Docker socket through DevFlow; consider running `simulateDeployment` against a sandboxed remote builder if you need multi-user.

## Reporting a vulnerability

Please open a private security advisory:

1. Go to the repo on GitHub
2. **Security** tab → **Report a vulnerability**

Or email the maintainer directly. Please **do not** open a public issue for security problems. We aim to respond within 7 days.

## Disclosure policy

- We acknowledge receipt within 7 days.
- We coordinate a fix and disclosure timeline with you.
- Credit is given in the release notes unless you prefer to remain anonymous.

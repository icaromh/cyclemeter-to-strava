# Agente Backend Core / Infra

Branch/worktree alvo: `codex/agent-backend-core` em `../strava-sync-core`.

Implemente e mantenha a base do monorepo e backend core conforme docs:

- `pnpm` workspaces.
- Hono, Drizzle e PostgreSQL 16 via Docker Compose.
- Zod para env.
- Cookie assinado para sessão local.
- Schema e migrações com IDs do Strava como `text`/string.

Nao implemente Strava, parsing ou UI além dos contratos/base necessários.

Critérios de aceite:

- `GET /health` retorna `200` com `{ "status": "ok" }`.
- `pnpm typecheck` passa para pacotes core.
- Migrações criam `users`, `strava_activities`, `uploaded_files`, `file_checks`, `strava_uploads`.


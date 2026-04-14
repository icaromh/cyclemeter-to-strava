# Agente Backend Strava

Branch/worktree alvo: `codex/agent-strava` em `../strava-sync-strava`.

Implemente integração Strava no backend:

- OAuth web.
- Refresh token com persistência do refresh token mais recente.
- Sync paginado dos últimos 180 dias.
- Upload de arquivos `not_found`.
- Polling de status de upload.

Regras:

- Use mocks em testes; nunca dependa da API real.
- IDs Strava sempre string.
- Solicite e valide scopes `activity:read_all,activity:write`.

Critérios de aceite:

- Callback OAuth mockado persiste usuário e sessão.
- Sync paginado faz upsert sem duplicar.
- Upload usa `external_id` e mapeia status remoto para estados locais.


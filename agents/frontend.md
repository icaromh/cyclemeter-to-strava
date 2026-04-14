# Agente Frontend

Branch/worktree alvo: `codex/agent-frontend` em `../strava-sync-frontend`.

Implemente o frontend React/Vite com:

- Router.
- TanStack Query.
- Componentes locais estilo shadcn/ui.
- Login, dashboard, upload/check, tabela filtrável e progresso de uploads.

Use contratos compartilhados e mocks temporários quando o backend ainda não estiver integrado. Não altere backend salvo tipos compartilhados combinados.

Critérios de aceite:

- Rotas `login`, `dashboard` e `upload` funcionam.
- Botão de upload envia apenas checks `not_found`.
- Polling de upload para em `uploaded`, `duplicate` ou `failed`.


# Strava Sync Checker

Aplicacao local para comparar arquivos de atividades (`.gpx`, `.tcx`, `.fit`) com atividades recentes do Strava e enviar apenas os arquivos que parecem nao existir na conta.

## Documentacao tecnica

- [Estrutura do projeto](docs/project-structure.md)
- [Schema inicial do banco](docs/database-schema.md)
- [Contratos da API](docs/api-contracts.md)
- [Backlog tecnico](docs/technical-backlog.md)
- [Agentes de implementacao](agents/backend-core.md)

## MVP

1. Conectar uma conta Strava via OAuth2.
2. Sincronizar atividades dos ultimos 180 dias.
3. Receber upload de arquivos `.gpx`, `.tcx` e `.fit`.
4. Comparar arquivos com o cache local de atividades Strava.
5. Mostrar arquivos encontrados, provaveis, nao encontrados e erros de parse.
6. Enviar ao Strava apenas arquivos `not_found`.
7. Acompanhar o status do processamento do upload.

## Setup local

```bash
pnpm install
pnpm docker:up
cp .env.example .env
pnpm db:migrate
pnpm dev
```

O workspace usa `minimumReleaseAge: 28800` no `pnpm-workspace.yaml`, equivalente a 20 dias em minutos.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Worktrees dos agentes

Depois de integrar o bootstrap em um branch base, crie os worktrees:

```bash
git worktree add ../strava-sync-core -b codex/agent-backend-core
git worktree add ../strava-sync-strava -b codex/agent-strava
git worktree add ../strava-sync-files -b codex/agent-files-matching
git worktree add ../strava-sync-frontend -b codex/agent-frontend
```

Os prompts estao em `agents/`.

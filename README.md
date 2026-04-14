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

## Backup do banco local

Para gerar uma copia do estado atual do PostgreSQL local:

```bash
pnpm db:dump
```

O arquivo sera criado em `.data/db-dumps/` no formato `custom` do `pg_dump`, por exemplo:

```text
.data/db-dumps/strava_sync_20260414_181500.dump
```

Esse formato e o mais pratico para restaurar em outro PostgreSQL, incluindo Supabase:

```bash
pg_restore \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --dbname "postgresql://USER:PASSWORD@HOST:5432/postgres" \
  .data/db-dumps/strava_sync_YYYYMMDD_HHMMSS.dump
```

Se precisar de um arquivo SQL legivel, rode:

```bash
FORMAT=sql pnpm db:dump
```

O script aceita variaveis para casos especiais:

```bash
OUTPUT_DIR=/tmp/strava-dumps FORMAT=custom pnpm db:dump
POSTGRES_SERVICE=postgres POSTGRES_USER=strava_sync POSTGRES_DB=strava_sync pnpm db:dump
```

Atencao: o dump contem tokens OAuth do Strava nas colunas `users.access_token` e `users.refresh_token`. Nao compartilhe esse arquivo sem sanitizar ou rotacionar as credenciais.

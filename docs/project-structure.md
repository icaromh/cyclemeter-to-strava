# Estrutura Do Projeto

## Monorepo

```txt
strava-sync-checker/
  apps/
    frontend/
      src/
        app/
        components/
        features/
          auth/
          activities/
          files/
          uploads/
        lib/
        routes/
    backend/
      src/
        config/
        db/
          migrations/
          schema/
        http/
          middleware/
          routes/
        modules/
          auth/
          activities/
          files/
          matching/
          strava/
          uploads/
        storage/
        test/
  packages/
    shared/
      src/
        api/
        schemas/
        types/
  infra/
    docker/
      docker-compose.yml
  docs/
```

## Responsabilidades

`apps/frontend`

- React, Vite e TypeScript.
- React Router para rotas.
- TanStack Query para cache e chamadas HTTP.
- UI de login, dashboard, upload/check e progresso de uploads.
- Consome contratos de `packages/shared`.

`apps/backend`

- Hono em Node.js com TypeScript.
- OAuth2 Strava, refresh token e sessao local.
- Sync paginado de atividades dos ultimos 180 dias.
- Upload multipart, persistencia temporaria em disco e parse de arquivos.
- Matching entre arquivos locais e cache Strava.
- Upload para Strava e polling de status.

`packages/shared`

- Schemas Zod.
- Tipos compartilhados de requests/responses.
- Enums de status de check, parse e upload.

`infra/docker`

- Docker Compose local.
- PostgreSQL 16 com volume persistente.
- Redis fica fora do MVP inicial.

## Variaveis de ambiente

Backend:

```txt
PORT=3000
DATABASE_URL=postgres://strava_sync:strava_sync@localhost:5432/strava_sync
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:3000/auth/strava/callback
SESSION_SECRET=
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=.data/uploads
```

Frontend:

```txt
VITE_API_URL=http://localhost:3000
```


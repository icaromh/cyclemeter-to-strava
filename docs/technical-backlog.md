# Backlog Tecnico

## Milestone 0: Preparacao

### INF-001 Criar monorepo

Entrega:

- Estrutura `apps/frontend`, `apps/backend`, `packages/shared`, `infra/docker`, `docs`.
- Workspaces configurados.
- TypeScript base compartilhado.

Aceite:

- `npm install` instala dependencias do workspace.
- `npm run typecheck` existe no root, mesmo que inicialmente delegue para pacotes vazios.

### INF-002 Configurar Docker Compose com Postgres

Entrega:

- `infra/docker/docker-compose.yml` com PostgreSQL 16.
- Volume persistente local.
- Credenciais de desenvolvimento.

Aceite:

- `docker compose up -d` sobe o banco.
- `DATABASE_URL` do `.env.example` conecta no container.

### INF-003 Criar `.env.example`

Entrega:

- Variaveis do backend e frontend documentadas.

Aceite:

- Um dev novo consegue criar `.env` local a partir do exemplo.

## Milestone 1: Backend Base

### BE-001 Inicializar Hono

Entrega:

- App Hono em TypeScript.
- Rota `GET /health`.
- Tratamento padrao de erro.

Aceite:

- `GET /health` retorna `200` com `{ "status": "ok" }`.

### BE-002 Configurar env e logger

Entrega:

- Validacao de env com Zod.
- Logger HTTP basico.

Aceite:

- Backend falha no boot com erro claro se env obrigatoria estiver ausente.

### BE-003 Configurar Drizzle

Entrega:

- Cliente Drizzle.
- Schema inicial.
- Scripts de migrate/generate.

Aceite:

- Migrações criam tabelas `users`, `strava_activities`, `uploaded_files`, `file_checks`, `strava_uploads`.

## Milestone 2: Frontend Base

### FE-001 Inicializar Vite React

Entrega:

- React + Vite + TypeScript.
- React Router.
- TanStack Query.

Aceite:

- App abre localmente e navega entre telas base.

### FE-002 Criar layout e rotas vazias

Entrega:

- Rotas de login, dashboard e upload/check.
- Client HTTP com `VITE_API_URL`.

Aceite:

- Cada rota renderiza estado vazio funcional.

## Milestone 3: Auth Strava

### STR-001 Implementar inicio do OAuth

Entrega:

- `GET /auth/strava/start`.
- Scopes para leitura e upload.
- State para retorno seguro.

Aceite:

- Rota redireciona para Strava com client id, redirect uri e scopes corretos.

### STR-002 Implementar callback OAuth

Entrega:

- `GET /auth/strava/callback`.
- Troca code por tokens.
- Upsert de usuario por `strava_athlete_id`.
- Sessao local.

Aceite:

- Usuario autenticado retorna ao frontend com sessao valida.

### STR-003 Implementar refresh token

Entrega:

- Servico que renova access token expirado antes de chamadas Strava.

Aceite:

- Chamadas Strava usam token valido sem exigir login manual a cada expiracao.

## Milestone 4: Sync De Atividades

### ACT-001 Listar atividades paginadas do Strava

Entrega:

- Cliente Strava para endpoint de atividades.
- Suporte a paginação e janela dos ultimos 180 dias.

Aceite:

- Servico para quando a API retorna pagina vazia ou atividades fora da janela.

### ACT-002 Persistir cache local

Entrega:

- Upsert em `strava_activities`.
- Armazenamento de `raw_json`.

Aceite:

- Reexecutar sync nao duplica atividades.

### ACT-003 Expor endpoints de atividades

Entrega:

- `POST /activities/sync-180d`.
- `GET /activities/summary`.

Aceite:

- Frontend consegue disparar sync e ler quantidade sincronizada.

## Milestone 5: Upload E Parse

### FILE-001 Receber multipart

Entrega:

- `POST /files/check` aceita multiplos arquivos.
- Validacao de extensoes `.gpx`, `.tcx`, `.fit`.
- Persistencia em `UPLOAD_DIR`.
- Hash de arquivo.

Aceite:

- Arquivos validos sao salvos e registrados em `uploaded_files`.

### FILE-002 Parsear GPX e TCX

Entrega:

- Extração de inicio, distancia, duracao e tipo quando disponivel.
- Status `parsed` ou `parse_error`.

Aceite:

- Fixtures GPX/TCX cobrem sucesso e erro de parse.

### FILE-003 Parsear FIT

Entrega:

- Parser FIT com fixtures reais.
- Normalizacao para o mesmo shape de GPX/TCX.

Aceite:

- Arquivo FIT real gera metadados minimos para matching.

## Milestone 6: Matching

### MATCH-001 Buscar candidatas

Entrega:

- Consulta por `user_id` e janela de `parsed_start_date +/- 10 minutos`.

Aceite:

- Busca usa indice por usuario e data.

### MATCH-002 Calcular score

Entrega:

- Comparacao de distancia, duracao e tipo.
- Classificacao `match_confirmed`, `match_probable`, `not_found`, `parse_error`.

Aceite:

- Testes unitarios cobrem falso positivo obvio, match claro e arquivo sem metadados.

### MATCH-003 Persistir e responder checks

Entrega:

- Insercao em `file_checks`.
- Resposta completa no contrato de `POST /files/check`.

Aceite:

- Upload multipart retorna lista de resultados pronta para UI.

## Milestone 7: UI De Checagem

### FE-003 Tela de upload/check

Entrega:

- Drag-and-drop.
- Tabela de resultados.
- Filtros por status.

Aceite:

- Usuario consegue subir arquivos e ver status de matching.

### FE-004 Acoes de sync e upload dos ausentes

Entrega:

- Botao de sync manual.
- Botao para enviar apenas `not_found`.

Aceite:

- Botao de upload nao inclui `match_confirmed`, `match_probable` ou `parse_error`.

## Milestone 8: Upload Ao Strava

### UP-001 Enviar arquivos not_found

Entrega:

- `POST /uploads/missing`.
- Uso de `external_id`.
- Persistencia em `strava_uploads`.

Aceite:

- Endpoint recusa arquivos que nao estejam com check `not_found`.

### UP-002 Polling de status

Entrega:

- `GET /uploads/status/:id`.
- Consulta ao status do upload no Strava.
- Atualizacao local para `processing`, `uploaded`, `duplicate` ou `failed`.

Aceite:

- UI consegue consultar status por upload ate estado final.

## Milestone 9: Progresso Na UI

### FE-005 Progresso por arquivo

Entrega:

- Lista de uploads.
- Polling via TanStack Query.
- Estados `pending`, `processing`, `uploaded`, `duplicate`, `failed`.

Aceite:

- Usuario ve o resultado final de cada arquivo enviado.

## Milestone 10: Estabilizacao

### QA-001 Testes de API

Entrega:

- Testes de integracao para health, auth callback mockado, sync mockado, file check e uploads mockados.

Aceite:

- Suite roda localmente sem depender da API real do Strava.

### QA-002 Documentar onboarding local

Entrega:

- README com setup completo.
- Comandos para banco, migracoes, backend e frontend.

Aceite:

- Dev novo consegue rodar o MVP local seguindo o README.


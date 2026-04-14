# Strava Sync Checker

Aplicacao local para comparar arquivos de atividades (`.gpx`, `.tcx`, `.fit`) com atividades recentes do Strava e enviar apenas os arquivos que parecem nao existir na conta.

## Documentacao tecnica

- [Estrutura do projeto](docs/project-structure.md)
- [Schema inicial do banco](docs/database-schema.md)
- [Contratos da API](docs/api-contracts.md)
- [Backlog tecnico](docs/technical-backlog.md)

## MVP

1. Conectar uma conta Strava via OAuth2.
2. Sincronizar atividades dos ultimos 180 dias.
3. Receber upload de arquivos `.gpx`, `.tcx` e `.fit`.
4. Comparar arquivos com o cache local de atividades Strava.
5. Mostrar arquivos encontrados, provaveis, nao encontrados e erros de parse.
6. Enviar ao Strava apenas arquivos `not_found`.
7. Acompanhar o status do processamento do upload.


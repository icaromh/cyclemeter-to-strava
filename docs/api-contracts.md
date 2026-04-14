# Contratos Da API

Base local sugerida: `http://localhost:3000`.

Todas as respostas de erro usam o formato:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

## Auth

### GET /auth/strava/start

Redireciona para o OAuth do Strava.

Query opcional:

```txt
returnTo=/upload
```

Resposta:

- `302` para o Strava.

### GET /auth/strava/callback

Troca `code` por tokens, persiste usuario e cria sessao local.

Query recebida do Strava:

```txt
code=...
scope=...
state=...
```

Resposta:

- `302` para `FRONTEND_URL`.

## Atividades

### POST /activities/sync-180d

Sincroniza atividades dos ultimos 180 dias.

Request:

```json
{}
```

Response `200`:

```json
{
  "syncedCount": 42,
  "windowStart": "2025-10-16T00:00:00.000Z",
  "windowEnd": "2026-04-14T00:00:00.000Z",
  "lastSyncedAt": "2026-04-14T08:30:00.000Z"
}
```

### GET /activities/summary

Response `200`:

```json
{
  "activityCount": 42,
  "lastSyncedAt": "2026-04-14T08:30:00.000Z"
}
```

## Arquivos

### POST /files/check

Recebe multiplos arquivos, parseia e compara com atividades sincronizadas.

Content-Type:

```txt
multipart/form-data
```

Campos:

```txt
files[] = activity.gpx
files[] = activity.fit
```

Response `200`:

```json
{
  "results": [
    {
      "uploadedFileId": "9d89b1c3-0a54-43ab-a7b8-bdcbb55d4bd2",
      "originalFilename": "ride.gpx",
      "parseStatus": "parsed",
      "matchStatus": "not_found",
      "confidenceScore": 0,
      "reason": "Nenhuma atividade encontrada na janela de +/-10 minutos.",
      "parsed": {
        "startDate": "2026-04-10T06:30:00.000Z",
        "distanceMeters": 35210.4,
        "durationSeconds": 5420,
        "sportType": "Ride"
      },
      "matchedActivity": null
    },
    {
      "uploadedFileId": "0b6f84d5-07f3-4dbf-b743-1ee9cf11b63e",
      "originalFilename": "run.tcx",
      "parseStatus": "parsed",
      "matchStatus": "match_confirmed",
      "confidenceScore": 0.9825,
      "reason": "Horario, distancia e duracao dentro das tolerancias.",
      "parsed": {
        "startDate": "2026-04-11T17:20:00.000Z",
        "distanceMeters": 8021.2,
        "durationSeconds": 2610,
        "sportType": "Run"
      },
      "matchedActivity": {
        "id": "b5ab902c-25e1-4daa-9c8c-39d905162159",
        "stravaActivityId": 1234567890,
        "name": "Evening Run",
        "startDate": "2026-04-11T17:21:00.000Z",
        "distanceMeters": 8009.8,
        "movingTimeSeconds": 2601,
        "sportType": "Run"
      }
    }
  ]
}
```

### GET /files/checks

Lista checks recentes.

Query:

```txt
status=not_found
limit=50
```

Response `200`:

```json
{
  "items": [
    {
      "uploadedFileId": "9d89b1c3-0a54-43ab-a7b8-bdcbb55d4bd2",
      "originalFilename": "ride.gpx",
      "matchStatus": "not_found",
      "confidenceScore": 0,
      "reason": "Nenhuma atividade encontrada na janela de +/-10 minutos.",
      "checkedAt": "2026-04-14T08:31:00.000Z"
    }
  ],
  "nextCursor": null
}
```

## Uploads

### POST /uploads/missing

Envia ao Strava arquivos marcados como `not_found`.

Request:

```json
{
  "uploadedFileIds": [
    "9d89b1c3-0a54-43ab-a7b8-bdcbb55d4bd2"
  ]
}
```

Response `202`:

```json
{
  "uploads": [
    {
      "id": "970eff26-5c4d-4828-87ee-f240308f0a07",
      "uploadedFileId": "9d89b1c3-0a54-43ab-a7b8-bdcbb55d4bd2",
      "stravaUploadId": 987654321,
      "externalId": "strava-sync-9d89b1c3-0a54-43ab-a7b8-bdcbb55d4bd2",
      "uploadStatus": "submitted"
    }
  ]
}
```

### GET /uploads/status/:id

Retorna o estado local mais recente. O backend pode atualizar o status consultando o Strava antes de responder.

Response `200`:

```json
{
  "id": "970eff26-5c4d-4828-87ee-f240308f0a07",
  "uploadedFileId": "9d89b1c3-0a54-43ab-a7b8-bdcbb55d4bd2",
  "stravaUploadId": 987654321,
  "stravaActivityId": 1234567891,
  "uploadStatus": "uploaded",
  "errorMessage": null,
  "updatedAt": "2026-04-14T08:34:00.000Z"
}
```


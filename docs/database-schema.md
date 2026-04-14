# Schema Inicial Do Banco

Banco alvo: PostgreSQL 16 via Drizzle ORM.

## Enums

```txt
parse_status = pending | parsed | parse_error
match_status = match_confirmed | match_probable | not_found | parse_error
upload_status = pending | submitted | processing | uploaded | duplicate | failed
```

## users

Guarda identidade local e credenciais Strava.

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | pk |
| strava_athlete_id | text | unique, not null |
| username | text | nullable |
| access_token | text | not null |
| refresh_token | text | not null |
| token_expires_at | timestamptz | not null |
| accepted_scopes | text | not null, lista separada por virgulas |
| created_at | timestamptz | default now |
| updated_at | timestamptz | default now |

Indices:

- `users_strava_athlete_id_unique` em `strava_athlete_id`.

## strava_activities

Cache local das atividades sincronizadas.

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | pk |
| user_id | uuid | fk users.id, not null |
| strava_activity_id | text | not null |
| name | text | not null |
| sport_type | text | nullable |
| start_date | timestamptz | not null |
| timezone | text | nullable |
| distance_meters | numeric(12,2) | nullable |
| moving_time_seconds | integer | nullable |
| elapsed_time_seconds | integer | nullable |
| raw_json | jsonb | not null |
| synced_at | timestamptz | default now |

Indices:

- unique `strava_activities_user_strava_activity_unique` em `(user_id, strava_activity_id)`.
- `strava_activities_user_start_date_idx` em `(user_id, start_date)`.

## uploaded_files

Representa cada arquivo recebido para checagem.

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | pk |
| user_id | uuid | fk users.id, not null |
| original_filename | text | not null |
| stored_path | text | not null |
| mime_type | text | nullable |
| file_size | integer | not null |
| file_hash | text | not null |
| parsed_start_date | timestamptz | nullable |
| parsed_distance_meters | numeric(12,2) | nullable |
| parsed_duration_seconds | integer | nullable |
| parsed_sport_type | text | nullable |
| parse_status | parse_status | not null, default pending |
| parse_error | text | nullable |
| created_at | timestamptz | default now |

Indices:

- unique `uploaded_files_user_file_hash_unique` em `(user_id, file_hash)`.
- `uploaded_files_user_created_at_idx` em `(user_id, created_at)`.

## file_checks

Resultado do matching de cada arquivo.

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | pk |
| uploaded_file_id | uuid | fk uploaded_files.id, not null |
| matched_strava_activity_id | uuid | fk strava_activities.id, nullable |
| match_status | match_status | not null |
| confidence_score | numeric(5,4) | not null |
| reason | text | not null |
| checked_at | timestamptz | default now |

Indices:

- `file_checks_uploaded_file_id_idx` em `uploaded_file_id`.
- `file_checks_match_status_idx` em `match_status`.

## strava_uploads

Resultado do envio ao Strava.

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | pk |
| uploaded_file_id | uuid | fk uploaded_files.id, not null |
| strava_upload_id | text | nullable |
| strava_activity_id | text | nullable |
| external_id | text | not null |
| upload_status | upload_status | not null, default pending |
| error_message | text | nullable |
| created_at | timestamptz | default now |
| updated_at | timestamptz | default now |

Indices:

- unique `strava_uploads_uploaded_file_id_unique` em `uploaded_file_id`.
- unique `strava_uploads_external_id_unique` em `external_id`.
- `strava_uploads_status_idx` em `upload_status`.

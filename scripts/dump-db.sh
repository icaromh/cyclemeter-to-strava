#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/infra/docker/docker-compose.yml}"
SERVICE="${POSTGRES_SERVICE:-postgres}"
DB_USER="${POSTGRES_USER:-strava_sync}"
DB_NAME="${POSTGRES_DB:-strava_sync}"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/.data/db-dumps}"
FORMAT="${FORMAT:-custom}"

case "$FORMAT" in
  custom)
    PG_DUMP_FORMAT="custom"
    EXTENSION="dump"
    ;;
  plain|sql)
    PG_DUMP_FORMAT="plain"
    EXTENSION="sql"
    ;;
  *)
    echo "Unsupported FORMAT: $FORMAT. Use custom, plain, or sql." >&2
    exit 1
    ;;
esac

mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="$OUTPUT_DIR/${DB_NAME}_${TIMESTAMP}.${EXTENSION}"

docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format="$PG_DUMP_FORMAT" \
  --no-owner \
  --no-privileges \
  > "$OUTPUT_FILE"

echo "$OUTPUT_FILE"

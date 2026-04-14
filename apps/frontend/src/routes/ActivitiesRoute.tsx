import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StravaActivityListItem } from "@strava-sync/shared";
import { Button } from "../components/ui/Button";
import { api } from "../lib/api";

const pageSize = 50;

export function ActivitiesRoute() {
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [sportType, setSportType] = useState("");
  const activities = useQuery({
    queryKey: ["activities", offset, search, sportType],
    queryFn: () => {
      const options: { limit: number; offset: number; search?: string; sportType?: string } = {
        limit: pageSize,
        offset
      };
      const trimmedSearch = search.trim();
      if (trimmedSearch) options.search = trimmedSearch;
      if (sportType) options.sportType = sportType;
      return api.listActivities(options);
    }
  });
  const sportOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (activities.data?.items ?? [])
            .map((activity) => activity.sportType)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [activities.data?.items]
  );

  function resetAndSetSearch(value: string) {
    setSearch(value);
    setOffset(0);
  }

  function resetAndSetSportType(value: string) {
    setSportType(value);
    setOffset(0);
  }

  return (
    <section className="stack">
      <div>
        <h1>Atividades sincronizadas</h1>
        <p className="muted">Confira o cache local vindo do Strava antes de comparar arquivos.</p>
      </div>

      {activities.error ? <div className="error">{activities.error.message}</div> : null}

      <div className="panel stack">
        <div className="row spread">
          <div>
            <strong>{activities.data?.total ?? 0}</strong>
            <div className="muted">atividades no cache local</div>
          </div>
          {activities.isFetching ? <span className="muted">Atualizando...</span> : null}
        </div>
        <div className="filters-grid">
          <label>
            Buscar
            <input
              value={search}
              onChange={(event) => resetAndSetSearch(event.target.value)}
              placeholder="Nome, tipo ou external ID"
            />
          </label>
          <label>
            Tipo
            <select value={sportType} onChange={(event) => resetAndSetSportType(event.target.value)}>
              <option value="">Todos</option>
              {sportOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ActivitiesTable items={activities.data?.items ?? []} />
        <div className="row spread">
          <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>
            Anteriores
          </Button>
          <span className="muted">
            {formatPageRange(activities.data?.offset ?? 0, activities.data?.items.length ?? 0)} de {activities.data?.total ?? 0}
          </span>
          <Button
            variant="secondary"
            disabled={!activities.data?.nextOffset}
            onClick={() => setOffset(activities.data?.nextOffset ?? offset)}
          >
            Proximas
          </Button>
        </div>
      </div>
    </section>
  );
}

function ActivitiesTable({ items }: { items: StravaActivityListItem[] }) {
  if (items.length === 0) return <p className="muted">Nenhuma atividade encontrada.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Nome</th>
            <th>External ID</th>
            <th>Tipo</th>
            <th>Distancia</th>
            <th>Tempo</th>
            <th>Strava ID</th>
          </tr>
        </thead>
        <tbody>
          {items.map((activity) => (
            <tr key={activity.id}>
              <td>{new Date(activity.startDate).toLocaleString()}</td>
              <td>{activity.name}</td>
              <td>{activity.externalId ?? "-"}</td>
              <td>{activity.sportType ?? "-"}</td>
              <td>{formatDistance(activity.distanceMeters)}</td>
              <td>{formatDuration(activity.movingTimeSeconds ?? activity.elapsedTimeSeconds)}</td>
              <td>
                <a href={stravaActivityUrl(activity.stravaActivityId)} target="_blank" rel="noreferrer">
                  {activity.stravaActivityId}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function formatDistance(distanceMeters: number | null) {
  if (distanceMeters === null) return "-";
  if (distanceMeters >= 1000) return `${(distanceMeters / 1000).toFixed(2)} km`;
  return `${Math.round(distanceMeters)} m`;
}

export function formatDuration(seconds: number | null) {
  if (seconds === null) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export function formatPageRange(offset: number, itemCount: number) {
  if (itemCount === 0) return "0";
  return `${offset + 1}-${offset + itemCount}`;
}

export function stravaActivityUrl(stravaActivityId: string) {
  return `https://www.strava.com/activities/${stravaActivityId}`;
}

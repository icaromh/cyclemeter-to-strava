import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "../components/ui/Button";
import { api } from "../lib/api";

export function DashboardRoute() {
  const queryClient = useQueryClient();
  const [windowStart, setWindowStart] = useState(() => toDateInputValue(daysAgo(180)));
  const [windowEnd, setWindowEnd] = useState(() => toDateInputValue(new Date()));
  const summary = useQuery({ queryKey: ["activity-summary"], queryFn: api.activitySummary });
  const sync = useMutation({
    mutationFn: () => api.syncActivitiesRange({ windowStart, windowEnd }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activity-summary"] })
  });

  return (
    <section className="stack">
      <div>
        <h1>Dashboard</h1>
        <p className="muted">Escolha o intervalo para sincronizar antes de checar arquivos.</p>
      </div>
      {summary.error ? <div className="error">{summary.error.message}</div> : null}
      <div className="panel stack">
        <div className="row">
          <div>
            <strong>{summary.data?.activityCount ?? 0}</strong>
            <div className="muted">atividades sincronizadas</div>
          </div>
          <div>
            <strong>{summary.data?.lastSyncedAt ? new Date(summary.data.lastSyncedAt).toLocaleString() : "Nunca"}</strong>
            <div className="muted">ultimo sync</div>
          </div>
        </div>
        <div className="filters-grid">
          <label>
            Inicio
            <input type="date" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} />
          </label>
          <label>
            Fim
            <input type="date" value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} />
          </label>
        </div>
        <div className="row">
          <Button disabled={sync.isPending} onClick={() => sync.mutate()}>
            {sync.isPending ? "Sincronizando..." : "Sincronizar intervalo"}
          </Button>
          <Link className="button-link" to="/activities">
            Ver atividades
          </Link>
          {sync.data ? <span className="muted">{sync.data.syncedCount} atividades processadas</span> : null}
        </div>
      </div>
    </section>
  );
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export function toDateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

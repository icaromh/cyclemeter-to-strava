import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import { api } from "../lib/api";

export function DashboardRoute() {
  const queryClient = useQueryClient();
  const summary = useQuery({ queryKey: ["activity-summary"], queryFn: api.activitySummary });
  const sync = useMutation({
    mutationFn: api.syncActivities,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activity-summary"] })
  });

  return (
    <section className="stack">
      <div>
        <h1>Dashboard</h1>
        <p className="muted">Sincronize os ultimos 180 dias antes de checar arquivos.</p>
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
        <div className="row">
          <Button disabled={sync.isPending} onClick={() => sync.mutate()}>
            {sync.isPending ? "Sincronizando..." : "Sincronizar 180 dias"}
          </Button>
          {sync.data ? <span className="muted">{sync.data.syncedCount} atividades processadas</span> : null}
        </div>
      </div>
    </section>
  );
}


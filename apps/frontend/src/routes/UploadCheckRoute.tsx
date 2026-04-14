import { useMemo, useState } from "react";
import { useMutation, useQueries } from "@tanstack/react-query";
import type { FileCheckResult, UploadItem } from "@strava-sync/shared";
import { Button } from "../components/ui/Button";
import { api } from "../lib/api";

const filters = ["all", "not_found", "match_confirmed", "match_probable", "parse_error"] as const;

export function UploadCheckRoute() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FileCheckResult[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const check = useMutation({
    mutationFn: api.checkFiles,
    onSuccess: (data) => setResults(data.results)
  });
  const uploadMissing = useMutation({
    mutationFn: api.uploadMissing,
    onSuccess: (data) => setUploads(data.uploads)
  });

  const uploadStatuses = useQueries({
    queries: uploads.map((upload) => ({
      queryKey: ["upload-status", upload.id],
      queryFn: () => api.uploadStatus(upload.id),
      refetchInterval: (query: any) => {
        const status = query.state.data?.uploadStatus ?? upload.uploadStatus;
        return ["pending", "submitted", "processing"].includes(status) ? 1000 : false;
      }
    }))
  });

  const visibleResults = useMemo(
    () => results.filter((result) => filter === "all" || result.matchStatus === filter),
    [filter, results]
  );
  const missingIds = results.filter((result) => result.matchStatus === "not_found").map((result) => result.uploadedFileId);

  return (
    <section className="stack">
      <div>
        <h1>Checar arquivos</h1>
        <p className="muted">Envie GPX, TCX ou FIT para comparar com as atividades sincronizadas.</p>
      </div>
      {check.error ? <div className="error">{check.error.message}</div> : null}
      {uploadMissing.error ? <div className="error">{uploadMissing.error.message}</div> : null}
      <div className="dropzone">
        <input
          type="file"
          multiple
          accept=".gpx,.tcx,.fit"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        <div className="row">
          <Button disabled={files.length === 0 || check.isPending} onClick={() => check.mutate(files)}>
            {check.isPending ? "Checando..." : "Checar arquivos"}
          </Button>
          <span className="muted">{files.length} arquivos selecionados</span>
        </div>
      </div>

      <div className="panel stack">
        <div className="row">
          {filters.map((item) => (
            <Button key={item} variant={filter === item ? "primary" : "secondary"} onClick={() => setFilter(item)}>
              {item}
            </Button>
          ))}
        </div>
        <div className="row">
          <Button
            disabled={missingIds.length === 0 || uploadMissing.isPending}
            onClick={() => uploadMissing.mutate(missingIds)}
          >
            {uploadMissing.isPending ? "Enviando..." : `Enviar ${missingIds.length} ausentes`}
          </Button>
        </div>
        <ResultsTable results={visibleResults} />
      </div>

      {uploads.length > 0 ? (
        <div className="panel stack">
          <h2>Uploads</h2>
          {uploads.map((upload, index) => {
            const status = uploadStatuses[index]?.data;
            return (
              <div className="row" key={upload.id}>
                <span>{upload.externalId}</span>
                <span className={badgeClass(status?.uploadStatus ?? upload.uploadStatus)}>
                  {status?.uploadStatus ?? upload.uploadStatus}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function ResultsTable({ results }: { results: FileCheckResult[] }) {
  if (results.length === 0) return <p className="muted">Nenhum resultado ainda.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Arquivo</th>
            <th>Status</th>
            <th>Inicio</th>
            <th>Distancia</th>
            <th>Duracao</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.uploadedFileId}>
              <td>{result.originalFilename}</td>
              <td>
                <span className={badgeClass(result.matchStatus)}>{result.matchStatus}</span>
              </td>
              <td>{result.parsed.startDate ? new Date(result.parsed.startDate).toLocaleString() : "-"}</td>
              <td>{result.parsed.distanceMeters ? `${Math.round(result.parsed.distanceMeters)} m` : "-"}</td>
              <td>{result.parsed.durationSeconds ? `${result.parsed.durationSeconds}s` : "-"}</td>
              <td>{result.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function badgeClass(status: string) {
  if (["match_confirmed", "uploaded"].includes(status)) return "badge good";
  if (["match_probable", "submitted", "processing", "pending"].includes(status)) return "badge warn";
  if (["parse_error", "failed", "duplicate"].includes(status)) return "badge bad";
  return "badge";
}


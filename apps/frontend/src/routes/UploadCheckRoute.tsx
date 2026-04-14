import { useMemo, useState } from "react";
import { useMutation, useQueries } from "@tanstack/react-query";
import type { FileCheckResult, UploadItem, UploadStatusResponse } from "@strava-sync/shared";
import { Button } from "../components/ui/Button";
import { api } from "../lib/api";
import {
  filterFileChecks,
  getCurrentUploadStatus,
  getUploadableFileIds,
  getUploadErrors,
  getUploadProgressValue,
  isUploadTerminal
} from "../lib/uploadCheck";

const filters = ["all", "not_found", "match_confirmed", "match_probable", "parse_error"] as const;

export function UploadCheckRoute() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FileCheckResult[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploadBatchErrors, setUploadBatchErrors] = useState<ReturnType<typeof getUploadErrors>>([]);

  const check = useMutation({
    mutationFn: api.checkFiles,
    onSuccess: (data) => {
      setResults(data.results);
      setUploads([]);
      setUploadBatchErrors([]);
    }
  });
  const uploadMissing = useMutation({
    mutationFn: api.uploadMissing,
    onSuccess: (data) => {
      setUploads(data.uploads);
      setUploadBatchErrors(getUploadErrors(data));
    }
  });

  const uploadStatuses = useQueries({
    queries: uploads.map((upload) => ({
      queryKey: ["upload-status", upload.id],
      queryFn: () => api.uploadStatus(upload.id),
      refetchInterval: (query: { state: { data: UploadStatusResponse | undefined } }) => {
        const status = getCurrentUploadStatus(upload, query.state.data);
        return isUploadTerminal(status) ? false : 1000;
      }
    }))
  });

  const visibleResults = useMemo(() => filterFileChecks(results, filter), [filter, results]);
  const missingIds = useMemo(() => getUploadableFileIds(results), [results]);

  function handleFileSelection(fileList: FileList | null) {
    setFiles(Array.from(fileList ?? []));
    setResults([]);
    setUploads([]);
    setUploadBatchErrors([]);
  }

  return (
    <section className="stack">
      <div>
        <h1>Checar arquivos</h1>
        <p className="muted">Envie GPX, TCX ou FIT para comparar com as atividades sincronizadas.</p>
      </div>
      {check.error ? <div className="error">{check.error.message}</div> : null}
      {uploadMissing.error ? <div className="error">{uploadMissing.error.message}</div> : null}
      {uploadBatchErrors.length > 0 ? (
        <div className="error">
          {uploadBatchErrors.length} arquivo(s) nao foram enviados:{" "}
          {uploadBatchErrors.map((error) => error.message).join("; ")}
        </div>
      ) : null}
      <div className="dropzone">
        <input
          type="file"
          multiple
          accept=".gpx,.tcx,.fit"
          onChange={(event) => handleFileSelection(event.target.files)}
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
              {item} ({filterFileChecks(results, item).length})
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
            const uploadStatus = getCurrentUploadStatus(upload, status);
            return (
              <div className="upload-row" key={upload.id}>
                <div className="row spread">
                  <span>{upload.externalId}</span>
                  <span className={badgeClass(uploadStatus)}>{uploadStatus}</span>
                </div>
                <div className="progress" aria-label={`Progresso do upload ${upload.externalId}`}>
                  <div style={{ width: `${getUploadProgressValue(uploadStatus)}%` }} />
                </div>
                {status?.errorMessage ? <div className="error compact">{status.errorMessage}</div> : null}
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

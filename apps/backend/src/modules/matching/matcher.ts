import type { MatchStatus } from "@strava-sync/shared";
import { findActivityByExternalId, listCandidateActivities } from "../activities/sync";
import type { ParsedFile } from "../files/parser";
import { findCompletedUploadByExternalId } from "../uploads/lookup";

type Candidate = Awaited<ReturnType<typeof listCandidateActivities>>[number];

export async function matchFile(
  userId: string,
  parsed: ParsedFile,
  parseError?: string | null,
  options: { originalFilename?: string | null } = {}
) {
  const externalIdCandidate = normalizeExternalId(options.originalFilename);
  if (externalIdCandidate) {
    const externalIdMatch = await findActivityByExternalId(userId, externalIdCandidate);
    if (externalIdMatch) {
      return {
        status: "match_confirmed" as MatchStatus,
        confidenceScore: 1,
        reason: `External ID corresponde ao nome do arquivo: ${externalIdCandidate}.`,
        candidate: externalIdMatch as Candidate
      };
    }

    const uploadMatch = await findCompletedUploadByExternalId(userId, externalIdCandidate);
    if (uploadMatch) {
      const stravaReference = uploadMatch.stravaActivityId ? ` Atividade Strava: ${uploadMatch.stravaActivityId}.` : "";
      const duplicateReason = uploadMatch.uploadStatus === "duplicate" ? "Upload anterior foi marcado como duplicado pelo Strava." : "Arquivo ja foi enviado ao Strava anteriormente.";
      return {
        status: "match_confirmed" as MatchStatus,
        confidenceScore: 1,
        reason: `${duplicateReason} External ID: ${externalIdCandidate}.${stravaReference}`,
        candidate: uploadMatch.activity as Candidate | null
      };
    }
  }

  if (parseError || !parsed.startDate) {
    return {
      status: "parse_error" as MatchStatus,
      confidenceScore: 0,
      reason: parseError ?? "Arquivo sem horario de inicio parseavel.",
      candidate: null as Candidate | null
    };
  }

  const candidates = await listCandidateActivities(userId, parsed.startDate, 10 * 60 * 1000);
  if (candidates.length === 0) {
    return {
      status: "not_found" as MatchStatus,
      confidenceScore: 0,
      reason: "Nenhuma atividade encontrada na janela de +/-10 minutos.",
      candidate: null as Candidate | null
    };
  }

  const scored = candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(parsed, candidate) }))
    .sort((left, right) => right.score - left.score);
  const best = scored[0]!;

  if (best.score >= 0.86) {
    return {
      status: "match_confirmed" as MatchStatus,
      confidenceScore: roundScore(best.score),
      reason: "Horario, distancia e duracao dentro das tolerancias.",
      candidate: best.candidate
    };
  }

  if (best.score >= 0.68) {
    return {
      status: "match_probable" as MatchStatus,
      confidenceScore: roundScore(best.score),
      reason: "Atividade proxima encontrada, mas uma ou mais metricas ficaram fora da tolerancia ideal.",
      candidate: best.candidate
    };
  }

  return {
    status: "not_found" as MatchStatus,
    confidenceScore: roundScore(best.score),
    reason: "Candidatas na janela de horario ficaram distantes em distancia ou duracao.",
    candidate: null as Candidate | null
  };
}

export function normalizeExternalId(filename: string | null | undefined) {
  if (!filename) return null;
  const lastSegment = filename.split(/[\\/]/).at(-1)?.trim();
  return lastSegment || null;
}

function scoreCandidate(parsed: ParsedFile, candidate: Candidate) {
  const candidateDistance = candidate.distanceMeters === null ? null : Number(candidate.distanceMeters);
  const distanceScore = compareMetric(parsed.distanceMeters, candidateDistance, 100, 0.03);
  const durationScore = compareMetric(
    parsed.durationSeconds,
    candidate.movingTimeSeconds ?? candidate.elapsedTimeSeconds,
    120,
    0.05
  );
  const typeScore = compareType(parsed.sportType, candidate.sportType);
  return distanceScore * 0.42 + durationScore * 0.38 + typeScore * 0.2;
}

function compareMetric(left: number | null, right: number | null | undefined, absoluteTolerance: number, percentTolerance: number) {
  if (left === null || right === null || right === undefined) return 0.5;
  const diff = Math.abs(left - right);
  const tolerance = Math.max(absoluteTolerance, Math.max(left, right) * percentTolerance);
  if (diff <= tolerance) return 1;
  if (diff <= tolerance * 2) return 0.72;
  if (diff <= tolerance * 4) return 0.35;
  return 0;
}

function compareType(left: string | null, right: string | null) {
  if (!left || !right) return 0.5;
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  if (normalizedLeft === normalizedRight) return 1;
  if ((normalizedLeft.includes("run") && normalizedRight.includes("run")) || (normalizedLeft.includes("ride") && normalizedRight.includes("ride"))) {
    return 0.85;
  }
  return 0.25;
}

function roundScore(score: number) {
  return Math.round(score * 10_000) / 10_000;
}

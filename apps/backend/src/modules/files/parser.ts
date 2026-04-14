import { XMLParser } from "fast-xml-parser";

export type ParsedFile = {
  startDate: Date | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  sportType: string | null;
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text"
});

function arrayOf<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOrNull(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function parseActivityFile(filename: string, buffer: Buffer): Promise<ParsedFile> {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "gpx") return parseGpx(buffer.toString("utf8"));
  if (extension === "tcx") return parseTcx(buffer.toString("utf8"));
  if (extension === "fit") return parseFit(buffer);
  throw new Error("Unsupported file extension");
}

function parseGpx(xml: string): ParsedFile {
  const parsed = xmlParser.parse(xml) as any;
  const trk = arrayOf(parsed.gpx?.trk)[0];
  const trackType = trk?.type ?? null;
  const points = arrayOf(trk?.trkseg).flatMap((segment: any) => arrayOf(segment?.trkpt));
  const times = points.map((point: any) => point?.time).filter(Boolean);
  const startDate = dateOrNull(times[0]);
  const endDate = dateOrNull(times.at(-1));
  const durationSeconds =
    startDate && endDate ? Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000)) : null;
  const distanceMeters = calculatePointDistance(points);
  return { startDate, distanceMeters, durationSeconds, sportType: trackType };
}

function parseTcx(xml: string): ParsedFile {
  const parsed = xmlParser.parse(xml) as any;
  const activities = arrayOf(parsed.TrainingCenterDatabase?.Activities?.Activity);
  const activity = activities[0];
  const laps = arrayOf(activity?.Lap);
  const trackpoints = laps.flatMap((lap: any) => arrayOf(lap?.Track?.Trackpoint));
  const startDate = dateOrNull(laps[0]?.["@_StartTime"] ?? trackpoints[0]?.Time);
  const lastTrackpoint = trackpoints.at(-1);
  const distanceMeters =
    numberOrNull(lastTrackpoint?.DistanceMeters) ??
    laps.reduce((sum: number, lap: any) => sum + (numberOrNull(lap?.DistanceMeters) ?? 0), 0) ??
    null;
  const durationSeconds = laps.reduce((sum: number, lap: any) => sum + (numberOrNull(lap?.TotalTimeSeconds) ?? 0), 0);
  return {
    startDate,
    distanceMeters: distanceMeters === 0 ? null : distanceMeters,
    durationSeconds: durationSeconds === 0 ? null : Math.round(durationSeconds),
    sportType: activity?.["@_Sport"] ?? null
  };
}

async function parseFit(buffer: Buffer): Promise<ParsedFile> {
  const mod = await import("fit-file-parser");
  const FitParser = (mod as any).default ?? (mod as any);
  const parser = new FitParser({ force: true, speedUnit: "m/s", lengthUnit: "m", temperatureUnit: "celsius" });
  const data = await new Promise<any>((resolve, reject) => {
    parser.parse(buffer, (error: Error | null, result: any) => (error ? reject(error) : resolve(result)));
  });
  const sessions = arrayOf(data.sessions);
  const session = sessions[0] ?? {};
  const records = arrayOf(data.records);
  const start = session.start_time ?? records[0]?.timestamp;
  return {
    startDate: dateOrNull(start),
    distanceMeters: numberOrNull(session.total_distance),
    durationSeconds: numberOrNull(session.total_elapsed_time ?? session.total_timer_time),
    sportType: typeof session.sport === "string" ? session.sport : null
  };
}

function calculatePointDistance(points: any[]) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const previousLat = numberOrNull(previous?.["@_lat"]);
    const previousLon = numberOrNull(previous?.["@_lon"]);
    const currentLat = numberOrNull(current?.["@_lat"]);
    const currentLon = numberOrNull(current?.["@_lon"]);
    if (previousLat === null || previousLon === null || currentLat === null || currentLon === null) continue;
    total += haversine(previousLat, previousLon, currentLat, currentLon);
  }
  return total > 0 ? total : null;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6_371_000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

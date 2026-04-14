import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseActivityFile } from "./parser";

const fixturesDir = fileURLToPath(new URL("../../test/fixtures/", import.meta.url));

async function fixture(name: string) {
  return readFile(`${fixturesDir}${name}`);
}

describe("parseActivityFile", () => {
  it("parses GPX start, duration and distance", async () => {
    const parsed = await parseActivityFile("ride.gpx", await fixture("ride.gpx"));
    expect(parsed.startDate?.toISOString()).toBe("2026-04-10T06:30:00.000Z");
    expect(parsed.durationSeconds).toBe(600);
    expect(parsed.distanceMeters).toBeGreaterThan(0);
    expect(parsed.sportType).toBe("Ride");
  });

  it("parses TCX start, duration and distance", async () => {
    const parsed = await parseActivityFile("run.tcx", await fixture("run.tcx"));
    expect(parsed.startDate?.toISOString()).toBe("2026-04-11T17:20:00.000Z");
    expect(parsed.durationSeconds).toBe(2610);
    expect(parsed.distanceMeters).toBe(8021.2);
    expect(parsed.sportType).toBe("Run");
  });

  it("parses TCX start time even when sport is absent", async () => {
    const tcx = `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity>
      <Lap StartTime="2026-04-12T07:00:00Z"><TotalTimeSeconds>1800</TotalTimeSeconds><DistanceMeters>5000</DistanceMeters></Lap>
      </Activity></Activities></TrainingCenterDatabase>`;

    const parsed = await parseActivityFile("activity.tcx", Buffer.from(tcx));
    expect(parsed.startDate?.toISOString()).toBe("2026-04-12T07:00:00.000Z");
    expect(parsed.durationSeconds).toBe(1800);
    expect(parsed.distanceMeters).toBe(5000);
    expect(parsed.sportType).toBeNull();
  });

  it("ignores invalid timestamps without returning invalid Date objects", async () => {
    const gpx = `<?xml version="1.0"?><gpx><trk><trkseg>
      <trkpt lat="40.0" lon="-3.0"><time>not-a-date</time></trkpt>
      <trkpt lat="40.001" lon="-3.001"><time>also-not-a-date</time></trkpt>
    </trkseg></trk></gpx>`;

    const parsed = await parseActivityFile("bad-time.gpx", Buffer.from(gpx));
    expect(parsed.startDate).toBeNull();
    expect(parsed.durationSeconds).toBeNull();
    expect(parsed.distanceMeters).toBeGreaterThan(0);
  });
});

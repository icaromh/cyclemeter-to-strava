import { describe, expect, it } from "vitest";
import { parseActivityFile } from "./parser";

describe("parseActivityFile", () => {
  it("parses GPX start, duration and distance", async () => {
    const gpx = `<?xml version="1.0"?><gpx><trk><type>Ride</type><trkseg>
      <trkpt lat="40.0" lon="-3.0"><time>2026-04-10T06:30:00Z</time></trkpt>
      <trkpt lat="40.001" lon="-3.001"><time>2026-04-10T06:40:00Z</time></trkpt>
    </trkseg></trk></gpx>`;

    const parsed = await parseActivityFile("ride.gpx", Buffer.from(gpx));
    expect(parsed.startDate?.toISOString()).toBe("2026-04-10T06:30:00.000Z");
    expect(parsed.durationSeconds).toBe(600);
    expect(parsed.distanceMeters).toBeGreaterThan(0);
    expect(parsed.sportType).toBe("Ride");
  });

  it("parses TCX start, duration and distance", async () => {
    const tcx = `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Run">
      <Lap StartTime="2026-04-11T17:20:00Z"><TotalTimeSeconds>2610</TotalTimeSeconds><DistanceMeters>8021.2</DistanceMeters>
      <Track><Trackpoint><Time>2026-04-11T17:20:00Z</Time><DistanceMeters>0</DistanceMeters></Trackpoint><Trackpoint><Time>2026-04-11T18:03:30Z</Time><DistanceMeters>8021.2</DistanceMeters></Trackpoint></Track>
      </Lap></Activity></Activities></TrainingCenterDatabase>`;

    const parsed = await parseActivityFile("run.tcx", Buffer.from(tcx));
    expect(parsed.startDate?.toISOString()).toBe("2026-04-11T17:20:00.000Z");
    expect(parsed.durationSeconds).toBe(2610);
    expect(parsed.distanceMeters).toBe(8021.2);
    expect(parsed.sportType).toBe("Run");
  });
});


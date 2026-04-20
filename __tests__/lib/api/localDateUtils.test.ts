import { describe, it, expect } from "vitest";
import {
  utcToLocalDateStr,
  localDayBoundsUTC,
  nextLocalDateStr,
} from "@/lib/api/localDateUtils";

describe("utcToLocalDateStr", () => {
  it("null tzOffset treats input as UTC and returns UTC date", () => {
    expect(utcToLocalDateStr("2026-03-07T12:00:00Z", null)).toBe("2026-03-07");
  });

  it("tzOffset=0 returns the same UTC date", () => {
    expect(utcToLocalDateStr("2026-03-07T12:00:00Z", 0)).toBe("2026-03-07");
  });

  it("tzOffset=360 (CST, west of UTC): 2026-03-07T01:00:00Z → 2026-03-06", () => {
    // 2026-03-07T01:00:00Z minus 360 min = 2026-03-06T19:00:00 local (still March 6)
    expect(utcToLocalDateStr("2026-03-07T01:00:00Z", 360)).toBe("2026-03-06");
  });

  it("tzOffset=300 (CDT): 2026-04-17T04:30:00Z → 2026-04-16", () => {
    // 04:30 UTC minus 300 min (5h) = 23:30 CDT still on April 16
    expect(utcToLocalDateStr("2026-04-17T04:30:00Z", 300)).toBe("2026-04-16");
  });

  it("tzOffset=-600 (AEST, east of UTC): 2026-03-06T22:00:00Z → 2026-03-07", () => {
    // 22:00 UTC plus 600 min (10h) = 08:00 AEST on March 7
    expect(utcToLocalDateStr("2026-03-06T22:00:00Z", -600)).toBe("2026-03-07");
  });

  it("accepts millisecond number input and produces same result as ISO string", () => {
    const iso = "2026-03-07T01:00:00Z";
    const ms = Date.parse(iso);
    expect(utcToLocalDateStr(ms, 360)).toBe(utcToLocalDateStr(iso, 360));
  });

  it("month boundary: 2026-03-01T01:00:00Z with tzOffset=360 → 2026-02-28", () => {
    // 01:00 UTC minus 6h = 19:00 CST still on Feb 28
    expect(utcToLocalDateStr("2026-03-01T01:00:00Z", 360)).toBe("2026-02-28");
  });

  it("year boundary: 2026-01-01T02:00:00Z with tzOffset=360 → 2025-12-31", () => {
    // 02:00 UTC minus 6h = 20:00 CST still on Dec 31
    expect(utcToLocalDateStr("2026-01-01T02:00:00Z", 360)).toBe("2025-12-31");
  });
});

describe("localDayBoundsUTC", () => {
  it("null tzOffset: 2026-03-06 → startMs = UTC midnight, endMs = startMs + 86400000", () => {
    const { startMs, endMs } = localDayBoundsUTC("2026-03-06", null);
    expect(startMs).toBe(Date.UTC(2026, 2, 6));
    expect(endMs).toBe(startMs + 86_400_000);
  });

  it("tzOffset=360 (CST): 2026-03-06 → startMs = 2026-03-06T06:00:00Z", () => {
    const { startMs, endMs } = localDayBoundsUTC("2026-03-06", 360);
    // local midnight CST = UTC 06:00
    expect(startMs).toBe(Date.UTC(2026, 2, 6) + 360 * 60 * 1000);
    expect(new Date(startMs).toISOString()).toBe("2026-03-06T06:00:00.000Z");
    expect(endMs).toBe(startMs + 86_400_000);
    expect(new Date(endMs).toISOString()).toBe("2026-03-07T06:00:00.000Z");
  });

  it("tzOffset=300 (CDT): 2026-04-17 → startMs = 2026-04-17T05:00:00Z", () => {
    const { startMs, endMs } = localDayBoundsUTC("2026-04-17", 300);
    expect(startMs).toBe(Date.UTC(2026, 3, 17) + 300 * 60 * 1000);
    expect(new Date(startMs).toISOString()).toBe("2026-04-17T05:00:00.000Z");
    expect(endMs).toBe(startMs + 86_400_000);
  });

  it("tzOffset=-600 (AEST): 2026-03-07 → startMs = 2026-03-06T14:00:00Z", () => {
    const { startMs, endMs } = localDayBoundsUTC("2026-03-07", -600);
    // local midnight AEST = UTC 14:00 the previous day
    expect(startMs).toBe(Date.UTC(2026, 2, 7) + (-600) * 60 * 1000);
    expect(new Date(startMs).toISOString()).toBe("2026-03-06T14:00:00.000Z");
    expect(endMs).toBe(startMs + 86_400_000);
  });

  it("endMs is always startMs + 86400000 regardless of timezone", () => {
    const offsets = [null, 0, 300, 360, -600, 330, -330];
    for (const tz of offsets) {
      const { startMs, endMs } = localDayBoundsUTC("2026-06-15", tz);
      expect(endMs - startMs).toBe(86_400_000);
    }
  });
});

describe("nextLocalDateStr", () => {
  it("normal day: 2026-04-15 → 2026-04-16", () => {
    expect(nextLocalDateStr("2026-04-15")).toBe("2026-04-16");
  });

  it("month end: 2026-04-30 → 2026-05-01", () => {
    expect(nextLocalDateStr("2026-04-30")).toBe("2026-05-01");
  });

  it("year end: 2026-12-31 → 2027-01-01", () => {
    expect(nextLocalDateStr("2026-12-31")).toBe("2027-01-01");
  });

  it("leap Feb: 2024-02-28 → 2024-02-29", () => {
    expect(nextLocalDateStr("2024-02-28")).toBe("2024-02-29");
  });

  it("non-leap Feb: 2026-02-28 → 2026-03-01", () => {
    expect(nextLocalDateStr("2026-02-28")).toBe("2026-03-01");
  });
});

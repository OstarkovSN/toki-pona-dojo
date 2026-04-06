import { describe, expect, it } from "vitest";
import { sm2, scoreToQuality, reviewWord, defaultSRSEntry } from "../srs";

describe("sm2", () => {
  it("resets reps to 0 and interval to 1 on quality 0", () => {
    const result = sm2(0, 3, 2.5, 10);
    expect(result.reps).toBe(0);
    expect(result.interval).toBe(1);
  });

  it("resets reps to 0 and interval to 1 on quality 1", () => {
    const result = sm2(1, 5, 2.5, 20);
    expect(result.reps).toBe(0);
    expect(result.interval).toBe(1);
  });

  it("resets reps to 0 and interval to 1 on quality 2", () => {
    const result = sm2(2, 2, 2.5, 6);
    expect(result.reps).toBe(0);
    expect(result.interval).toBe(1);
  });

  it("advances reps and sets interval to 1 on quality 3 with reps=0", () => {
    const result = sm2(3, 0, 2.5, 0);
    expect(result.reps).toBe(1);
    expect(result.interval).toBe(1);
  });

  it("advances reps and sets interval to 6 on quality 4 with reps=1", () => {
    const result = sm2(4, 1, 2.5, 1);
    expect(result.reps).toBe(2);
    expect(result.interval).toBe(6);
  });

  it("advances reps and multiplies interval by ease on quality 5 with reps>=2", () => {
    const result = sm2(5, 2, 2.5, 6);
    expect(result.reps).toBe(3);
    expect(result.interval).toBe(Math.round(6 * 2.5)); // 15
  });

  it("clamps ease factor to minimum 1.3", () => {
    // quality 0 with already-low ease should not go below 1.3
    const result = sm2(0, 3, 1.3, 10);
    expect(result.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("applies the EF formula unconditionally (same formula for pass and fail)", () => {
    // For quality=0: EF' = EF + (0.1 - 5*(0.08 + 5*0.02)) = EF + (0.1 - 0.9) = EF - 0.8
    const result = sm2(0, 3, 2.5, 10);
    // 2.5 - 0.8 = 1.7, but should still apply formula not flat -0.2
    expect(result.ease).toBeCloseTo(1.7, 5);
  });

  it("interval progression: 1 -> 6 -> prev*EF", () => {
    const r1 = sm2(4, 0, 2.5, 0);
    expect(r1.interval).toBe(1);

    const r2 = sm2(4, r1.reps, r1.ease, r1.interval);
    expect(r2.interval).toBe(6);

    const r3 = sm2(4, r2.reps, r2.ease, r2.interval);
    expect(r3.interval).toBe(Math.round(6 * r2.ease));
  });
});

describe("scoreToQuality", () => {
  it("maps score ranges to quality values", () => {
    expect(scoreToQuality(1.0)).toBe(5);
    expect(scoreToQuality(0.9)).toBe(5);
    expect(scoreToQuality(0.7)).toBe(4);
    expect(scoreToQuality(0.5)).toBe(3);
    expect(scoreToQuality(0.3)).toBe(2);
    expect(scoreToQuality(0.1)).toBe(1);
    expect(scoreToQuality(0)).toBe(0);
  });
});

describe("reviewWord", () => {
  it("returns updated SRS entry with new due date", () => {
    const entry = defaultSRSEntry();
    const updated = reviewWord(entry, 5);
    expect(updated.reps).toBe(1);
    expect(updated.interval).toBe(1);
    expect(updated.due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

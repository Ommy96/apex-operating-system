import { describe, it, expect } from "vitest";
import { summariseDemographics, ageFromDob } from "../ManagementPulse";

const today = new Date("2026-11-10");
describe("overview demographics", () => {
  it("computes age respecting birthday not yet reached", () => {
    expect(ageFromDob("2010-12-01", today)).toBe(15);
    expect(ageFromDob("2010-11-01", today)).toBe(16);
  });
  it("normalises gender case and counts missing DOB separately", () => {
    const s = summariseDemographics([
      { gender: "Female", date_of_birth: "2020-01-01" },
      { gender: "MALE", date_of_birth: null },
      { gender: null, date_of_birth: "1990-01-01" },
    ], today);
    expect(s.gender).toEqual({ female: 1, male: 1, other: 1 });
    expect(s.unknownAge).toBe(1);
    expect(s.bands.find(b => b.label === "6–12")!.count).toBe(1);
    expect(s.bands.find(b => b.label === "25+")!.count).toBe(1);
  });
});

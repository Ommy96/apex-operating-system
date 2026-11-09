import { describe, it, expect } from "vitest";
import { DEFAULT_NEED_PRIORITY, NEED_PRIORITY_VALUES, toNeedPriority } from "../needPriority";

describe("need priority matches the database constraint", () => {
  it("allows only low, normal, high, urgent", () => {
    expect(NEED_PRIORITY_VALUES).toEqual(["low", "normal", "high", "urgent"]);
  });
  it("defaults waiting-list needs to normal, never medium", () => {
    expect(DEFAULT_NEED_PRIORITY).toBe("normal");
    expect(toNeedPriority("medium")).toBe("normal");
    expect(toNeedPriority("URGENT")).toBe("urgent");
  });
});

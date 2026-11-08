import { describe, expect, it } from "vitest";
import {
  allowedCaseTransitions,
  allowedTaskTransitions,
  canTransitionCaseStatus,
  canTransitionTaskStatus,
  hasValidClosureReason,
  isOverdueTask,
  WORK_RECORD_TYPES,
} from "@/lib/workManagement";

describe("task workflow rules", () => {
  it("allows a task to progress, block, resume, and complete", () => {
    expect(canTransitionTaskStatus("todo", "in_progress")).toBe(true);
    expect(canTransitionTaskStatus("in_progress", "blocked")).toBe(true);
    expect(canTransitionTaskStatus("blocked", "in_progress")).toBe(true);
    expect(canTransitionTaskStatus("in_progress", "completed")).toBe(true);
  });

  it("blocks invalid transitions and keeps completed tasks terminal", () => {
    expect(canTransitionTaskStatus("todo", "completed")).toBe(false);
    expect(canTransitionTaskStatus("blocked", "completed")).toBe(false);
    expect(allowedTaskTransitions("completed")).toEqual([]);
    expect(allowedTaskTransitions("cancelled")).toEqual([]);
  });

  it("derives overdue work from open status and due date", () => {
    expect(isOverdueTask("in_progress", "2026-11-06", "2026-11-07")).toBe(true);
    expect(isOverdueTask("completed", "2026-11-06", "2026-11-07")).toBe(false);
    expect(isOverdueTask("todo", null, "2026-11-07")).toBe(false);
  });
});

describe("case workflow rules", () => {
  it("requires a reason as a case is closed in the workflow", () => {
    expect(canTransitionCaseStatus("open", "in_progress")).toBe(true);
    expect(canTransitionCaseStatus("in_progress", "closed")).toBe(true);
    expect(canTransitionCaseStatus("closed", "open")).toBe(false);
    expect(allowedCaseTransitions("lost_to_follow_up")).toEqual([]);
    expect(hasValidClosureReason("closed", "Support concluded")).toBe(true);
    expect(hasValidClosureReason("closed", "   ")).toBe(false);
    expect(hasValidClosureReason("in_progress", "")).toBe(true);
  });
});

describe("supported existing task links", () => {
  it("uses the existing source records only", () => {
    expect(WORK_RECORD_TYPES).toEqual([
      "life_event",
      "vulnerability_assessment",
      "need",
      "home_visit",
      "school_visit",
      "donor_request",
    ]);
  });
});
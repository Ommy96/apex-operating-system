import { describe, it, expect } from "vitest";
import { sortTasks } from "../TaskViews";
const t = (title: string, priority: string, due_date: string | null) => ({ title, priority, due_date });
describe("task sorting", () => {
  it("orders by priority urgent first, case-insensitive", () => {
    expect(sortTasks([t("a","Low",null), t("b","URGENT",null), t("c","high",null)], "priority").map(x=>x.title)).toEqual(["b","c","a"]);
  });
  it("orders by due date with undated last", () => {
    expect(sortTasks([t("a","low",null), t("b","low","2026-12-01"), t("c","low","2026-11-01")], "due").map(x=>x.title)).toEqual(["c","b","a"]);
  });
});

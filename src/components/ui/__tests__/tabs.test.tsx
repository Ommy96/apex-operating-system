import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../tabs";

const indicators = (tab: HTMLElement) => tab.querySelectorAll('span[aria-hidden="true"]').length;

describe("Tabs indicator", () => {
  it("renders one indicator per Tabs root, only on the active trigger, nested groups independent", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList><TabsTrigger value="a">A</TabsTrigger><TabsTrigger value="b">B</TabsTrigger></TabsList>
        <TabsContent value="a">
          <Tabs defaultValue="x">
            <TabsList><TabsTrigger value="x">X</TabsTrigger><TabsTrigger value="y">Y</TabsTrigger></TabsList>
          </Tabs>
        </TabsContent>
      </Tabs>
    );
    const [a, b, x, y] = ["A", "B", "X", "Y"].map((n) => screen.getByRole("tab", { name: n }));
    expect([a, b, x, y].map(indicators)).toEqual([1, 0, 1, 0]);
    fireEvent.mouseDown(y, { button: 0 });
    expect([a, b, x, y].map(indicators)).toEqual([1, 0, 0, 1]);
    const ids = Array.from(document.querySelectorAll('[role=tab] span[aria-hidden="true"]'));
    expect(ids).toHaveLength(2);
  });

  it("keeps Radix keyboard navigation", async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList><TabsTrigger value="a">A</TabsTrigger><TabsTrigger value="b">B</TabsTrigger><TabsTrigger value="c">C</TabsTrigger></TabsList>
      </Tabs>
    );
    const a = screen.getByRole("tab", { name: "A" });
    a.focus();
    expect(document.activeElement).toBe(a);
    fireEvent.keyDown(a, { key: "ArrowRight" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("tab", { name: "B" })));
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("tab", { name: "C" })));
  });
});

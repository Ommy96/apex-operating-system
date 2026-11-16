import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectTeamTab } from "./ProjectDashboard";

const state = vi.hoisted(() => ({ fail: false, empty: false, calls: 0 }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: { manageStaff: false, manageRoles: false }, hasPermission: () => false }) }));
vi.mock("@/hooks/useOrgStaff", () => ({ useOrgStaff: () => ({ data: [{ user_id: "staff", label: "Project Staff" }], refetch: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  const chain = {
    select: () => chain, eq: () => chain,
    is: () => { state.calls++; return Promise.resolve({ data: state.empty ? [] : [{ id: "assignment", user_id: "staff", role_on_project: "field_officer" }], error: state.fail ? { message: "Project read denied" } : null }); },
  };
  return chain;
} } }));

function openTeam() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><ProjectTeamTab projectId="project" orgId="umazi" /></QueryClientProvider>);
}

describe("project team read", () => {
  beforeEach(() => { state.fail = false; state.empty = false; state.calls = 0; });
  it("shows the name without a profiles embed and hides writes from ordinary staff", async () => {
    openTeam();
    expect(await screen.findByText("Project Staff")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign Staff" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End assignment" })).not.toBeInTheDocument();
  });
  it("completes an empty team query", async () => {
    state.empty = true; openTeam();
    expect(await screen.findByText("No staff assigned yet")).toBeInTheDocument();
  });
  it("shows a forced select error and recovers on retry", async () => {
    state.fail = true; openTeam();
    expect(await screen.findByRole("alert")).toHaveTextContent("Project read denied");
    state.fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("Project Staff")).toBeInTheDocument());
    expect(state.calls).toBe(2);
  });
});
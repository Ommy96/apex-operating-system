import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProgramTeam } from "./ProgramTeam";

const state = vi.hoisted(() => ({ fail: false, empty: false, calls: [] as string[] }));
vi.mock("@/hooks/useOrganization", () => ({ useOrganization: () => ({ currentOrganization: { organization_id: "umazi" } }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "admin" } }) }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: { manageStaff: true, manageRoles: false }, hasPermission: () => false }) }));
vi.mock("@/hooks/useOrgStaff", () => ({ useOrgStaff: () => ({ data: [{ user_id: "staff", label: "Assigned Staff", email: "" }], refetch: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const chain = {
    select: () => chain, eq: () => chain, is: () => chain, in: () => chain,
    order: () => { state.calls.push(table); return Promise.resolve({ data: state.empty ? [] : [{ id: "assignment", staff_id: "staff", role: "field_officer", project_id: null, start_date: null }], error: state.fail ? { message: "Team read denied" } : null }); },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
  };
  return chain;
} } }));

function openTeam() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><ProgramTeam programId="programme" /></QueryClientProvider>);
}

describe("programme team read handling", () => {
  beforeEach(() => { state.fail = false; state.empty = false; state.calls = []; });
  it("resolves the stored staff id through the organisation staff list", async () => {
    openTeam();
    expect(await screen.findByText("Assigned Staff")).toBeInTheDocument();
  });
  it("finishes an empty query", async () => {
    state.empty = true; openTeam();
    expect(await screen.findByText("No staff assigned yet")).toBeInTheDocument();
  });
  it("surfaces a forced query failure and retries successfully", async () => {
    state.fail = true; openTeam();
    expect(await screen.findByRole("alert")).toHaveTextContent("Team read denied");
    state.fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("Assigned Staff")).toBeInTheDocument());
    expect(state.calls.filter(table => table === "programme_team")).toHaveLength(2);
  });
});
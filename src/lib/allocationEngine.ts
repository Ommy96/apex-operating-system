import { supabase } from "@/integrations/supabase/client";

export type AllocationScope = "direct_beneficiary" | "project_pool" | "program_unrestricted";
export type AllocationStatus = "active" | "held" | "redirected" | "consumed" | "cancelled";

export interface AllocateDonationResult {
  success: boolean;
  allocations?: any[];
  poolBalanceAfter?: { id: string; balance_native: number; balance_base: number; currency: string };
  fxRate?: number;
  fxAt?: string;
  scope?: AllocationScope;
  intentKind?: string;
  error?: string;
  message?: string;
}

export async function allocateDonation(donationId: string): Promise<AllocateDonationResult> {
  const { data, error } = await supabase.functions.invoke("allocation-engine", {
    body: { mode: "allocate_donation", donationId },
  });
  if (error) return { success: false, error: error.message };
  return data as AllocateDonationResult;
}

export async function exitBeneficiary(args: {
  beneficiaryId: string;
  projectId: string;
  resolution: "redirect" | "hold";
  redirectBeneficiaryId?: string;
  reason: string;
}) {
  const { data, error } = await supabase.functions.invoke("allocation-engine", {
    body: { mode: "exit_beneficiary", ...args },
  });
  if (error) return { success: false, error: error.message } as any;
  return data;
}

/**
 * Management override: redirect a single allocation to a different beneficiary.
 * Reuses exit_beneficiary by passing the originating beneficiary & project,
 * then filters to a single allocation server-side by extending later if needed.
 * For per-allocation redirect we do it client-side: mark current as redirected
 * and insert a child via the engine's redirect path.
 */
export async function redirectAllocation(args: {
  allocationId: string;
  newBeneficiaryId: string;
  reason: string;
}) {
  // Fetch the allocation
  const { data: a, error: aErr } = await supabase
    .from("allocations")
    .select("*")
    .eq("id", args.allocationId)
    .maybeSingle();
  if (aErr || !a) return { success: false, error: aErr?.message ?? "not_found" };

  const { data: user } = await supabase.auth.getUser();

  // Mark redirected
  const { error: uErr } = await supabase
    .from("allocations")
    .update({ status: "redirected", reason: args.reason })
    .eq("id", a.id);
  if (uErr) return { success: false, error: uErr.message };

  const { data: child, error: cErr } = await supabase
    .from("allocations")
    .insert({
      organization_id: a.organization_id,
      donor_pool_id: a.donor_pool_id,
      donor_account_id: a.donor_account_id,
      donation_id: a.donation_id,
      beneficiary_id: args.newBeneficiaryId,
      project_id: a.project_id,
      program_id: a.program_id,
      scope: a.scope,
      amount_native: a.amount_native,
      native_currency: a.native_currency,
      fx_rate: a.fx_rate,
      fx_at: a.fx_at,
      amount_base: a.amount_base,
      base_currency: a.base_currency,
      status: "active",
      reason: `Manually redirected: ${args.reason}`,
      allocated_by: user?.user?.id ?? null,
      parent_allocation_id: a.id,
    })
    .select("*")
    .single();
  if (cErr) return { success: false, error: cErr.message };

  if (user?.user?.id) {
    await supabase.from("allocation_overrides").insert({
      organization_id: a.organization_id,
      allocation_id: a.id,
      overridden_by: user.user.id,
      reason: args.reason,
      before_status: "active",
      after_status: "redirected",
      before_beneficiary_id: a.beneficiary_id,
      after_beneficiary_id: args.newBeneficiaryId,
    });
  }

  return { success: true, child };
}

export function formatMoney(amount: number | string | null | undefined, currency = "KES") {
  const n = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BeneficiaryRecord {
  name: string;
  location: string;
  gender: string;
  grade: string;
  amount: number;
  category: string;
  program: string;
  beneficiary_type: string;
  date_of_birth?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { records, org_id, donor_name, dry_run, action, categories, multiplier, notes_text } = body;

    // Bulk update action: update amount and notes for existing donor records by category
    if (action === "bulk_update" || action === "bulk_update_null") {
      if (!org_id || !donor_name || !multiplier) {
        return new Response(
          JSON.stringify({ error: "Missing fields for bulk_update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: donorRecords, error: fetchErr } = await supabase
        .from("beneficiary_donors")
        .select("id, notes, amount_received")
        .eq("organization_id", org_id)
        .eq("donor_name", donor_name);

      if (fetchErr) {
        return new Response(
          JSON.stringify({ error: fetchErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let updated = 0;
      const errors: string[] = [];
      const categorySet = categories ? new Set((categories as string[]).map((c: string) => c.toLowerCase())) : null;

      for (const record of donorRecords || []) {
        // Skip already-updated records
        if ((record.notes || "").includes("Annual")) continue;

        if (action === "bulk_update_null") {
          if (record.notes !== null && record.notes !== "") continue;
        } else if (categorySet) {
          const noteLC = (record.notes || "").toLowerCase();
          const matchesCategory = Array.from(categorySet).some((cat) => noteLC.includes(cat));
          if (!matchesCategory) continue;
        }

        const annualAmount = (record.amount_received || 0) * multiplier;
        const baseNote = record.notes || "Bulk import";
        const newNotes = notes_text
          ? `${baseNote} | ${notes_text} | Annual: KES ${annualAmount.toLocaleString()}`
          : `${baseNote} | Annual: KES ${annualAmount.toLocaleString()}`;

        const { error: upErr } = await supabase
          .from("beneficiary_donors")
          .update({
            amount_received: annualAmount,
            notes: newNotes,
          })
          .eq("id", record.id);

        if (upErr) {
          errors.push(`Update failed for donor record ${record.id}: ${upErr.message}`);
        } else {
          updated++;
        }
      }

      return new Response(
        JSON.stringify({ updated, errors, total_checked: (donorRecords || []).length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!records || !org_id || !donor_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Program mapping
    const programMap: Record<string, string> = {};
    const { data: programs } = await supabase
      .from("programs")
      .select("id, name")
      .eq("organization_id", org_id)
      .eq("is_active", true);

    if (programs) {
      for (const p of programs) {
        programMap[p.name.toLowerCase()] = p.id;
      }
    }

    // Get all existing beneficiaries
    const { data: existingBeneficiaries } = await supabase
      .from("beneficiaries")
      .select("id, display_name, first_name, last_name")
      .eq("organization_id", org_id);

    // Build lookup: normalize names for matching
    const normalize = (s: string) =>
      s?.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim() || "";

    const beneficiaryLookup = new Map<string, { id: string; display_name: string }>();
    if (existingBeneficiaries) {
      for (const b of existingBeneficiaries) {
        beneficiaryLookup.set(normalize(b.display_name), { id: b.id, display_name: b.display_name });
        // Also index by "last, first" and "first last" patterns
        if (b.first_name && b.last_name) {
          beneficiaryLookup.set(normalize(`${b.first_name} ${b.last_name}`), { id: b.id, display_name: b.display_name });
          beneficiaryLookup.set(normalize(`${b.last_name} ${b.first_name}`), { id: b.id, display_name: b.display_name });
          beneficiaryLookup.set(normalize(`${b.last_name}, ${b.first_name}`), { id: b.id, display_name: b.display_name });
        }
      }
    }

    // Get existing donor records to avoid duplicates
    const { data: existingDonors } = await supabase
      .from("beneficiary_donors")
      .select("id, beneficiary_id, program_id, donor_name")
      .eq("organization_id", org_id)
      .eq("donor_name", donor_name);

    const existingDonorSet = new Set(
      (existingDonors || []).map((d) => `${d.beneficiary_id}_${d.program_id}`)
    );

    const results = {
      matched: 0,
      created: 0,
      donor_assigned: 0,
      donor_updated: 0,
      donor_skipped: 0,
      errors: [] as string[],
      details: [] as { name: string; action: string; beneficiary_id?: string }[],
    };

    for (const record of records as BeneficiaryRecord[]) {
      try {
        const normalizedName = normalize(record.name);
        let beneficiaryId: string | null = null;
        let action = "";

        // Try to find existing beneficiary
        const match = beneficiaryLookup.get(normalizedName);
        if (match) {
          beneficiaryId = match.id;
          action = "matched";
          results.matched++;
        } else {
          if (dry_run) {
            action = "would_create";
            results.details.push({ name: record.name, action });
            continue;
          }

          // Parse name: handle "Last, First" and "First Last" formats
          let firstName = "";
          let lastName = "";
          if (record.name.includes(",")) {
            const parts = record.name.split(",").map((s: string) => s.trim());
            lastName = parts[0];
            firstName = parts.slice(1).join(" ");
          } else {
            const parts = record.name.trim().split(/\s+/);
            firstName = parts[0];
            lastName = parts.slice(1).join(" ");
          }

          // Map gender
          let gender: string | null = null;
          const g = record.gender?.toLowerCase();
          if (g === "gutt" || g === "m" || g === "male") gender = "Male";
          else if (g === "jente" || g === "f" || g === "female") gender = "Female";
          else if (g === "ukjent") gender = null;

          const displayName = firstName && lastName
            ? `${firstName} ${lastName}`.trim()
            : record.name.replace(/,/g, " ").replace(/\s+/g, " ").trim();

          const { data: newBen, error: createError } = await supabase
            .from("beneficiaries")
            .insert({
              organization_id: org_id,
              display_name: displayName,
              first_name: firstName || null,
              last_name: lastName || null,
              beneficiary_type: record.beneficiary_type || "student",
              gender: gender,
              location: record.location || null,
              grade: record.grade || null,
              status: "active",
              country: "Kenya",
            })
            .select("id")
            .single();

          if (createError) {
            results.errors.push(`Create failed for "${record.name}": ${createError.message}`);
            continue;
          }

          beneficiaryId = newBen.id;
          action = "created";
          results.created++;

          // Add to lookup for dedup within batch
          beneficiaryLookup.set(normalizedName, { id: beneficiaryId, display_name: displayName });
        }

        if (!beneficiaryId) continue;

        // Resolve program
        const programId = programMap[record.program?.toLowerCase()] || null;

        // Check if donor already exists for this beneficiary+program
        const donorKey = `${beneficiaryId}_${programId}`;
        if (existingDonorSet.has(donorKey)) {
          // Update existing donor record amount
          const existingDonor = (existingDonors || []).find(
            (d) => d.beneficiary_id === beneficiaryId && d.program_id === programId
          );
          if (existingDonor && record.amount > 0) {
            const { error: updateError } = await supabase
              .from("beneficiary_donors")
              .update({
                amount_received: record.amount,
                donation_date: new Date().toISOString().split("T")[0],
              })
              .eq("id", existingDonor.id);

            if (updateError) {
              results.errors.push(`Update donor failed for "${record.name}": ${updateError.message}`);
            } else {
              action += " + donor_updated";
              results.donor_updated++;
            }
          } else {
            action += " + donor_exists";
            results.donor_skipped++;
          }
        } else {
          // Create new donor record
          if (!dry_run) {
            const { error: donorError } = await supabase
              .from("beneficiary_donors")
              .insert({
                organization_id: org_id,
                beneficiary_id: beneficiaryId,
                program_id: programId,
                donor_name: donor_name,
                amount_received: record.amount || 0,
                donation_date: new Date().toISOString().split("T")[0],
                notes: `Bulk import - ${record.category}`,
              });

            if (donorError) {
              results.errors.push(`Donor assign failed for "${record.name}": ${donorError.message}`);
            } else {
              action += " + donor_assigned";
              results.donor_assigned++;
              existingDonorSet.add(donorKey);
            }
          }
        }

        results.details.push({ name: record.name, action, beneficiary_id: beneficiaryId || undefined });
      } catch (err) {
        results.errors.push(`Error processing "${record.name}": ${err.message}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

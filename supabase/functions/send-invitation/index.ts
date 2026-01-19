import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: string;
  organization_id: string;
  organization_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with user's token to verify their identity
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { email, role, organization_id, organization_name }: InvitationRequest = await req.json();

    console.log(`Processing invitation for ${email} to ${organization_name} as ${role}`);

    // Check if user already exists in the organization
    const { data: existingMember } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    // Check if there's already a pending invitation
    const { data: existingInvite } = await supabaseAdmin
      .from("organization_invitations")
      .select("id, status")
      .eq("organization_id", organization_id)
      .eq("email", email)
      .single();

    if (existingInvite && existingInvite.status === "pending") {
      throw new Error("An invitation is already pending for this email");
    }

    // Create the invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("organization_invitations")
      .upsert({
        organization_id,
        email,
        role,
        invited_by: user.id,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, {
        onConflict: "organization_id,email"
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      throw new Error("Failed to create invitation");
    }

    console.log(`Invitation created with token: ${invitation.token}`);

    // Generate invitation URL
    const appUrl = req.headers.get("origin") || "https://heart-2-heart-database.lovable.app";
    const inviteUrl = `${appUrl}/auth?invite=${invitation.token}`;

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "Heart 2 Heart <onboarding@resend.dev>",
      to: [email],
      subject: `You've been invited to join ${organization_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 20px;">You've Been Invited!</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            You've been invited to join <strong>${organization_name}</strong> as a <strong>${role}</strong>.
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Click the button below to accept your invitation and create your account.
          </p>
          <a href="${inviteUrl}" 
             style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600;">
            Accept Invitation
          </a>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation sent successfully",
        invitation_id: invitation.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

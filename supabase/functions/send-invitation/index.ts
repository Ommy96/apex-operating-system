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
    // If a pending invitation already exists, reset it so we can resend
    const { data: existingInvite } = await supabaseAdmin
      .from("organization_invitations")
      .select("id, status")
      .eq("organization_id", organization_id)
      .eq("email", email)
      .single();

    if (existingInvite && existingInvite.status === "pending") {
      // Update expiry and resend — don't block the user
      console.log("Resending existing pending invitation for", email);
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
      from: "Ufanisi <noreply@ufanisi.inferatechs.com>",
      to: [email],
      subject: `You've been invited to join ${organization_name} on Ufanisi`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #10b981, #0d9488); padding: 16px; border-radius: 16px;">
              <span style="font-size: 24px; color: white;">✨</span>
            </div>
          </div>
          <h1 style="color: #333; margin-bottom: 20px; text-align: center;">You've Been Invited!</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5; text-align: center;">
            You've been invited to join <strong>${organization_name}</strong> as a <strong>${role}</strong> on Ufanisi.
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5; text-align: center;">
            Click the button below to accept your invitation and create your account.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #10b981, #0d9488); color: white; padding: 14px 28px; 
                      text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #999; font-size: 14px; margin-top: 30px; text-align: center;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            Ufanisi - NGO Management Platform
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

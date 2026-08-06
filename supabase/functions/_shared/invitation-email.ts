interface InvitationEmailArgs {
  inviterName: string;
  orgName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const roleLabel = (role: string) =>
  ({ admin: "Administrator", manager: "Manager", member: "Member" } as Record<string, string>)[role] ||
  role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function invitationEmail({ inviterName, orgName, role, inviteUrl, expiresAt }: InvitationEmailArgs) {
  const expiry = new Date(expiresAt).toLocaleDateString("en-KE", {
    day: "numeric", month: "long", year: "numeric",
  });
  const subject = `${inviterName} invited you to join ${orgName} on ApexOS`;
  const line = `${escape(inviterName)} has invited you to join <strong>${escape(orgName)}</strong> on ApexOS.`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background-color:#f6f7fb;">
  <div style="display:none;max-height:0;overflow:hidden;">You've been invited to ${escape(orgName)} on ApexOS.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f7fb;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e8ee;font-family:'Helvetica Neue',Arial,sans-serif;">
        <tr>
          <td style="background-color:#0A0F1E;padding:28px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">Apex<span style="color:#5EEAD4;">OS</span></span>
            <div style="color:#93A3BC;font-size:12px;margin-top:4px;">The Impact Operating System</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:22px;color:#0A0F1E;">You've been invited</h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44506A;">${line}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#F6F7FB;border-radius:10px;">
              <tr><td style="padding:14px 18px;font-size:14px;color:#44506A;">
                <strong style="color:#0A0F1E;">Organisation:</strong> ${escape(orgName)}<br/>
                <strong style="color:#0A0F1E;">Your role:</strong> ${escape(roleLabel(role))}
              </td></tr>
            </table>
            <div style="text-align:center;margin:0 0 24px;">
              <a href="${inviteUrl}" style="display:inline-block;background-color:#0F7B6C;color:#ffffff;padding:14px 30px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Accept invitation</a>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#7A879E;">This invitation expires on <strong>${expiry}</strong>.</p>
            <p style="margin:0;font-size:12px;color:#9AA6BC;word-break:break-all;">If the button doesn't work, paste this link into your browser:<br/>${inviteUrl}</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F6F7FB;padding:18px 32px;text-align:center;font-size:12px;color:#7A879E;">
            ApexOS — A product of Infera Tech Solutions<br/>
            If you weren't expecting this invitation, you can safely ignore this email.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `${inviterName} has invited you to join ${orgName} on ApexOS.

Role: ${roleLabel(role)}
Accept your invitation: ${inviteUrl}

This invitation expires on ${expiry}.
If you weren't expecting this invitation, you can safely ignore this email.

ApexOS — A product of Infera Tech Solutions`;

  return { html, text, subject };
}

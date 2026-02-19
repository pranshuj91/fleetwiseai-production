import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildEmailHtml(title: string, bodyText: string, ctaText: string, ctaLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #124481, #1E7083);padding:32px;text-align:center;">
              <img src="https://prime-zero-project.lovable.app/fleetwise-logo.png" alt="FleetWise AI" style="height:48px;width:auto;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="color:#1a1a1a;margin:0 0 16px;font-size:20px;">${title}</h2>
              <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 32px;">${bodyText}</p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#124481;border-radius:6px;">
                    <a href="${ctaLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">${ctaText}</a>
                  </td>
                </tr>
              </table>
              <p style="color:#999;font-size:13px;margin:32px 0 0;text-align:center;">This link expires in 48 hours. If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:24px 32px;text-align:center;border-top:1px solid #eee;">
              <p style="color:#888;font-size:13px;margin:0;">FleetWise AI &mdash; Fleet Management Made Intelligent</p>
              <p style="color:#888;font-size:13px;margin:8px 0 0;"><a href="mailto:support@fleetwiseai.com" style="color:#124481;text-decoration:none;">support@fleetwiseai.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "FleetWise AI <noreply@fleetwiseai.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Resend API error:", errBody);
    return { success: false, error: `Resend API error: ${res.status}` };
  }

  return { success: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://fleetwiseai.vercel.app";

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action, email } = body;

    if (!action || !email) {
      return new Response(JSON.stringify({ error: "action and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset-password") {
      // Check if user exists and is not deleted/disabled
      const { data: profileData } = await adminClient
        .from("profiles")
        .select("is_disabled, user_id")
        .eq("email", email)
        .maybeSingle();

      // If no profile found or user is disabled, silently return success (don't reveal user status)
      if (!profileData) {
        console.log("Password reset requested for non-existent user:", email);
        return new Response(
          JSON.stringify({
            success: true,
            message: "If an account exists with that email, a reset link has been sent.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (profileData.is_disabled) {
        console.log("Password reset requested for disabled/deleted user:", email);
        return new Response(
          JSON.stringify({
            success: false,
            error: "This account has been deactivated. Please contact your administrator.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Generate a password recovery link
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${appUrl}/reset-password` },
      });

      if (linkError) {
        console.error("Error generating recovery link:", linkError);
        return new Response(
          JSON.stringify({
            success: true,
            message: "If an account exists with that email, a reset link has been sent.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const actionLink = linkData?.properties?.action_link;
      if (!actionLink) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "If an account exists with that email, a reset link has been sent.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const html = buildEmailHtml(
        "Reset Your Password",
        "We received a request to reset the password for your FleetWise AI account. Click the button below to set a new password.",
        "Reset Password",
        actionLink,
      );

      const emailResult = await sendViaResend(email, "Reset Your FleetWise AI Password", html);
      if (!emailResult.success) {
        console.error("Failed to send reset email:", emailResult.error);
      }

      return new Response(
        JSON.stringify({ success: true, message: "If an account exists with that email, a reset link has been sent." }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else if (action === "magic-link") {
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${appUrl}/dashboard` },
      });

      if (linkError) {
        console.error("Error generating magic link:", linkError);
        return new Response(
          JSON.stringify({
            success: true,
            message: "If an account exists with that email, a sign-in link has been sent.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const actionLink = linkData?.properties?.action_link;
      if (!actionLink) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "If an account exists with that email, a sign-in link has been sent.",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const html = buildEmailHtml(
        "Sign In to FleetWise AI",
        "Click the button below to securely sign in to your FleetWise AI account. No password required.",
        "Sign In",
        actionLink,
      );

      const emailResult = await sendViaResend(email, "Sign In to FleetWise AI", html);
      if (!emailResult.success) {
        console.error("Failed to send magic link email:", emailResult.error);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "If an account exists with that email, a sign-in link has been sent.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

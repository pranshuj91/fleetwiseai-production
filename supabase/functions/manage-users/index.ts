import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  full_name: string;
  username?: string;
  phone?: string;
  role: 'master_admin' | 'company_admin' | 'office_manager' | 'shop_supervisor' | 'technician';
  company_id: string;
}

interface DeleteUserRequest {
  user_id: string;
}

interface UpdateUserRequest {
  user_id: string;
  full_name?: string;
  username?: string;
  phone?: string;
  role?: 'master_admin' | 'company_admin' | 'office_manager' | 'shop_supervisor' | 'technician';
}

interface ToggleStatusRequest {
  user_id: string;
  is_disabled: boolean;
}

interface ValidateInviteRequest {
  token: string;
}

interface SetPasswordRequest {
  token: string;
  password: string;
}

// Generate a cryptographically random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Admin client for user management (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(req.url);
    const pathAction = url.pathname.split('/').pop();
    const body = await req.json();
    const action = body.action || pathAction;

    console.log('Resolved Action:', action, 'Method:', req.method);

    // ========== PUBLIC ACTIONS (no auth required) ==========
    if (action === 'validate-invite') {
      const { token } = body as ValidateInviteRequest;
      if (!token) {
        return new Response(JSON.stringify({ error: 'Token is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: invite, error: inviteError } = await adminClient
        .from('invite_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (inviteError || !invite) {
        return new Response(JSON.stringify({ error: 'Invalid invite link' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (invite.used_at) {
        return new Response(JSON.stringify({ error: 'This invite link has already been used' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (new Date(invite.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'This invite link has expired' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        valid: true,
        email: invite.email,
        role: invite.role,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'set-password') {
      const { token, password } = body as SetPasswordRequest;
      if (!token || !password) {
        return new Response(JSON.stringify({ error: 'Token and password are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate token
      const { data: invite, error: inviteError } = await adminClient
        .from('invite_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (inviteError || !invite) {
        return new Response(JSON.stringify({ error: 'Invalid invite link' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (invite.used_at) {
        return new Response(JSON.stringify({ error: 'This invite link has already been used' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (new Date(invite.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'This invite link has expired' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Set the user's password
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        invite.user_id,
        { password }
      );

      if (updateError) {
        console.error('Error setting password:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to set password' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Mark token as used
      await adminClient
        .from('invite_tokens')
        .update({ used_at: new Date().toISOString(), password_set_at: new Date().toISOString() })
        .eq('id', invite.id);

      // Enable the user (in case they were disabled)
      await adminClient
        .from('profiles')
        .update({ is_disabled: false })
        .eq('user_id', invite.user_id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== AUTHENTICATED ACTIONS ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify JWT using getClaims (more reliable than getUser which depends on sessions)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Auth claims error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestingUserId = claimsData.claims.sub as string;
    const requestingUser = { id: requestingUserId, email: claimsData.claims.email as string };

    // Get requesting user's role and company
    const { data: requestingProfile } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', requestingUser.id)
      .single();

    const { data: requestingRoles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id);

    const isMasterAdmin = requestingRoles?.some(r => r.role === 'master_admin');
    const isCompanyAdmin = requestingRoles?.some(r => r.role === 'company_admin') || isMasterAdmin;
    const isOfficeManager = requestingRoles?.some(r => r.role === 'office_manager');

    // Allow master_admin, company_admin, and office_manager to manage users
    const canManageUsers = isMasterAdmin || isCompanyAdmin || isOfficeManager;

    if (!canManageUsers) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions. Only Super Admin, Company Admin, and Office Manager can manage users.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Request body:', JSON.stringify(body, null, 2));

    // ========== CREATE USER (Invite Flow) ==========
    if ((req.method === 'POST' && action === 'create') || (req.method === 'POST' && pathAction === 'create')) {
      const { email, full_name, username, phone, role, company_id } = body as CreateUserRequest;

      console.log('Creating user (invite flow):', email, 'with role:', role, 'in company:', company_id);

      const isCreatingMasterAdmin = role === 'master_admin';

      // Validate required fields
      if (!email || !full_name || !role) {
        return new Response(JSON.stringify({ error: 'Missing required fields: email, full_name, and role are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // company_id is required for non-master_admin roles
      if (!isCreatingMasterAdmin && !company_id) {
        return new Response(JSON.stringify({ error: 'company_id is required for non-master_admin users' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Office managers can only create users in their own company
      if (isOfficeManager && !isCompanyAdmin) {
        if (requestingProfile?.company_id !== company_id) {
          return new Response(JSON.stringify({ error: 'Office managers can only create users in their own company' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        // Office managers cannot create admin or master_admin roles
        if (role === 'master_admin' || role === 'company_admin') {
          return new Response(JSON.stringify({ error: 'Office managers cannot create admin-level users' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Non-master admins can only create users in their own company
      if (!isMasterAdmin && requestingProfile?.company_id !== company_id) {
        return new Response(JSON.stringify({ error: 'Cannot create users in other companies' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Prevent non-master admins from creating master_admin users
      if (!isMasterAdmin && role === 'master_admin') {
        return new Response(JSON.stringify({ error: 'Cannot create master admin users' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Step 1: Create user without sending Supabase email
      let userId: string;
      let isReactivation = false;

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name, username },
      });

      if (createError) {
        // Handle "email already exists" — reuse the existing auth user (e.g., previously deleted/disabled)
        if ((createError as any).code === 'email_exists' || createError.message?.includes('already been registered')) {
          console.log('User already exists in auth, reactivating:', email);
          const { data: listData } = await adminClient.auth.admin.listUsers();
          const existingUser = listData?.users?.find((u: any) => u.email === email);
          if (!existingUser) {
            return new Response(JSON.stringify({ error: 'User exists but could not be found. Please contact support.' }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          userId = existingUser.id;
          isReactivation = true;
          // Update auth user metadata
          await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { full_name, username },
          });
          console.log('Reactivating existing auth user:', userId);
        } else {
          console.error('Error creating user:', createError);
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        userId = newUser.user.id;
      }

      console.log(isReactivation ? 'Reactivating user:' : 'Auth user created:', userId);

      // Get the auto-created profile's company_id (from trigger) so we can clean it up
      const { data: autoProfile } = await adminClient
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single();
      
      const autoCreatedCompanyId = autoProfile?.company_id;

      // Override the profile with correct data
      const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
          user_id: userId,
          email,
          full_name,
          username,
          company_id: isCreatingMasterAdmin ? null : company_id,
          role,
          is_disabled: true,
        }, { onConflict: 'user_id', ignoreDuplicates: false });

      if (profileError) {
        console.error('Error creating/updating profile:', profileError);
        if (!isReactivation) {
          await adminClient.auth.admin.deleteUser(userId);
        }
        return new Response(JSON.stringify({ error: 'Failed to create profile: ' + profileError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Clean up auto-created company from trigger (if different from target)
      if (!isReactivation && autoCreatedCompanyId && autoCreatedCompanyId !== company_id) {
        await adminClient.from('companies').delete().eq('id', autoCreatedCompanyId);
      }

      // Override role entry
      await adminClient.from('user_roles').delete().eq('user_id', userId);
      
      const roleInsertData: { user_id: string; role: string; company_id?: string } = {
        user_id: userId,
        role,
      };
      if (company_id && !isCreatingMasterAdmin) {
        roleInsertData.company_id = company_id;
      }
      
      const { error: roleError } = await adminClient
        .from('user_roles')
        .insert(roleInsertData);

      if (roleError) {
        console.error('Error creating user role:', roleError);
        if (!isReactivation) {
          await adminClient.from('profiles').delete().eq('user_id', userId);
          await adminClient.auth.admin.deleteUser(userId);
        }
        return new Response(JSON.stringify({ error: 'Failed to create user role: ' + roleError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Step 2: Generate invite link
      const appUrl = Deno.env.get('APP_URL') || 'https://fleetwiseai.vercel.app';
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${appUrl}/setup-password` },
      });

      let emailSent = false;
      if (linkError) {
        console.error('Error generating invite link:', linkError);
      } else {
        const actionLink = linkData?.properties?.action_link;
        if (actionLink) {
          // Extract token_hash from the action link and build a direct app link
          // This bypasses Supabase's /auth/v1/verify redirect which uses Site URL
          const parsedLink = new URL(actionLink);
          const tokenHash = parsedLink.searchParams.get('token') || parsedLink.searchParams.get('token_hash') || '';
          const directLink = `${appUrl}/setup-password?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`;
          // Step 3: Get company name for the email
          let companyDisplayName = 'your organization';
          if (company_id) {
            const { data: companyData } = await adminClient
              .from('companies')
              .select('name')
              .eq('id', company_id)
              .single();
            if (companyData?.name) companyDisplayName = companyData.name;
          }

          const roleDisplayName = role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

          // Send branded email via Resend
          const resendApiKey = Deno.env.get('RESEND_API_KEY');
          if (resendApiKey) {
            const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#124481,#1E7083);padding:32px;text-align:center;">
          <img src="https://prime-zero-project.lovable.app/fleetwise-logo.png" alt="FleetWise AI" style="height:48px;width:auto;" />
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <h2 style="color:#1a1a1a;margin:0 0 16px;font-size:20px;">You're Invited!</h2>
          <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 8px;">You have been invited to join <strong>FleetWise AI</strong> as <strong>${roleDisplayName}</strong> for <strong>${companyDisplayName}</strong>.</p>
          <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 32px;">Click the button below to set up your password and get started.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background-color:#124481;border-radius:6px;">
               <a href="${directLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Set Up Your Password</a>
            </td></tr>
          </table>
          <p style="color:#999;font-size:13px;margin:32px 0 0;text-align:center;">This link expires in 48 hours. If you didn't expect this invitation, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="background-color:#f8f9fa;padding:24px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="color:#888;font-size:13px;margin:0;">FleetWise AI &mdash; Fleet Management Made Intelligent</p>
          <p style="color:#888;font-size:13px;margin:8px 0 0;"><a href="mailto:support@fleetwiseai.com" style="color:#124481;text-decoration:none;">support@fleetwiseai.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'FleetWise AI <noreply@fleetwiseai.com>',
                to: [email],
                subject: `You're Invited to FleetWise AI`,
                html,
              }),
            });

            emailSent = res.ok;
            if (!res.ok) {
              console.error('Resend API error:', await res.text());
            }
          } else {
            console.warn('RESEND_API_KEY not configured, skipping email');
          }
        }
      }

      // Record invite in invite_tokens for audit trail
      const inviteToken = generateToken();
      const { error: tokenError } = await adminClient
        .from('invite_tokens')
        .insert({
          token: inviteToken,
          user_id: userId,
          email,
          company_id: isCreatingMasterAdmin ? null : company_id,
          role,
          invited_by: requestingUser.id,
        });

      if (tokenError) {
        console.error('Error creating invite token:', tokenError);
      }

      const roleDisplayNameFinal = role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

      return new Response(JSON.stringify({
        success: true,
        user: {
          id: userId,
          email,
          full_name,
          role,
        },
        email_sent: emailSent,
        message: `${full_name} has been invited as ${roleDisplayNameFinal}`,
      }), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // ========== DELETE USER ==========
    } else if ((req.method === 'DELETE' && action === 'delete') || (req.method === 'POST' && action === 'delete')) {
      console.log('Processing delete action for user_id:', body.user_id);
      const { user_id } = body as DeleteUserRequest;

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'Missing user_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('company_id')
        .eq('user_id', user_id)
        .single();

      if (!isMasterAdmin && targetProfile?.company_id !== requestingProfile?.company_id) {
        return new Response(JSON.stringify({ error: 'Cannot delete users from other companies' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: targetRoles } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user_id);

      if (targetRoles?.some(r => r.role === 'master_admin') && !isMasterAdmin) {
        return new Response(JSON.stringify({ error: 'Cannot delete master admin users' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Office managers cannot delete admins
      if (isOfficeManager && !isCompanyAdmin) {
        const targetRole = targetRoles?.[0]?.role;
        if (targetRole === 'company_admin' || targetRole === 'master_admin') {
          return new Response(JSON.stringify({ error: 'Office managers cannot delete admin users' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      await adminClient.from('invite_tokens').delete().eq('user_id', user_id);
      await adminClient.from('user_roles').delete().eq('user_id', user_id);
      await adminClient.from('profiles').delete().eq('user_id', user_id);

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // ========== UPDATE USER ==========
    } else if ((req.method === 'PUT' && action === 'update') || (req.method === 'POST' && action === 'update')) {
      const { user_id, full_name, username, phone, role } = body as UpdateUserRequest;

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'Missing user_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('company_id')
        .eq('user_id', user_id)
        .single();

      if (!isMasterAdmin && targetProfile?.company_id !== requestingProfile?.company_id) {
        return new Response(JSON.stringify({ error: 'Cannot update users from other companies' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const profileUpdates: Record<string, string> = {};
      if (full_name) profileUpdates.full_name = full_name;
      if (username) profileUpdates.username = username;
      if (role) profileUpdates.role = role;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: updateError } = await adminClient
          .from('profiles')
          .update(profileUpdates)
          .eq('user_id', user_id);

        if (updateError) {
          return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (role) {
        const { error: roleError } = await adminClient
          .from('user_roles')
          .update({ role })
          .eq('user_id', user_id);

        if (roleError) {
          return new Response(JSON.stringify({ error: 'Failed to update role' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // ========== TOGGLE STATUS ==========
    } else if ((req.method === 'PUT' && action === 'toggle-status') || (req.method === 'POST' && action === 'toggle-status')) {
      const { user_id, is_disabled } = body as ToggleStatusRequest;

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'Missing user_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('company_id')
        .eq('user_id', user_id)
        .single();

      if (!isMasterAdmin && targetProfile?.company_id !== requestingProfile?.company_id) {
        return new Response(JSON.stringify({ error: 'Cannot modify users from other companies' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: targetRoles } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user_id);

      if (targetRoles?.some(r => r.role === 'master_admin') && !isMasterAdmin) {
        return new Response(JSON.stringify({ error: 'Cannot disable master admin users' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ is_disabled })
        .eq('user_id', user_id);

      if (updateError) {
        return new Response(JSON.stringify({ error: 'Failed to update user status' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, is_disabled }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // ========== RESEND INVITE ==========
    } else if (req.method === 'POST' && action === 'resend-invite') {
      const { user_id } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'Missing user_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user profile
      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('email, company_id, role, full_name')
        .eq('user_id', user_id)
        .single();

      if (!targetProfile) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Invalidate old tokens
      await adminClient
        .from('invite_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .is('used_at', null);

      // Generate new invite token for audit
      const inviteToken = generateToken();
      await adminClient
        .from('invite_tokens')
        .insert({
          token: inviteToken,
          user_id,
          email: targetProfile.email,
          company_id: targetProfile.company_id,
          role: targetProfile.role,
          invited_by: requestingUser.id,
        });

      // Generate invite link via Supabase
      const appUrl = Deno.env.get('APP_URL') || 'https://fleetwiseai.vercel.app';
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: targetProfile.email,
        options: { redirectTo: `${appUrl}/setup-password` },
      });

      let emailSent = false;
      if (!linkError && linkData?.properties?.action_link) {
        // Get company name
        let companyDisplayName = 'your organization';
        if (targetProfile.company_id) {
          const { data: companyData } = await adminClient
            .from('companies')
            .select('name')
            .eq('id', targetProfile.company_id)
            .single();
          if (companyData?.name) companyDisplayName = companyData.name;
        }

        const roleDisplayName = (targetProfile.role || 'User').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        // Extract token_hash and build direct app link (bypasses Supabase Site URL redirect)
        const actionLink = linkData.properties.action_link;
        const parsedUrl = new URL(actionLink);
        const tokenHash = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('token_hash') || '';
        const directLink = `${appUrl}/setup-password?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`;

        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (resendApiKey) {
          const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#124481,#1E7083);padding:32px;text-align:center;">
          <img src="https://prime-zero-project.lovable.app/fleetwise-logo.png" alt="FleetWise AI" style="height:48px;width:auto;" />
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <h2 style="color:#1a1a1a;margin:0 0 16px;font-size:20px;">Invitation Reminder</h2>
          <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 8px;">This is a reminder that you've been invited to join <strong>FleetWise AI</strong> as <strong>${roleDisplayName}</strong> for <strong>${companyDisplayName}</strong>.</p>
          <p style="color:#4a4a4a;font-size:15px;line-height:1.6;margin:0 0 32px;">Click the button below to set up your password and get started.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr><td style="background-color:#124481;border-radius:6px;">
              <a href="${directLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Set Up Your Password</a>
            </td></tr>
          </table>
          <p style="color:#999;font-size:13px;margin:32px 0 0;text-align:center;">This link expires in 48 hours.</p>
        </td></tr>
        <tr><td style="background-color:#f8f9fa;padding:24px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="color:#888;font-size:13px;margin:0;">FleetWise AI &mdash; Fleet Management Made Intelligent</p>
          <p style="color:#888;font-size:13px;margin:8px 0 0;"><a href="mailto:support@fleetwiseai.com" style="color:#124481;text-decoration:none;">support@fleetwiseai.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'FleetWise AI <noreply@fleetwiseai.com>',
              to: [targetProfile.email],
              subject: `Reminder: You're Invited to FleetWise AI`,
              html,
            }),
          });

          emailSent = res.ok;
          if (!res.ok) {
            console.error('Resend API error:', await res.text());
          }
        }
      }

      return new Response(JSON.stringify({ success: true, email_sent: emailSent }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

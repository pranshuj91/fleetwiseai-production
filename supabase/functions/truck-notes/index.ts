import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's company_id from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'User profile not found or missing company' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = profile.company_id;
    const url = new URL(req.url);
    const path = url.pathname.replace('/truck-notes', '');

    // POST /truck-notes - Create a new note
    if (req.method === 'POST' && (path === '' || path === '/')) {
      const body = await req.json();
      const { truck_id, note_type, note_text, media_url, photo_url, reminder_at, source } = body;

      if (!truck_id) {
        return new Response(
          JSON.stringify({ error: 'truck_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify truck belongs to user's company
      const { data: truck, error: truckError } = await supabase
        .from('trucks')
        .select('id')
        .eq('id', truck_id)
        .eq('company_id', companyId)
        .single();

      if (truckError || !truck) {
        return new Response(
          JSON.stringify({ error: 'Truck not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create the note
      const { data: note, error: insertError } = await supabase
        .from('truck_notes')
        .insert({
          company_id: companyId,
          truck_id,
          created_by: user.id,
          note_type: note_type || 'text',
          note_text,
          media_url,
          photo_url,
          reminder_at,
          source: source || 'manual'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create note', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data: note }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /truck-notes/timeline?truck_id= - Timeline format with creator name
    if (req.method === 'GET' && path === '/timeline') {
      const truckId = url.searchParams.get('truck_id');

      if (!truckId) {
        return new Response(
          JSON.stringify({ error: 'truck_id query parameter is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify truck belongs to user's company
      const { data: truck, error: truckError } = await supabase
        .from('trucks')
        .select('id')
        .eq('id', truckId)
        .eq('company_id', companyId)
        .single();

      if (truckError || !truck) {
        return new Response(
          JSON.stringify({ error: 'Truck not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch notes with creator profile info
      const { data: notes, error: notesError } = await supabase
        .from('truck_notes')
        .select(`
          id,
          note_type,
          note_text,
          media_url,
          photo_url,
          reminder_at,
          source,
          tags,
          created_at,
          created_by
        `)
        .eq('truck_id', truckId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (notesError) {
        console.error('Fetch notes error:', notesError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch notes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get creator names and roles for all notes
      const creatorIds = [...new Set(notes?.map(n => n.created_by).filter(Boolean))];
      let creatorsMap: Record<string, { name: string; role: string }> = {};

      if (creatorIds.length > 0) {
        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, role')
          .in('user_id', creatorIds);

        // Fetch roles from user_roles table
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', creatorIds);

        // Build roles map
        const rolesMap: Record<string, string> = {};
        if (userRoles) {
          userRoles.forEach(ur => {
            rolesMap[ur.user_id] = ur.role;
          });
        }

        if (profiles) {
          creatorsMap = profiles.reduce((acc, p) => {
            // Get role from user_roles table first, fallback to profile.role
            const role = rolesMap[p.user_id] || p.role || 'user';
            // Format role for display (replace underscores, capitalize)
            const formattedRole = role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            acc[p.user_id] = {
              name: p.full_name || p.email || 'Unknown User',
              role: formattedRole
            };
            return acc;
          }, {} as Record<string, { name: string; role: string }>);
        }
      }

      // Format for timeline
      const timeline = notes?.map(note => ({
        id: note.id,
        note_type: note.note_type,
        note_text: note.note_text,
        media_url: note.media_url,
        photo_url: note.photo_url,
        reminder_at: note.reminder_at,
        source: note.source,
        tags: note.tags,
        created_at: note.created_at,
        created_by_id: note.created_by,
        created_by_name: note.created_by ? creatorsMap[note.created_by]?.name || 'Unknown User' : 'System',
        created_by_role: note.created_by ? creatorsMap[note.created_by]?.role || 'User' : null
      }));

      return new Response(
        JSON.stringify({ data: timeline }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /truck-notes?truck_id= - Fetch all notes for a truck
    if (req.method === 'GET' && (path === '' || path === '/')) {
      const truckId = url.searchParams.get('truck_id');

      if (!truckId) {
        return new Response(
          JSON.stringify({ error: 'truck_id query parameter is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify truck belongs to user's company
      const { data: truck, error: truckError } = await supabase
        .from('trucks')
        .select('id')
        .eq('id', truckId)
        .eq('company_id', companyId)
        .single();

      if (truckError || !truck) {
        return new Response(
          JSON.stringify({ error: 'Truck not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch notes
      const { data: notes, error: notesError } = await supabase
        .from('truck_notes')
        .select('*')
        .eq('truck_id', truckId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (notesError) {
        console.error('Fetch notes error:', notesError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch notes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data: notes }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

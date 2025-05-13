import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Delete user and profile function initializing.");

serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    console.log(`Received request to delete user ID: ${userId}`);

    if (!userId) {
      console.error("User ID not provided.");
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create an admin Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log(`Attempting to delete user profile for ID: ${userId}`);
    // First, delete the user's profile from the profiles table
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error(`Error deleting profile for user ID ${userId}:`, profileError);
      // Decide if this is a critical error. If the profile doesn't exist, we might want to continue to delete the auth user.
      // For now, let's return an error.
      return new Response(
        JSON.stringify({ error: `Failed to delete profile: ${profileError.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
    console.log(`Successfully deleted profile for user ID: ${userId}`);

    console.log(`Attempting to delete auth user for ID: ${userId}`);
    // Then, delete the user from auth.users
    // Note: This requires the `supabase_admin_write_role` or service_role key
    const { data: authUserDeletion, error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error(`Error deleting auth user for ID ${userId}:`, authError);
      // If profile was deleted but auth user deletion fails, this is a partial success/failure state.
      // You might want to log this for manual intervention.
      return new Response(
        JSON.stringify({ error: `Failed to delete auth user: ${authError.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
    console.log(`Successfully deleted auth user for ID: ${userId}`, authUserDeletion);

    return new Response(JSON.stringify({ message: "User and profile deleted successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("General error in delete-user-and-profile function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/* 
Test with curl:
curl -i --location --request POST 'http://localhost:54321/functions/v1/delete-user-and-profile' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"userId":"USER_ID_TO_DELETE"}'

Replace YOUR_SUPABASE_ANON_KEY with your project's anon key (if invoking from client with RLS)
or use service_role key if testing directly and function expects admin privileges.
However, this function uses the service_role key internally, so the Authorization header for invocation
might just need to be the anon key if your API gateway is set up for it, or if you test via supabase.functions.invoke.

When invoking via supabase.functions.invoke from the client-side, the client library handles authentication.
*/ 
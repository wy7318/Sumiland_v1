// supabase/functions/test-square-connection/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { Client, Environment } from 'https://esm.sh/square@25.0.0';
serve(async (req)=>{
  // Check if method is POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    // Parse request body
    const { accessToken, locationId, environment } = await req.json();
    if (!accessToken || !locationId) {
      return new Response(JSON.stringify({
        error: 'Access token and location ID are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Initialize Square client
    const squareClient = new Client({
      accessToken,
      environment: environment === 'production' ? Environment.Production : Environment.Sandbox
    });
    // Test connection by fetching location details
    const { result } = await squareClient.locationsApi.retrieveLocation(locationId);
    // Return success with location info
    return new Response(JSON.stringify({
      success: true,
      location: {
        id: result.location.id,
        name: result.location.name,
        status: result.location.status,
        type: result.location.type
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error testing Square connection:', error);
    return new Response(JSON.stringify({
      error: 'Failed to connect to Square',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

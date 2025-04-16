// pages/api/auth/google/exchange.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Google exchange endpoint called', req.method, req.body);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { code } = req.body;
  
  if (!code) {
    console.error('No code provided in request body');
    return res.status(400).json({ message: 'Authorization code is required' });
  }

  try {
    // Fix the redirect_uri to not use window (which doesn't exist on server)
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173';
    
    console.log(`Exchanging code for tokens with redirect URI: ${redirectUri}`);
    
    // Exchange the code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const responseText = await tokenResponse.text();
    console.log('Google response status:', tokenResponse.status);
    
    // Only try to parse if there's content
    let tokenData;
    try {
      tokenData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      return res.status(500).json({ 
        message: 'Invalid response from Google', 
        details: responseText.substring(0, 100) 
      });
    }

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return res.status(400).json({
        message: 'Failed to exchange code for tokens',
        details: tokenData.error_description || tokenData.error,
      });
    }

    console.log('Token exchange successful');
    return res.status(200).json(tokenData);
  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}
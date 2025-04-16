import { PublicClientApplication } from '@azure/msal-browser';
import { supabase } from './supabase';

// Microsoft Azure AD configuration
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin
  }
};

const msalInstance = new PublicClientApplication(msalConfig);

// Email provider types
export type EmailProvider = 'gmail' | 'outlook';

export type EmailConfig = {
  provider: EmailProvider;
  email?: string; // Added email field
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string; // Added to track OAuth scopes
};



// lib/email.ts
export async function saveEmailConfig(userId, config, organizationId) {
  const { data, error } = await supabase
    .from('email_configurations')
    .insert({
      user_id: userId,
      organization_id: organizationId,
      provider: config.provider,
      email: config.email,
      access_token: config.access_token,
      refresh_token: config.refresh_token, // Make sure this is stored
      token_expiry: config.token_expiry,   // Make sure this is stored
    });

  return { data, error };
}

// Get email config (now can be org-specific)
export async function getEmailConfig(
  userId: string, 
  organizationId?: string
): Promise<EmailConfig | null> {
  try {
    let query = supabase
      .from('email_configurations')
      .select('*')
      .eq('user_id', userId);
    
    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      provider: data.provider,
      email: data.email,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.token_expiry).getTime(),
      scope: data.scopes
    };
  } catch (err) {
    console.error('Error getting email config:', err);
    return null;
  }
}



export async function connectGmail(authCode: string) {
  try {
    console.log(`Sending auth code to exchange endpoint...`);
    
    // Change to your Supabase function URL
    const response = await fetch('https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/google-exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: authCode }),
    });
    
    console.log(`Exchange response status: ${response.status}`);
    
    // Get the response as text first for safer handling
    const responseText = await response.text();
    
    // Only parse as JSON if there's content
    let tokenData;
    try {
      tokenData = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      console.error('Invalid JSON in response:', responseText);
      throw new Error(`Failed to parse exchange response`);
    }
    
    if (!response.ok || !tokenData) {
      const errorMessage = tokenData?.message || 'Unknown error';
      console.error('Exchange error:', tokenData);
      throw new Error(errorMessage);
    }
    
    // Rest of your function remains the same...
    // Get user email using the access token
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user email');
    }
    
    const userInfo = await userInfoResponse.json();
    
    return {
      provider: 'gmail',
      email: userInfo.email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Error in connectGmail:', error);
    throw error;
  }
}

// Connect to Outlook - enhanced to retrieve email
export async function connectOutlook() {
  try {
    const response = await msalInstance.loginPopup({
      scopes: ['Mail.Send', 'User.Read'] // Added User.Read to get email
    });

    // Get user's email from Microsoft Graph
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${response.accessToken}`
      }
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info from Microsoft');
    }

    const userInfo = await userInfoResponse.json();
    const email = userInfo.mail || userInfo.userPrincipalName;

    return {
      provider: 'outlook' as EmailProvider,
      email: email,
      accessToken: response.accessToken,
      expiresAt: response.expiresOn.getTime(),
      scope: response.scopes.join(' ')
    };
  } catch (err) {
    console.error('Error connecting to Outlook:', err);
    throw err;
  }
}

// Send email using Gmail - FIXED to not require profile fetch
async function sendGmailEmail(
  accessToken: string,
  senderEmail: string, // Now using the email stored in the config
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string
) {
  let raw = `From: ${senderEmail}\r\n`;
  raw += `To: ${to}\r\n`;
  if (cc) raw += `Cc: ${cc}\r\n`;
  if (bcc) raw += `Bcc: ${bcc}\r\n`;
  raw += `Subject: ${subject}\r\n`;
  raw += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
  raw += body;

  const encodedEmail = btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedEmail })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to send email through Gmail: ${errorData.error?.message || 'Unknown error'}`);
  }

  return response.json();
}

// Send email using Outlook
async function sendOutlookEmail(
  accessToken: string,
  senderEmail: string, // Now using the email stored in the config
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string
) {
  // Parse recipients
  const toRecipients = to.split(',').map(email => ({
    emailAddress: { address: email.trim() }
  }));

  const ccRecipients = cc
    ? cc.split(',').map(email => ({
      emailAddress: { address: email.trim() }
    }))
    : [];

  const bccRecipients = bcc
    ? bcc.split(',').map(email => ({
      emailAddress: { address: email.trim() }
    }))
    : [];

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: body
        },
        toRecipients,
        ccRecipients,
        bccRecipients
      },
      saveToSentItems: 'true'
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to send email through Outlook: ${errorData.error?.message || 'Unknown error'}`);
  }

  return { success: true };
}

// DEPRECATED - No longer needed as we store the email
// This function caused the 403 Forbidden error
async function getGmailSenderAddress(accessToken: string): Promise<string> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch Gmail profile');
  }
  const data = await res.json();
  return data.emailAddress;
}

// DEPRECATED - No longer needed as we store the email
async function getOutlookSenderAddress(accessToken: string): Promise<string> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch Outlook profile');
  }
  const data = await res.json();
  return data.mail || data.userPrincipalName;
}

// Enhanced main sendEmail function
export async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
  organizationId?: string,
  recordId?: string
) {
  const toList = to.split(',').map(e => e.trim());
  const ccList = cc ? cc.split(',').map(e => e.trim()) : [];
  const bccList = bcc ? bcc.split(',').map(e => e.trim()) : [];

  let provider = '';
  let fromAddress = '';

  try {
    // Get email config with organization context if provided
    const config = await getEmailConfig(userId, organizationId);
    if (!config) throw new Error('No email configuration found');
    
    // Check if token is expired
    if (Date.now() >= config.expiresAt) {
      // In production, implement token refresh logic here
      throw new Error('Email token expired');
    }

    provider = config.provider;
    
    // Use the email address stored in the config
    // This eliminates the need to fetch the profile each time
    if (!config.email) {
      throw new Error('Sender email address not found in configuration. Please reconnect your email account.');
    }
    
    fromAddress = config.email;

    // Send the email using the appropriate provider
    if (config.provider === 'gmail') {
      await sendGmailEmail(config.accessToken, fromAddress, to, subject, body, cc, bcc);
    } else {
      await sendOutlookEmail(config.accessToken, fromAddress, to, subject, body, cc, bcc);
    }

    // Log the successful send to Supabase
    const { error } = await supabase.from('email_messages').insert({
      record_id: recordId || null,
      organization_id: organizationId,
      user_id: userId,
      from_address: fromAddress,
      to_addresses: toList,
      cc_addresses: ccList,
      bcc_addresses: bccList,
      subject,
      body_html: body,
      incoming: false,
      provider,
      status: 'sent',
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('Error logging email:', error);
    }

    return { success: true };

  } catch (err: any) {
    console.error('Error sending email:', err);

    // Log the failure as well
    await supabase.from('email_messages').insert({
      record_id: recordId || null,
      organization_id: organizationId,
      user_id: userId,
      from_address: fromAddress || 'unknown',
      to_addresses: toList,
      cc_addresses: ccList,
      bcc_addresses: bccList,
      subject,
      body_html: body,
      incoming: false,
      provider,
      status: 'failed',
      error_message: err.message || 'Unknown error',
      created_at: new Date().toISOString()
    });

    throw err;
  }
}
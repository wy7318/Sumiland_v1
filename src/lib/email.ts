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
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

export async function saveEmailConfig(userId: string, config: EmailConfig) {
  try {
    const { error } = await supabase
      .from('email_configurations')
      .upsert({
        user_id: userId,
        provider: config.provider,
        access_token: config.accessToken,
        refresh_token: config.refreshToken,
        expires_at: new Date(config.expiresAt).toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Error saving email config:', err);
    return { error: err };
  }
}

export async function getEmailConfig(userId: string): Promise<EmailConfig | null> {
  try {
    const { data, error } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      provider: data.provider,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at).getTime()
    };
  } catch (err) {
    console.error('Error getting email config:', err);
    return null;
  }
}

// Connect to Gmail
export async function connectGmail(response: any) {
  try {
    if (!response?.access_token) {
      throw new Error('No access token received from Google');
    }

    return {
      provider: 'gmail' as EmailProvider,
      accessToken: response.access_token,
      expiresAt: Date.now() + (response.expires_in * 1000)
    };
  } catch (err) {
    console.error('Error connecting to Gmail:', err);
    throw err;
  }
}

// Connect to Outlook
export async function connectOutlook() {
  try {
    const response = await msalInstance.loginPopup({
      scopes: ['Mail.Send']
    });

    return {
      provider: 'outlook' as EmailProvider,
      accessToken: response.accessToken,
      expiresAt: response.expiresOn.getTime()
    };
  } catch (err) {
    console.error('Error connecting to Outlook:', err);
    throw err;
  }
}

// Send email using Gmail
async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string
) {
  let raw = `To: ${to}\r\n`;
  if (cc) raw += `Cc: ${cc}\r\n`;
  if (bcc) raw += `Bcc: ${bcc}\r\n`;
  raw += `Subject: ${subject}\r\n`;
  raw += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
  raw += body;

  const encodedEmail = btoa(raw)
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
    throw new Error('Failed to send email through Gmail');
  }

  return response.json();
}

// Send email using Outlook
async function sendOutlookEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string
) {
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
        toRecipients: [{ emailAddress: { address: to } }],
        ccRecipients,
        bccRecipients
      }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to send email through Outlook');
  }

  return response.json();
}

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



export async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
  orgId?: string, 
  recordId?: string // optional related record ID (e.g. case ID)
) {
  const toList = to.split(',').map(e => e.trim());
  const ccList = cc ? cc.split(',').map(e => e.trim()) : [];
  const bccList = bcc ? bcc.split(',').map(e => e.trim()) : [];

  let provider = '';
  let fromAddress = '';

  try {
    const config = await getEmailConfig(userId);
    if (!config) throw new Error('No email configuration found');
    if (Date.now() >= config.expiresAt) throw new Error('Email token expired');

    provider = config.provider;

    // Send email
    if (config.provider === 'gmail') {
      fromAddress = 'me'; // Gmail always uses the authorized account
      await sendGmailEmail(config.accessToken, to, subject, body, cc, bcc);
    } else {
      fromAddress = 'me'; // Outlook uses the authorized user too
      await sendOutlookEmail(config.accessToken, to, subject, body, cc, bcc);
    }

    // When it goes to PROD, use below to get fromAddress

    // let fromAddress = '';

    // if (config.provider === 'gmail') {
    //   fromAddress = await getGmailSenderAddress(config.accessToken);
    //   await sendGmailEmail(config.accessToken, to, subject, body, cc, bcc);
    // } else {
    //   fromAddress = await getOutlookSenderAddress(config.accessToken);
    //   await sendOutlookEmail(config.accessToken, to, subject, body, cc, bcc);
    // }

    // ✅ Log the successful send to Supabase
    await supabase.from('email_messages').insert({
      record_id: recordId || null,
      organization_id: orgId,
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

  } catch (err: any) {
    console.error('Error sending email:', err);

    // ❗ Log the failure as well
    await supabase.from('email_messages').insert({
      record_id: recordId || null,
      organization_id: orgId,
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




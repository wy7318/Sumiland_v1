// import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
// import { supabase } from './supabase';

// // Microsoft Azure AD configuration
// const msalConfig = {
//   auth: {
//     clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
//     authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
//     redirectUri: window.location.origin
//   }
// };

// const msalInstance = new PublicClientApplication(msalConfig);

// // Email provider types
// export type EmailProvider = 'gmail' | 'outlook';

// // Email configuration type
// export type EmailConfig = {
//   provider: EmailProvider;
//   accessToken: string;
//   refreshToken?: string;
//   expiresAt: number;
// };

// // Store email configuration in Supabase
// export async function saveEmailConfig(userId: string, config: EmailConfig) {
//   try {
//     const { error } = await supabase
//       .from('email_configurations')
//       .upsert({
//         user_id: userId,
//         provider: config.provider,
//         access_token: config.accessToken,
//         refresh_token: config.refreshToken,
//         expires_at: new Date(config.expiresAt).toISOString(),
//         updated_at: new Date().toISOString()
//       });

//     if (error) throw error;
//     return { error: null };
//   } catch (err) {
//     console.error('Error saving email config:', err);
//     return { error: err };
//   }
// }

// // Get stored email configuration
// export async function getEmailConfig(userId: string): Promise<EmailConfig | null> {
//   try {
//     const { data, error } = await supabase
//       .from('email_configurations')
//       .select('*')
//       .eq('user_id', userId)
//       .order('updated_at', { ascending: false })
//       .limit(1)
//       .single(); // ✅ returns 1 row and avoids maybeSingle crash

//     if (error) throw error;
//     if (!data) return null;

//     return {
//       provider: data.provider,
//       accessToken: data.access_token,
//       refreshToken: data.refresh_token,
//       expiresAt: new Date(data.expires_at).getTime()
//     };
//   } catch (err) {
//     console.error('Error getting email config:', err);
//     return null;
//   }
// }


// // Connect to Gmail
// export async function connectGmail(response: any) {
//   try {
//     if (!response?.access_token) {
//       throw new Error('No access token received from Google');
//     }

//     return {
//       provider: 'gmail' as EmailProvider,
//       accessToken: response.access_token,
//       expiresAt: Date.now() + (response.expires_in * 1000)
//     };
//   } catch (err) {
//     console.error('Error connecting to Gmail:', err);
//     throw err;
//   }
// }

// // Connect to Outlook
// export async function connectOutlook() {
//   try {
//     const response = await msalInstance.loginPopup({
//       scopes: ['Mail.Send']
//     });

//     return {
//       provider: 'outlook' as EmailProvider,
//       accessToken: response.accessToken,
//       expiresAt: response.expiresOn.getTime()
//     };
//   } catch (err) {
//     console.error('Error connecting to Outlook:', err);
//     throw err;
//   }
// }

// // Send email using Gmail
// async function sendGmailEmail(accessToken: string, to: string, subject: string, body: string) {
//   const email = btoa(
//     `To: ${to}\r\n` +
//     `Subject: ${subject}\r\n` +
//     `Content-Type: text/html; charset=utf-8\r\n\r\n` +
//     `${body}`
//   ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

//   const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${accessToken}`,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({ raw: email })
//   });

//   if (!response.ok) {
//     throw new Error('Failed to send email through Gmail');
//   }

//   return response.json();
// }

// // Send email using Outlook
// async function sendOutlookEmail(accessToken: string, to: string, subject: string, body: string) {
//   const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${accessToken}`,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       message: {
//         subject,
//         body: {
//           contentType: 'HTML',
//           content: body
//         },
//         toRecipients: [{ emailAddress: { address: to } }]
//       }
//     })
//   });

//   if (!response.ok) {
//     throw new Error('Failed to send email through Outlook');
//   }

//   return response.json();
// }

// // Main send email function
// export async function sendEmail(
//   userId: string,
//   to: string,
//   subject: string,
//   body: string
// ) {
//   try {
//     const config = await getEmailConfig(userId);
//     if (!config) {
//       throw new Error('No email configuration found');
//     }

//     // Inside sendEmail()
//     // if (Date.now() >= config.expiresAt) {
//     //   throw new Error('Email token expired');
//     // }


//     // Check if token is expired
//     if (Date.now() >= config.expiresAt) {
//       throw new Error('Email token expired');
//     }

//     // Send email based on provider
//     if (config.provider === 'gmail') {
//       return await sendGmailEmail(config.accessToken, to, subject, body);
//     } else {
//       return await sendOutlookEmail(config.accessToken, to, subject, body);
//     }
//   } catch (err) {
//     console.error('Error sending email:', err);
//     throw err;
//   }
// }


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

// Main send email function
export async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string
) {
  try {
    const config = await getEmailConfig(userId);
    if (!config) {
      throw new Error('No email configuration found');
    }

    if (Date.now() >= config.expiresAt) {
      throw new Error('Email token expired');
    }

    if (config.provider === 'gmail') {
      return await sendGmailEmail(config.accessToken, to, subject, body, cc, bcc);
    } else {
      return await sendOutlookEmail(config.accessToken, to, subject, body, cc, bcc);
    }
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
}

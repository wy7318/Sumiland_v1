// import { PublicClientApplication } from '@azure/msal-browser';
// import { supabase } from './supabase';

// // Microsoft Azure AD configuration
// const msalConfig = {
//   auth: {
//     clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
//     authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
//     redirectUri: window.location.origin
//   },
//   cache: {
//     cacheLocation: 'sessionStorage',
//     storeAuthStateInCookie: false,
//   }
// };

// const msalInstance = new PublicClientApplication(msalConfig);


// // Add these functions to your email.ts file

// // Refresh an expired token
// export async function refreshToken(
//   configId: string | number
// ): Promise<EmailConfig | null> {
//   try {
//     // First, get the email configuration from the database
//     const { data, error } = await supabase
//       .from('email_configurations')
//       .select('*')
//       .eq('id', configId)
//       .single();
      
//     if (error || !data) {
//       console.error('Error getting config for refresh:', error);
//       return null;
//     }
    
//     // Check if we have a refresh token
//     if (!data.refresh_token) {
//       console.error('No refresh token available for config:', configId);
//       return null;
//     }
    
//     // Different refresh logic based on the provider
//     if (data.provider === 'gmail') {
//       return await refreshGmailToken(data);
//     } else if (data.provider === 'outlook') {
//       return await refreshOutlookToken(data);
//     }
    
//     return null;
//   } catch (err) {
//     console.error('Error refreshing token:', err);
//     return null;
//   }
// }

// // Refresh Gmail token
// async function refreshGmailToken(config: any): Promise<EmailConfig | null> {
//   try {
//     // Call your Supabase function to refresh the token
//     console.log("enter refreshGmailToken");
//     const response = await fetch('https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/google-refresh', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ 
//         refresh_token: config.refresh_token 
//       }),
//     });
    
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Failed to refresh Gmail token:', errorText);
//       return null;
//     }
    
//     const tokenData = await response.json();
    
//     // Update the configuration in the database
//     const { error: updateError } = await supabase
//       .from('email_configurations')
//       .update({
//         access_token: tokenData.access_token,
//         token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
//       })
//       .eq('id', config.id);
      
//     if (updateError) {
//       console.error('Error updating token in database:', updateError);
//       return null;
//     }
    
//     // Return the updated config
//     return {
//       id: config.id,
//       provider: config.provider,
//       email: config.email,
//       accessToken: tokenData.access_token,
//       refreshToken: config.refresh_token,
//       expiresAt: Date.now() + tokenData.expires_in * 1000,
//       scope: config.scopes
//     };
//   } catch (err) {
//     console.error('Error refreshing Gmail token:', err);
//     return null;
//   }
// }

// // Refresh Outlook token
// async function refreshOutlookToken(config: any): Promise<EmailConfig | null> {
//   try {
//     // Call your Supabase function to refresh the token
//     console.log("enter refreshOutlookToken");
//     const response = await fetch('https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/microsoft-refresh', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ 
//         refresh_token: config.refresh_token 
//       }),
//     });
    
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Failed to refresh Outlook token:', errorText);
//       return null;
//     }
    
//     const tokenData = await response.json();
    
//     // Update the configuration in the database
//     const { error: updateError } = await supabase
//       .from('email_configurations')
//       .update({
//         access_token: tokenData.access_token,
//         refresh_token: tokenData.refresh_token || config.refresh_token, // Use new refresh token if provided
//         token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
//       })
//       .eq('id', config.id);
      
//     if (updateError) {
//       console.error('Error updating token in database:', updateError);
//       return null;
//     }
    
//     // Return the updated config
//     return {
//       id: config.id,
//       provider: config.provider,
//       email: config.email,
//       accessToken: tokenData.access_token,
//       refreshToken: tokenData.refresh_token || config.refresh_token,
//       expiresAt: Date.now() + tokenData.expires_in * 1000,
//       scope: config.scopes
//     };
//   } catch (err) {
//     console.error('Error refreshing Outlook token:', err);
//     return null;
//   }
// }

// // Get all email configs for a user and organization
// export async function getEmailConfigs(
//   userId: string, 
//   organizationId?: string
// ): Promise<EmailConfig[]> {
//   try {
//     console.log("getEmailConfigs called with:", { userId, organizationId });
    
//     let query = supabase
//       .from('email_configurations')
//       .select('*')
//       .eq('user_id', userId);
    
//     // Filter by organization if provided
//     if (organizationId) {
//       query = query.eq('organization_id', organizationId);
//     }
    
//     const { data, error } = await query
//       .order('updated_at', { ascending: false });

//     console.log("Supabase query returned:", { data, error });

//     if (error) throw error;
//     if (!data || data.length === 0) {
//       console.log("No email configurations found");
//       return [];
//     }

//     // Map database records to EmailConfig objects
//     const mappedConfigs = data.map(config => ({
//       id: config.id, // Include the database ID for reference
//       provider: config.provider,
//       email: config.email,
//       accessToken: config.access_token,
//       refreshToken: config.refresh_token,
//       expiresAt: new Date(config.token_expiry).getTime(),
//       scope: config.scopes
//     }));
    
//     console.log("Mapped configurations:", mappedConfigs);
//     return mappedConfigs;
//   } catch (err) {
//     console.error('Error getting email configs:', err);
//     return [];
//   }
// }

// // Email provider types
// export type EmailProvider = 'gmail' | 'outlook';

// export type EmailConfig = {
//   id: string;  // Change from number to string
//   provider: EmailProvider;
//   email?: string;
//   accessToken: string;
//   refreshToken?: string;
//   expiresAt: number;
//   scope?: string;
// };



// export function getMicrosoftAuthUrl(loginHint?: string): string {
//   const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || '';
//   const redirectUri = window.location.origin;
  
//   const scopes = [
//     'Mail.Send',
//     'User.Read',
//     'offline_access' // Important for refresh tokens
//   ];
  
//   // Construct the auth URL
//   const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
//   authUrl.searchParams.append('client_id', clientId);
//   authUrl.searchParams.append('response_type', 'code');
//   authUrl.searchParams.append('redirect_uri', redirectUri);
//   authUrl.searchParams.append('scope', scopes.join(' '));
//   authUrl.searchParams.append('response_mode', 'query');
  
//   // Always force login and select account to prevent session reuse
//   authUrl.searchParams.append('prompt', 'select_account');
  
//   // Add state parameter with timestamp and random string to avoid caching
//   authUrl.searchParams.append('state', `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`);
  
//   // Use login_hint if email is provided
//   if (loginHint && loginHint.includes('@')) {
//     authUrl.searchParams.append('login_hint', loginHint);
//   }
  
//   return authUrl.toString();
// }

// // lib/email.ts
// export async function saveEmailConfig(userId, config, organizationId) {
//   console.log("Saving email config:", { userId, config, organizationId });
  
//   try {
//     const { data, error } = await supabase
//       .from('email_configurations')
//       .insert({
//         user_id: userId,
//         organization_id: organizationId,
//         provider: config.provider,
//         email: config.email,
//         access_token: config.access_token,
//         refresh_token: config.refresh_token, // Make sure this is stored
//         token_expiry: config.token_expiry,   // Make sure this is stored
//         scopes: config.scope // Store scopes for future reference
//       })
//       .select();  // Add this to return the inserted record with its ID
    
//     console.log("Insert result:", { data, error });
    
//     if (error) {
//       console.error("Insert error:", error);
//       return { data: null, error };
//     }
    
//     // Add the database ID to the config
//     if (data && data.length > 0) {
//       config.id = data[0].id;
//       console.log("Config updated with ID:", config);
//     }
    
//     return { data, error };
//   } catch (err) {
//     console.error("Exception in saveEmailConfig:", err);
//     return { data: null, error: err };
//   }
// }

// // Get email config (now can be org-specific)
// export async function getEmailConfig(
//   userId: string, 
//   organizationId?: string
// ): Promise<EmailConfig | null> {
//   try {
//     let query = supabase
//       .from('email_configurations')
//       .select('*')
//       .eq('user_id', userId);
    
//     // Filter by organization if provided
//     if (organizationId) {
//       query = query.eq('organization_id', organizationId);
//     }
    
//     const { data, error } = await query
//       .order('updated_at', { ascending: false })
//       .limit(1)
//       .single();

//     if (error) throw error;
//     if (!data) return null;

//     return {
//       provider: data.provider,
//       email: data.email,
//       accessToken: data.access_token,
//       refreshToken: data.refresh_token,
//       expiresAt: new Date(data.token_expiry).getTime(),
//       scope: data.scopes
//     };
//   } catch (err) {
//     console.error('Error getting email config:', err);
//     return null;
//   }
// }

// export async function connectGmail(authCode: string) {
//   try {
//     console.log(`Sending auth code to exchange endpoint...`);
    
//     // Change to your Supabase function URL
//     const response = await fetch('https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/google-exchange', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ code: authCode }),
//     });
    
//     console.log(`Exchange response status: ${response.status}`);
    
//     // Get the response as text first for safer handling
//     const responseText = await response.text();
    
//     // Only parse as JSON if there's content
//     let tokenData;
//     try {
//       tokenData = responseText ? JSON.parse(responseText) : null;
//     } catch (e) {
//       console.error('Invalid JSON in response:', responseText);
//       throw new Error(`Failed to parse exchange response`);
//     }
    
//     if (!response.ok || !tokenData) {
//       const errorMessage = tokenData?.message || 'Unknown error';
//       console.error('Exchange error:', tokenData);
//       throw new Error(errorMessage);
//     }
    
//     // Get user email using the access token
//     const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
//       headers: {
//         Authorization: `Bearer ${tokenData.access_token}`,
//       },
//     });
    
//     if (!userInfoResponse.ok) {
//       throw new Error('Failed to fetch user email');
//     }
    
//     const userInfo = await userInfoResponse.json();
    
//     const config = {
//       provider: 'gmail',
//       email: userInfo.email,
//       access_token: tokenData.access_token,
//       refresh_token: tokenData.refresh_token,
//       token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
//       scope: tokenData.scope
//     };
    
//     console.log("Gmail config created:", config);
    
//     return config; // Note: id will be added after saving to database
//   } catch (error) {
//     console.error('Error in connectGmail:', error);
//     throw error;
//   }
// }


// export async function connectOutlook(loginHint?: string): Promise<any> {
//   try {
//     console.log('Starting Outlook connection process...');
    
//     // Create a popup window for authentication with the user's email as a hint
//     const authUrl = getMicrosoftAuthUrl(loginHint);
//     console.log(`Opening authentication popup...`);
    
//     const width = 600;
//     const height = 700;
//     const left = window.screenX + (window.outerWidth - width) / 2;
//     const top = window.screenY + (window.outerHeight - height) / 2;
    
//     // Open the authentication popup
//     const popup = window.open(
//       authUrl,
//       'Connect with Microsoft',
//       `width=${width},height=${height},left=${left},top=${top}`
//     );
    
//     if (!popup) {
//       throw new Error('Failed to open authentication popup. Please allow popups for this site.');
//     }
    
//     // Create a promise that resolves when the popup redirects back with a code
//     const codePromise = new Promise<string>((resolve, reject) => {
//       // Function to check the popup URL
//       const checkPopup = () => {
//         try {
//           // If popup is closed without completing auth
//           if (popup.closed) {
//             clearInterval(interval);
//             reject(new Error('Authentication was cancelled'));
//             return;
//           }
          
//           // Try to access the popup's location - will throw an error if on a different domain
//           const popupUrl = popup.location.href;
          
//           // If popup redirected to our origin, it should contain the code
//           if (popupUrl && popupUrl.startsWith(window.location.origin)) {
//             const urlParams = new URLSearchParams(popup.location.search);
//             const code = urlParams.get('code');
//             const error = urlParams.get('error');
//             const errorDescription = urlParams.get('error_description');
            
//             clearInterval(interval);
//             popup.close();
            
//             if (error) {
//               console.error('OAuth error:', error, errorDescription);
//               reject(new Error(`Authentication error: ${error}. ${errorDescription || ''}`));
//             } else if (code) {
//               console.log('Successfully received auth code');
//               resolve(code);
//             } else {
//               reject(new Error('No authorization code received'));
//             }
//           }
//         } catch (e) {
//           // Cross-origin errors will occur while the popup is on the Microsoft domain
//           // This is normal and we should just continue checking
//         }
//       };
      
//       // Check popup location every 500ms
//       const interval = setInterval(checkPopup, 500);
      
//       // Add a timeout to prevent indefinite waiting
//       setTimeout(() => {
//         if (popup && !popup.closed) {
//           popup.close();
//         }
//         clearInterval(interval);
//         reject(new Error('Authentication timed out after 5 minutes'));
//       }, 5 * 60 * 1000); // 5 minute timeout
//     });
    
//     // Wait for the code from the popup
//     console.log('Waiting for authorization code from popup...');
//     const code = await codePromise;
    
//     console.log('Authorization code received, exchanging for tokens...');
    
//     // Exchange code for tokens
//     const response = await fetch('https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/microsoft-exchange', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ code }),
//     });
    
//     // Process the response
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Token exchange failed:', response.status, errorText);
//       throw new Error(`Failed to exchange code for tokens: ${response.status}`);
//     }
    
//     const responseText = await response.text();
    
//     let tokenData;
//     try {
//       tokenData = responseText ? JSON.parse(responseText) : null;
//     } catch (e) {
//       console.error('Invalid JSON in response:', responseText);
//       throw new Error(`Failed to parse exchange response`);
//     }
    
//     if (!tokenData) {
//       throw new Error('No token data received from server');
//     }
    
//     // Get user's email using the access token
//     const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
//       headers: {
//         Authorization: `Bearer ${tokenData.access_token}`
//       }
//     });
    
//     if (!userInfoResponse.ok) {
//       throw new Error('Failed to fetch user email');
//     }
    
//     const userInfo = await userInfoResponse.json();
//     const email = userInfo.mail || userInfo.userPrincipalName;
    
//     console.log(`Successfully authenticated as: ${email}`);
    
//     // Return the config object (id will be added after database save)
//     return {
//       provider: 'outlook',
//       email: email,
//       access_token: tokenData.access_token,
//       refresh_token: tokenData.refresh_token,
//       token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
//       scope: tokenData.scope
//     };
//   } catch (err) {
//     console.error('Error connecting to Outlook:', err);
//     throw err;
//   }
// }

// // Send email using Gmail - FIXED to not require profile fetch
// async function sendGmailEmail(
//   accessToken: string,
//   senderEmail: string, // Now using the email stored in the config
//   to: string,
//   subject: string,
//   body: string,
//   cc?: string,
//   bcc?: string
// ) {
//   let raw = `From: ${senderEmail}\r\n`;
//   raw += `To: ${to}\r\n`;
//   if (cc) raw += `Cc: ${cc}\r\n`;
//   if (bcc) raw += `Bcc: ${bcc}\r\n`;
//   raw += `Subject: ${subject}\r\n`;
//   raw += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
//   raw += body;

//   const encodedEmail = btoa(unescape(encodeURIComponent(raw)))
//     .replace(/\+/g, '-')
//     .replace(/\//g, '_')
//     .replace(/=+$/, '');

//   const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${accessToken}`,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({ raw: encodedEmail })
//   });

//   if (!response.ok) {
//     const errorData = await response.json();
//     throw new Error(`Failed to send email through Gmail: ${errorData.error?.message || 'Unknown error'}`);
//   }

//   return response.json();
// }

// // Send email using Outlook
// async function sendOutlookEmail(
//   accessToken: string,
//   senderEmail: string, // Now using the email stored in the config
//   to: string,
//   subject: string,
//   body: string,
//   cc?: string,
//   bcc?: string
// ) {
//   // Parse recipients
//   const toRecipients = to.split(',').map(email => ({
//     emailAddress: { address: email.trim() }
//   }));

//   const ccRecipients = cc
//     ? cc.split(',').map(email => ({
//       emailAddress: { address: email.trim() }
//     }))
//     : [];

//   const bccRecipients = bcc
//     ? bcc.split(',').map(email => ({
//       emailAddress: { address: email.trim() }
//     }))
//     : [];

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
//         toRecipients,
//         ccRecipients,
//         bccRecipients
//       },
//       saveToSentItems: 'true'
//     })
//   });

//   if (!response.ok) {
//     const errorData = await response.json();
//     throw new Error(`Failed to send email through Outlook: ${errorData.error?.message || 'Unknown error'}`);
//   }

//   return { success: true };
// }


// // Enhanced sendEmail function with automatic token refresh
// export async function sendEmail(
//   userId: string,
//   to: string,
//   subject: string,
//   body: string,
//   cc?: string,
//   bcc?: string,
//   organizationId?: string,
//   recordId?: string,
//   configId?: string // Change from number to string
// ) {
//   const toList = to.split(',').map(e => e.trim());
//   const ccList = cc ? cc.split(',').map(e => e.trim()) : [];
//   const bccList = bcc ? bcc.split(',').map(e => e.trim()) : [];

//   let provider = '';
//   let fromAddress = '';
//   let config = null;

//   try {
//     // Get email config with organization context if provided
//     if (configId) {
//       // If a specific config ID is provided, get that config
//       const { data, error } = await supabase
//         .from('email_configurations')
//         .select('*')
//         .eq('id', configId)
//         .single();
        
//       if (error) throw new Error('Could not find the specified email configuration');
//       if (!data) throw new Error('Email configuration not found');
      
//       config = {
//         id: data.id,
//         provider: data.provider,
//         email: data.email,
//         accessToken: data.access_token,
//         refreshToken: data.refresh_token,
//         expiresAt: new Date(data.token_expiry).getTime(),
//         scope: data.scopes
//       };
//     } else {
//       // Otherwise use the getEmailConfig function as before
//       config = await getEmailConfig(userId, organizationId);
//     }
    
//     if (!config) throw new Error('No email configuration found');
    
//     // Check if token is expired
//     if (Date.now() >= config.expiresAt) {
//       // Try to refresh the token automatically
//       console.log(`Token expired for ${config.email}, attempting to refresh...`);
      
//       if (config.id && config.refreshToken) {
//         const refreshedConfig = await refreshToken(config.id);
        
//         if (refreshedConfig) {
//           console.log(`Successfully refreshed token for ${config.email}`);
//           config = refreshedConfig;
//         } else {
//           throw new Error(`Failed to automatically refresh token for ${config.email}. Manual re-authentication required.`);
//         }
//       } else {
//         throw new Error('Cannot refresh token: missing configuration ID or refresh token');
//       }
//     }

//     provider = config.provider;
    
//     // Use the email address stored in the config
//     if (!config.email) {
//       throw new Error('Sender email address not found in configuration. Please reconnect your email account.');
//     }
    
//     fromAddress = config.email;

//     // Send the email using the appropriate provider
//     if (config.provider === 'gmail') {
//       await sendGmailEmail(config.accessToken, fromAddress, to, subject, body, cc, bcc);
//     } else {
//       await sendOutlookEmail(config.accessToken, fromAddress, to, subject, body, cc, bcc);
//     }

//     // Log the successful send to Supabase
//     const { error } = await supabase.from('email_messages').insert({
//       record_id: recordId || null,
//       organization_id: organizationId,
//       user_id: userId,
//       from_address: fromAddress,
//       to_addresses: toList,
//       cc_addresses: ccList,
//       bcc_addresses: bccList,
//       subject,
//       body_html: body,
//       incoming: false,
//       provider,
//       status: 'sent',
//       created_at: new Date().toISOString()
//     });

//     if (error) {
//       console.error('Error logging email:', error);
//     }

//     return { success: true };

//   } catch (err: any) {
//     console.error('Error sending email:', err);

//     // Log the failure as well
//     await supabase.from('email_messages').insert({
//       record_id: recordId || null,
//       organization_id: organizationId,
//       user_id: userId,
//       from_address: fromAddress || 'unknown',
//       to_addresses: toList,
//       cc_addresses: ccList,
//       bcc_addresses: bccList,
//       subject,
//       body_html: body,
//       incoming: false,
//       provider,
//       status: 'failed',
//       error_message: err.message || 'Unknown error',
//       created_at: new Date().toISOString()
//     });

//     throw err;
//   }
// }

















//v2 with threading

// import { PublicClientApplication } from '@azure/msal-browser';
// import { supabase } from './supabase';

// // Microsoft Azure AD configuration
// const msalConfig = {
//   auth: {
//     clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
//     authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
//     redirectUri: window.location.origin
//   },
//   cache: {
//     cacheLocation: 'sessionStorage',
//     storeAuthStateInCookie: false,
//   }
// };

// const msalInstance = new PublicClientApplication(msalConfig);


// // Add these functions to your email.ts file

// // Refresh an expired token
// export async function refreshToken(
//   configId: string | number
// ): Promise<EmailConfig | null> {
//   try {
//     // First, get the email configuration from the database
//     const { data, error } = await supabase
//       .from('email_configurations')
//       .select('*')
//       .eq('id', configId)
//       .single();
      
//     if (error || !data) {
//       console.error('Error getting config for refresh:', error);
//       return null;
//     }
    
//     // Check if we have a refresh token
//     if (!data.refresh_token) {
//       console.error('No refresh token available for config:', configId);
//       return null;
//     }
    
//     // Different refresh logic based on the provider
//     if (data.provider === 'gmail') {
//       return await refreshGmailToken(data);
//     } else if (data.provider === 'outlook') {
//       return await refreshOutlookToken(data);
//     }
    
//     return null;
//   } catch (err) {
//     console.error('Error refreshing token:', err);
//     return null;
//   }
// }

// // Refresh Gmail token
// async function refreshGmailToken(config: any): Promise<EmailConfig | null> {
//   try {
//     // Call your Supabase function to refresh the token
//     console.log("enter refreshGmailToken");
//     const response = await fetch('https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/google-refresh', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ 
//         refresh_token: config.refresh_token 
//       }),
//     });
    
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Failed to refresh Gmail token:', errorText);
//       return null;
//     }
    
//     const tokenData = await response.json();
    
//     // Update the configuration in the database
//     const { error: updateError } = await supabase
//       .from('email_configurations')
//       .update({
//         access_token: tokenData.access_token,
//         token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
//       })
//       .eq('id', config.id);
      
//     if (updateError) {
//       console.error('Error updating token in database:', updateError);
//       return null;
//     }
    
//     // Return the updated config
//     return {
//       id: config.id,
//       provider: config.provider,
//       email: config.email,
//       accessToken: tokenData.access_token,
//       refreshToken: config.refresh_token,
//       expiresAt: Date.now() + tokenData.expires_in * 1000,
//       scope: config.scopes
//     };
//   } catch (err) {
//     console.error('Error refreshing Gmail token:', err);
//     return null;
//   }
// }

// // Refresh Outlook token
// async function refreshOutlookToken(config: any): Promise<EmailConfig | null> {
//   try {
//     // Call your Supabase function to refresh the token
//     console.log("enter refreshOutlookToken");
//     const response = await fetch('https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/microsoft-refresh', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ 
//         refresh_token: config.refresh_token 
//       }),
//     });
    
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Failed to refresh Outlook token:', errorText);
//       return null;
//     }
    
//     const tokenData = await response.json();
    
//     // Update the configuration in the database
//     const { error: updateError } = await supabase
//       .from('email_configurations')
//       .update({
//         access_token: tokenData.access_token,
//         refresh_token: tokenData.refresh_token || config.refresh_token, // Use new refresh token if provided
//         token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
//       })
//       .eq('id', config.id);
      
//     if (updateError) {
//       console.error('Error updating token in database:', updateError);
//       return null;
//     }
    
//     // Return the updated config
//     return {
//       id: config.id,
//       provider: config.provider,
//       email: config.email,
//       accessToken: tokenData.access_token,
//       refreshToken: tokenData.refresh_token || config.refresh_token,
//       expiresAt: Date.now() + tokenData.expires_in * 1000,
//       scope: config.scopes
//     };
//   } catch (err) {
//     console.error('Error refreshing Outlook token:', err);
//     return null;
//   }
// }

// // Get all email configs for a user and organization
// export async function getEmailConfigs(
//   userId: string, 
//   organizationId?: string
// ): Promise<EmailConfig[]> {
//   try {
//     console.log("getEmailConfigs called with:", { userId, organizationId });
    
//     let query = supabase
//       .from('email_configurations')
//       .select('*')
//       .eq('user_id', userId);
    
//     // Filter by organization if provided
//     if (organizationId) {
//       query = query.eq('organization_id', organizationId);
//     }
    
//     const { data, error } = await query
//       .order('updated_at', { ascending: false });

//     console.log("Supabase query returned:", { data, error });

//     if (error) throw error;
//     if (!data || data.length === 0) {
//       console.log("No email configurations found");
//       return [];
//     }

//     // Map database records to EmailConfig objects
//     const mappedConfigs = data.map(config => ({
//       id: config.id, // Include the database ID for reference
//       provider: config.provider,
//       email: config.email,
//       accessToken: config.access_token,
//       refreshToken: config.refresh_token,
//       expiresAt: new Date(config.token_expiry).getTime(),
//       scope: config.scopes
//     }));
    
//     console.log("Mapped configurations:", mappedConfigs);
//     return mappedConfigs;
//   } catch (err) {
//     console.error('Error getting email configs:', err);
//     return [];
//   }
// }

// // Email provider types
// export type EmailProvider = 'gmail' | 'outlook';

// export type EmailConfig = {
//   id: string;  // Change from number to string
//   provider: EmailProvider;
//   email?: string;
//   accessToken: string;
//   refreshToken?: string;
//   expiresAt: number;
//   scope?: string;
// };



// export function getMicrosoftAuthUrl(loginHint?: string): string {
//   const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || '';
//   const redirectUri = window.location.origin;
  
//   const scopes = [
//     'Mail.Send',
//     'User.Read',
//     'offline_access' // Important for refresh tokens
//   ];
  
//   // Construct the auth URL
//   const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
//   authUrl.searchParams.append('client_id', clientId);
//   authUrl.searchParams.append('response_type', 'code');
//   authUrl.searchParams.append('redirect_uri', redirectUri);
//   authUrl.searchParams.append('scope', scopes.join(' '));
//   authUrl.searchParams.append('response_mode', 'query');
  
//   // Always force login and select account to prevent session reuse
//   authUrl.searchParams.append('prompt', 'select_account');
  
//   // Add state parameter with timestamp and random string to avoid caching
//   authUrl.searchParams.append('state', `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`);
  
//   // Use login_hint if email is provided
//   if (loginHint && loginHint.includes('@')) {
//     authUrl.searchParams.append('login_hint', loginHint);
//   }
  
//   return authUrl.toString();
// }

// // lib/email.ts
// export async function saveEmailConfig(userId, config, organizationId) {
//   console.log("Saving email config:", { userId, config, organizationId });
  
//   try {
//     const { data, error } = await supabase
//       .from('email_configurations')
//       .insert({
//         user_id: userId,
//         organization_id: organizationId,
//         provider: config.provider,
//         email: config.email,
//         access_token: config.access_token,
//         refresh_token: config.refresh_token, // Make sure this is stored
//         token_expiry: config.token_expiry,   // Make sure this is stored
//         scopes: config.scope // Store scopes for future reference
//       })
//       .select();  // Add this to return the inserted record with its ID
    
//     console.log("Insert result:", { data, error });
    
//     if (error) {
//       console.error("Insert error:", error);
//       return { data: null, error };
//     }
    
//     // Add the database ID to the config
//     if (data && data.length > 0) {
//       config.id = data[0].id;
//       console.log("Config updated with ID:", config);
//     }
    
//     return { data, error };
//   } catch (err) {
//     console.error("Exception in saveEmailConfig:", err);
//     return { data: null, error: err };
//   }
// }

// // Get email config (now can be org-specific)
// export async function getEmailConfig(
//   userId: string, 
//   organizationId?: string
// ): Promise<EmailConfig | null> {
//   try {
//     let query = supabase
//       .from('email_configurations')
//       .select('*')
//       .eq('user_id', userId);
    
//     // Filter by organization if provided
//     if (organizationId) {
//       query = query.eq('organization_id', organizationId);
//     }
    
//     const { data, error } = await query
//       .order('updated_at', { ascending: false })
//       .limit(1)
//       .single();

//     if (error) throw error;
//     if (!data) return null;

//     return {
//       provider: data.provider,
//       email: data.email,
//       accessToken: data.access_token,
//       refreshToken: data.refresh_token,
//       expiresAt: new Date(data.token_expiry).getTime(),
//       scope: data.scopes
//     };
//   } catch (err) {
//     console.error('Error getting email config:', err);
//     return null;
//   }
// }

// export async function connectGmail(authCode: string) {
//   try {
//     console.log(`Sending auth code to exchange endpoint...`);
    
//     // Change to your Supabase function URL
//     const response = await fetch('https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/google-exchange', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ code: authCode }),
//     });
    
//     console.log(`Exchange response status: ${response.status}`);
    
//     // Get the response as text first for safer handling
//     const responseText = await response.text();
    
//     // Only parse as JSON if there's content
//     let tokenData;
//     try {
//       tokenData = responseText ? JSON.parse(responseText) : null;
//     } catch (e) {
//       console.error('Invalid JSON in response:', responseText);
//       throw new Error(`Failed to parse exchange response`);
//     }
    
//     if (!response.ok || !tokenData) {
//       const errorMessage = tokenData?.message || 'Unknown error';
//       console.error('Exchange error:', tokenData);
//       throw new Error(errorMessage);
//     }
    
//     // Get user email using the access token
//     const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
//       headers: {
//         Authorization: `Bearer ${tokenData.access_token}`,
//       },
//     });
    
//     if (!userInfoResponse.ok) {
//       throw new Error('Failed to fetch user email');
//     }
    
//     const userInfo = await userInfoResponse.json();
    
//     const config = {
//       provider: 'gmail',
//       email: userInfo.email,
//       access_token: tokenData.access_token,
//       refresh_token: tokenData.refresh_token,
//       token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
//       scope: tokenData.scope
//     };
    
//     console.log("Gmail config created:", config);
    
//     return config; // Note: id will be added after saving to database
//   } catch (error) {
//     console.error('Error in connectGmail:', error);
//     throw error;
//   }
// }


// export async function connectOutlook(loginHint?: string): Promise<any> {
//   try {
//     console.log('Starting Outlook connection process...');
    
//     // Create a popup window for authentication with the user's email as a hint
//     const authUrl = getMicrosoftAuthUrl(loginHint);
//     console.log(`Opening authentication popup...`);
    
//     const width = 600;
//     const height = 700;
//     const left = window.screenX + (window.outerWidth - width) / 2;
//     const top = window.screenY + (window.outerHeight - height) / 2;
    
//     // Open the authentication popup
//     const popup = window.open(
//       authUrl,
//       'Connect with Microsoft',
//       `width=${width},height=${height},left=${left},top=${top}`
//     );
    
//     if (!popup) {
//       throw new Error('Failed to open authentication popup. Please allow popups for this site.');
//     }
    
//     // Create a promise that resolves when the popup redirects back with a code
//     const codePromise = new Promise<string>((resolve, reject) => {
//       // Function to check the popup URL
//       const checkPopup = () => {
//         try {
//           // If popup is closed without completing auth
//           if (popup.closed) {
//             clearInterval(interval);
//             reject(new Error('Authentication was cancelled'));
//             return;
//           }
          
//           // Try to access the popup's location - will throw an error if on a different domain
//           const popupUrl = popup.location.href;
          
//           // If popup redirected to our origin, it should contain the code
//           if (popupUrl && popupUrl.startsWith(window.location.origin)) {
//             const urlParams = new URLSearchParams(popup.location.search);
//             const code = urlParams.get('code');
//             const error = urlParams.get('error');
//             const errorDescription = urlParams.get('error_description');
            
//             clearInterval(interval);
//             popup.close();
            
//             if (error) {
//               console.error('OAuth error:', error, errorDescription);
//               reject(new Error(`Authentication error: ${error}. ${errorDescription || ''}`));
//             } else if (code) {
//               console.log('Successfully received auth code');
//               resolve(code);
//             } else {
//               reject(new Error('No authorization code received'));
//             }
//           }
//         } catch (e) {
//           // Cross-origin errors will occur while the popup is on the Microsoft domain
//           // This is normal and we should just continue checking
//         }
//       };
      
//       // Check popup location every 500ms
//       const interval = setInterval(checkPopup, 500);
      
//       // Add a timeout to prevent indefinite waiting
//       setTimeout(() => {
//         if (popup && !popup.closed) {
//           popup.close();
//         }
//         clearInterval(interval);
//         reject(new Error('Authentication timed out after 5 minutes'));
//       }, 5 * 60 * 1000); // 5 minute timeout
//     });
    
//     // Wait for the code from the popup
//     console.log('Waiting for authorization code from popup...');
//     const code = await codePromise;
    
//     console.log('Authorization code received, exchanging for tokens...');
    
//     // Exchange code for tokens
//     const response = await fetch('https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/microsoft-exchange', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ code }),
//     });
    
//     // Process the response
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Token exchange failed:', response.status, errorText);
//       throw new Error(`Failed to exchange code for tokens: ${response.status}`);
//     }
    
//     const responseText = await response.text();
    
//     let tokenData;
//     try {
//       tokenData = responseText ? JSON.parse(responseText) : null;
//     } catch (e) {
//       console.error('Invalid JSON in response:', responseText);
//       throw new Error(`Failed to parse exchange response`);
//     }
    
//     if (!tokenData) {
//       throw new Error('No token data received from server');
//     }
    
//     // Get user's email using the access token
//     const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
//       headers: {
//         Authorization: `Bearer ${tokenData.access_token}`
//       }
//     });
    
//     if (!userInfoResponse.ok) {
//       throw new Error('Failed to fetch user email');
//     }
    
//     const userInfo = await userInfoResponse.json();
//     const email = userInfo.mail || userInfo.userPrincipalName;
    
//     console.log(`Successfully authenticated as: ${email}`);
    
//     // Return the config object (id will be added after database save)
//     return {
//       provider: 'outlook',
//       email: email,
//       access_token: tokenData.access_token,
//       refresh_token: tokenData.refresh_token,
//       token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
//       scope: tokenData.scope
//     };
//   } catch (err) {
//     console.error('Error connecting to Outlook:', err);
//     throw err;
//   }
// }

// // Send email using Gmail - FIXED to not require profile fetch
// async function sendGmailEmail(
//   accessToken: string,
//   senderEmail: string, // Now using the email stored in the config
//   to: string,
//   subject: string,
//   body: string,
//   cc?: string,
//   bcc?: string
// ) {
//   let raw = `From: ${senderEmail}\r\n`;
//   raw += `To: ${to}\r\n`;
//   if (cc) raw += `Cc: ${cc}\r\n`;
//   if (bcc) raw += `Bcc: ${bcc}\r\n`;
//   raw += `Subject: ${subject}\r\n`;
//   raw += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
//   raw += body;

//   const encodedEmail = btoa(unescape(encodeURIComponent(raw)))
//     .replace(/\+/g, '-')
//     .replace(/\//g, '_')
//     .replace(/=+$/, '');

//   const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${accessToken}`,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({ raw: encodedEmail })
//   });

//   if (!response.ok) {
//     const errorData = await response.json();
//     throw new Error(`Failed to send email through Gmail: ${errorData.error?.message || 'Unknown error'}`);
//   }

//   return response.json();
// }

// // Send email using Outlook
// async function sendOutlookEmail(
//   accessToken: string,
//   senderEmail: string, // Now using the email stored in the config
//   to: string,
//   subject: string,
//   body: string,
//   cc?: string,
//   bcc?: string
// ) {
//   // Parse recipients
//   const toRecipients = to.split(',').map(email => ({
//     emailAddress: { address: email.trim() }
//   }));

//   const ccRecipients = cc
//     ? cc.split(',').map(email => ({
//       emailAddress: { address: email.trim() }
//     }))
//     : [];

//   const bccRecipients = bcc
//     ? bcc.split(',').map(email => ({
//       emailAddress: { address: email.trim() }
//     }))
//     : [];

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
//         toRecipients,
//         ccRecipients,
//         bccRecipients
//       },
//       saveToSentItems: 'true'
//     })
//   });

//   if (!response.ok) {
//     const errorData = await response.json();
//     throw new Error(`Failed to send email through Outlook: ${errorData.error?.message || 'Unknown error'}`);
//   }

//   return { success: true };
// }

// // Add this function to your email.ts file

// // Get organization domain
// export async function getOrganizationDomain(organizationId: string): Promise<string | null> {
//   try {
//     const { data, error } = await supabase
//       .from('organizations')
//       .select('domain, domain_verified')
//       .eq('id', organizationId)
//       .single();
      
//     if (error || !data || !data.domain || !data.domain_verified) {
//       return null;
//     }
    
//     return data.domain;
//   } catch (err) {
//     console.error('Error getting organization domain:', err);
//     return null;
//   }
// }


// // Fix for Outlook Message-ID error while preserving auto-authentication

// // Send Outlook email with threading headers - FIXED for Outlook requirements
// async function sendOutlookEmailWithThreading(
//   accessToken: string,
//   senderEmail: string,
//   to: string,
//   subject: string,
//   body: string,
//   cc?: string,
//   bcc?: string,
//   replyTo?: string,
//   messageId?: string,
//   threadId?: string
// ) {
//   // Parse recipients
//   const toRecipients = to.split(',').map(email => ({
//     emailAddress: { address: email.trim() }
//   }));

//   const ccRecipients = cc
//     ? cc.split(',').map(email => ({
//       emailAddress: { address: email.trim() }
//     }))
//     : [];

//   const bccRecipients = bcc
//     ? bcc.split(',').map(email => ({
//       emailAddress: { address: email.trim() }
//     }))
//     : [];
  
//   // Add case reference footer
//   if (subject.includes('[Case #')) {
//     const caseReference = subject.match(/\[Case #([^\]]+)\]/);
//     if (caseReference && caseReference[1]) {
//       const caseFooter = `<div style="border-top: 1px solid #ccc; margin-top: 20px; padding-top: 10px; color: #777; font-size: 12px;">
//         <p>Please keep the subject line intact to ensure your reply is properly tracked.</p>
//         <p>Case Reference: ${caseReference[1]}</p>
//       </div>`;
      
//       // Add the footer to the body
//       if (body.includes('</body>')) {
//         body = body.replace('</body>', `${caseFooter}</body>`);
//       } else {
//         body += caseFooter;
//       }
//     }
//   }
    
//   // Create the email request body
//   const emailBody = {
//     message: {
//       subject,
//       body: {
//         contentType: 'HTML',
//         content: body
//       },
//       toRecipients,
//       ccRecipients,
//       bccRecipients,
//       internetMessageHeaders: []
//     },
//     saveToSentItems: 'true'
//   };
  
//   // Add reply-to if provided
//   if (replyTo) {
//     emailBody.message.replyTo = [
//       {
//         emailAddress: {
//           address: replyTo
//         }
//       }
//     ];
//   }
  
//   // Add internet message headers for threading
//   // IMPORTANT: For Outlook, all custom headers must start with "x-" or "X-"
//   if (messageId) {
//     emailBody.message.internetMessageHeaders.push({
//       name: 'X-Message-ID', // Fixed: Prefix with X- for Outlook compliance
//       value: messageId
//     });
//   }
  
//   if (threadId) {
//     emailBody.message.internetMessageHeaders.push({
//       name: 'X-References', // Fixed: Prefix with X- for Outlook compliance
//       value: `<${threadId}>`
//     });
//   }

//   const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${accessToken}`,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify(emailBody)
//   });

//   if (!response.ok) {
//     const errorData = await response.json();
//     throw new Error(`Failed to send email through Outlook: ${errorData.error?.message || 'Unknown error'}`);
//   }

//   return { success: true };
// }

// // Enhanced sendEmail function with automatic token refresh AND threading
// export async function sendEmail(
//   userId: string,
//   to: string,
//   subject: string,
//   body: string,
//   cc?: string,
//   bcc?: string,
//   organizationId?: string,
//   recordId?: string,
//   configId?: string // Change from number to string
// ) {
//   const toList = to.split(',').map(e => e.trim());
//   const ccList = cc ? cc.split(',').map(e => e.trim()) : [];
//   const bccList = bcc ? bcc.split(',').map(e => e.trim()) : [];

//   let provider = '';
//   let fromAddress = '';
//   let config = null;
//   let messageId = null;
//   let threadId = null;

//   try {
//     // Get email config with organization context if provided
//     if (configId) {
//       // If a specific config ID is provided, get that config
//       const { data, error } = await supabase
//         .from('email_configurations')
//         .select('*')
//         .eq('id', configId)
//         .single();
        
//       if (error) throw new Error('Could not find the specified email configuration');
//       if (!data) throw new Error('Email configuration not found');
      
//       config = {
//         id: data.id,
//         provider: data.provider,
//         email: data.email,
//         accessToken: data.access_token,
//         refreshToken: data.refresh_token,
//         expiresAt: new Date(data.token_expiry).getTime(),
//         scope: data.scopes
//       };
//     } else {
//       // Otherwise use the getEmailConfig function as before
//       config = await getEmailConfig(userId, organizationId);
//     }
    
//     if (!config) throw new Error('No email configuration found');
    
//     // Check if token is expired
//     if (Date.now() >= config.expiresAt) {
//       // Try to refresh the token automatically
//       console.log(`Token expired for ${config.email}, attempting to refresh...`);
      
//       if (config.id && config.refreshToken) {
//         const refreshedConfig = await refreshToken(config.id);
        
//         if (refreshedConfig) {
//           console.log(`Successfully refreshed token for ${config.email}`);
//           config = refreshedConfig;
//         } else {
//           throw new Error(`Failed to automatically refresh token for ${config.email}. Manual re-authentication required.`);
//         }
//       } else {
//         throw new Error('Cannot refresh token: missing configuration ID or refresh token');
//       }
//     }

//     provider = config.provider;
    
//     // Use the email address stored in the config
//     if (!config.email) {
//       throw new Error('Sender email address not found in configuration. Please reconnect your email account.');
//     }
    
//     fromAddress = config.email;

//     // If this is related to a case, add case reference to subject
//     if (recordId && subject.indexOf('[Case #') === -1) {
//       // Add case reference if not already there
//       subject = `[Case #${recordId.substring(0, 8)}] ${subject}`;
//     }
    
//     // Generate message ID and thread ID for threading
//     const timestamp = Date.now();
//     messageId = `<msg-${timestamp}-${Math.random().toString(36).substring(2, 10)}@simplidone.com>`;
    
//     // Find existing thread ID if available
//     let existingThreadId = null;
//     if (recordId) {
//       const { data: existingEmail } = await supabase
//         .from('email_messages')
//         .select('thread_id')
//         .eq('record_id', recordId)
//         .order('created_at', { ascending: false })
//         .limit(1)
//         .maybeSingle();
        
//       if (existingEmail?.thread_id) {
//         existingThreadId = existingEmail.thread_id;
//       }
//     }
    
//     // Use existing thread ID or generate new one
//     threadId = existingThreadId || `case-${recordId || timestamp}`;

//     // Get org's support email from email-to-case config
//     let supportEmail = null;
//     if (organizationId) {
//       const { data: emailConfig } = await supabase
//         .from('email_to_case_configs')
//         .select('support_email')
//         .eq('organization_id', organizationId)
//         .maybeSingle();
        
//       if (emailConfig?.support_email) {
//         supportEmail = emailConfig.support_email;
//       }
//     }

//     // Send the email using the appropriate provider
//     if (config.provider === 'gmail') {
//       await sendGmailEmailWithThreading(
//         config.accessToken, 
//         fromAddress, 
//         to, 
//         subject, 
//         body, 
//         cc, 
//         bcc,
//         supportEmail, // Reply-to address
//         messageId,
//         threadId
//       );
//     } else {
//       await sendOutlookEmailWithThreading(
//         config.accessToken, 
//         fromAddress, 
//         to, 
//         subject, 
//         body, 
//         cc, 
//         bcc,
//         supportEmail, // Reply-to address
//         messageId,
//         threadId
//       );
//     }

//     // Log the successful send to Supabase
//     const { error } = await supabase.from('email_messages').insert({
//       record_id: recordId || null,
//       organization_id: organizationId,
//       user_id: userId,
//       from_address: fromAddress,
//       to_addresses: toList,
//       cc_addresses: ccList,
//       bcc_addresses: bccList,
//       subject,
//       body_html: body,
//       incoming: false,
//       provider,
//       status: 'sent',
//       created_at: new Date().toISOString(),
//       thread_id: threadId,
//       message_id: messageId
//     });

//     if (error) {
//       console.error('Error logging email:', error);
//     }

//     // Also add a feed entry if this is related to a case
//     if (recordId) {
//       await supabase.from('feeds').insert({
//         content: `Email sent to ${to} with subject: ${subject}`,
//         parent_type: 'Case',
//         reference_id: recordId,
//         organization_id: organizationId,
//         created_by: userId,
//         created_at: new Date().toISOString(),
//         status: 'Active'
//       });
//     }

//     return { success: true };

//   } catch (err: any) {
//     console.error('Error sending email:', err);

//     // Log the failure as well
//     await supabase.from('email_messages').insert({
//       record_id: recordId || null,
//       organization_id: organizationId,
//       user_id: userId,
//       from_address: fromAddress || 'unknown',
//       to_addresses: toList,
//       cc_addresses: ccList,
//       bcc_addresses: bccList,
//       subject,
//       body_html: body,
//       incoming: false,
//       provider,
//       status: 'failed',
//       error_message: err.message || 'Unknown error',
//       created_at: new Date().toISOString(),
//       thread_id: threadId,
//       message_id: messageId
//     });

//     throw err;
//   }
// }

// // Send Gmail email with threading headers
// async function sendGmailEmailWithThreading(
//   accessToken: string,
//   senderEmail: string,
//   to: string,
//   subject: string,
//   body: string,
//   cc?: string,
//   bcc?: string,
//   replyTo?: string,
//   messageId?: string,
//   threadId?: string
// ) {
//   // Create message headers with thread information
//   let raw = `From: ${senderEmail}\r\n`;
//   raw += `To: ${to}\r\n`;
//   if (cc) raw += `Cc: ${cc}\r\n`;
//   if (bcc) raw += `Bcc: ${bcc}\r\n`;
  
//   // Add thread headers for email threading
//   if (messageId) {
//     raw += `Message-ID: ${messageId}\r\n`;
//   }
  
//   if (threadId) {
//     // Include existing thread ID in References header
//     raw += `References: <${threadId}>\r\n`;
//   }
  
//   // Add reply-to if provided
//   if (replyTo) {
//     raw += `Reply-To: ${replyTo}\r\n`;
//   }
  
//   // Add footer with case reference
//   if (subject.includes('[Case #')) {
//     const caseReference = subject.match(/\[Case #([^\]]+)\]/);
//     if (caseReference && caseReference[1]) {
//       const caseFooter = `<div style="border-top: 1px solid #ccc; margin-top: 20px; padding-top: 10px; color: #777; font-size: 12px;">
//         <p>Please keep the subject line intact to ensure your reply is properly tracked.</p>
//         <p>Case Reference: ${caseReference[1]}</p>
//       </div>`;
      
//       // Add the footer to the body
//       if (body.includes('</body>')) {
//         body = body.replace('</body>', `${caseFooter}</body>`);
//       } else {
//         body += caseFooter;
//       }
//     }
//   }
  
//   raw += `Subject: ${subject}\r\n`;
//   raw += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
//   raw += body;

//   const encodedEmail = btoa(unescape(encodeURIComponent(raw)))
//     .replace(/\+/g, '-')
//     .replace(/\//g, '_')
//     .replace(/=+$/, '');

//   const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${accessToken}`,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({ raw: encodedEmail })
//   });

//   if (!response.ok) {
//     const errorData = await response.json();
//     throw new Error(`Failed to send email through Gmail: ${errorData.error?.message || 'Unknown error'}`);
//   }

//   return response.json();
// }


//v3 with attachment
import { PublicClientApplication } from '@azure/msal-browser';
import { supabase } from './supabase';

// Microsoft Azure AD configuration
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  }
};

const msalInstance = new PublicClientApplication(msalConfig);

// Add these functions to your email.ts file

// Refresh an expired token
export async function refreshToken(
  configId: string | number
): Promise<EmailConfig | null> {
  try {
    // First, get the email configuration from the database
    const { data, error } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('id', configId)
      .single();
      
    if (error || !data) {
      console.error('Error getting config for refresh:', error);
      return null;
    }
    
    // Check if we have a refresh token
    if (!data.refresh_token) {
      console.error('No refresh token available for config:', configId);
      return null;
    }
    
    // Different refresh logic based on the provider
    if (data.provider === 'gmail') {
      return await refreshGmailToken(data);
    } else if (data.provider === 'outlook') {
      return await refreshOutlookToken(data);
    }
    
    return null;
  } catch (err) {
    console.error('Error refreshing token:', err);
    return null;
  }
}

// Refresh Gmail token
async function refreshGmailToken(config: any): Promise<EmailConfig | null> {
  try {
    // Call your Supabase function to refresh the token
    console.log("enter refreshGmailToken");
    const response = await fetch('https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/google-refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        refresh_token: config.refresh_token 
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to refresh Gmail token:', errorText);
      return null;
    }
    
    const tokenData = await response.json();
    
    // Update the configuration in the database
    const { error: updateError } = await supabase
      .from('email_configurations')
      .update({
        access_token: tokenData.access_token,
        token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      })
      .eq('id', config.id);
      
    if (updateError) {
      console.error('Error updating token in database:', updateError);
      return null;
    }
    
    // Return the updated config
    return {
      id: config.id,
      provider: config.provider,
      email: config.email,
      accessToken: tokenData.access_token,
      refreshToken: config.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      scope: config.scopes
    };
  } catch (err) {
    console.error('Error refreshing Gmail token:', err);
    return null;
  }
}

// Refresh Outlook token
async function refreshOutlookToken(config: any): Promise<EmailConfig | null> {
  try {
    // Call your Supabase function to refresh the token
    console.log("enter refreshOutlookToken");
    const response = await fetch('https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/microsoft-refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        refresh_token: config.refresh_token 
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to refresh Outlook token:', errorText);
      return null;
    }
    
    const tokenData = await response.json();
    
    // Update the configuration in the database
    const { error: updateError } = await supabase
      .from('email_configurations')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || config.refresh_token, // Use new refresh token if provided
        token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      })
      .eq('id', config.id);
      
    if (updateError) {
      console.error('Error updating token in database:', updateError);
      return null;
    }
    
    // Return the updated config
    return {
      id: config.id,
      provider: config.provider,
      email: config.email,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || config.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      scope: config.scopes
    };
  } catch (err) {
    console.error('Error refreshing Outlook token:', err);
    return null;
  }
}

// Get all email configs for a user and organization
export async function getEmailConfigs(
  userId: string, 
  organizationId?: string
): Promise<EmailConfig[]> {
  try {
    console.log("getEmailConfigs called with:", { userId, organizationId });
    
    let query = supabase
      .from('email_configurations')
      .select('*')
      .eq('user_id', userId);
    
    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data, error } = await query
      .order('updated_at', { ascending: false });

    console.log("Supabase query returned:", { data, error });

    if (error) throw error;
    if (!data || data.length === 0) {
      console.log("No email configurations found");
      return [];
    }

    // Map database records to EmailConfig objects
    const mappedConfigs = data.map(config => ({
      id: config.id, // Include the database ID for reference
      provider: config.provider,
      email: config.email,
      accessToken: config.access_token,
      refreshToken: config.refresh_token,
      expiresAt: new Date(config.token_expiry).getTime(),
      scope: config.scopes
    }));
    
    console.log("Mapped configurations:", mappedConfigs);
    return mappedConfigs;
  } catch (err) {
    console.error('Error getting email configs:', err);
    return [];
  }
}

// Email provider types
export type EmailProvider = 'gmail' | 'outlook';

export type EmailConfig = {
  id: string;  // Change from number to string
  provider: EmailProvider;
  email?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
};

// Email attachment interface
export interface EmailAttachment {
  filename: string;
  content: Blob | string;
  contentType: string;
}

export function getMicrosoftAuthUrl(loginHint?: string): string {
  const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || '';
  const redirectUri = window.location.origin;
  
  const scopes = [
    'Mail.Send',
    'User.Read',
    'offline_access' // Important for refresh tokens
  ];
  
  // Construct the auth URL
  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('response_mode', 'query');
  
  // Always force login and select account to prevent session reuse
  authUrl.searchParams.append('prompt', 'select_account');
  
  // Add state parameter with timestamp and random string to avoid caching
  authUrl.searchParams.append('state', `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`);
  
  // Use login_hint if email is provided
  if (loginHint && loginHint.includes('@')) {
    authUrl.searchParams.append('login_hint', loginHint);
  }
  
  return authUrl.toString();
}

// lib/email.ts
export async function saveEmailConfig(userId, config, organizationId) {
  console.log("Saving email config:", { userId, config, organizationId });
  
  try {
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
        scopes: config.scope // Store scopes for future reference
      })
      .select();  // Add this to return the inserted record with its ID
    
    console.log("Insert result:", { data, error });
    
    if (error) {
      console.error("Insert error:", error);
      return { data: null, error };
    }
    
    // Add the database ID to the config
    if (data && data.length > 0) {
      config.id = data[0].id;
      console.log("Config updated with ID:", config);
    }
    
    return { data, error };
  } catch (err) {
    console.error("Exception in saveEmailConfig:", err);
    return { data: null, error: err };
  }
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
    
    const config = {
      provider: 'gmail',
      email: userInfo.email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      scope: tokenData.scope
    };
    
    console.log("Gmail config created:", config);
    
    return config; // Note: id will be added after saving to database
  } catch (error) {
    console.error('Error in connectGmail:', error);
    throw error;
  }
}


export async function connectOutlook(loginHint?: string): Promise<any> {
  try {
    console.log('Starting Outlook connection process...');
    
    // Create a popup window for authentication with the user's email as a hint
    const authUrl = getMicrosoftAuthUrl(loginHint);
    console.log(`Opening authentication popup...`);
    
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    // Open the authentication popup
    const popup = window.open(
      authUrl,
      'Connect with Microsoft',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    if (!popup) {
      throw new Error('Failed to open authentication popup. Please allow popups for this site.');
    }
    
    // Create a promise that resolves when the popup redirects back with a code
    const codePromise = new Promise<string>((resolve, reject) => {
      // Function to check the popup URL
      const checkPopup = () => {
        try {
          // If popup is closed without completing auth
          if (popup.closed) {
            clearInterval(interval);
            reject(new Error('Authentication was cancelled'));
            return;
          }
          
          // Try to access the popup's location - will throw an error if on a different domain
          const popupUrl = popup.location.href;
          
          // If popup redirected to our origin, it should contain the code
          if (popupUrl && popupUrl.startsWith(window.location.origin)) {
            const urlParams = new URLSearchParams(popup.location.search);
            const code = urlParams.get('code');
            const error = urlParams.get('error');
            const errorDescription = urlParams.get('error_description');
            
            clearInterval(interval);
            popup.close();
            
            if (error) {
              console.error('OAuth error:', error, errorDescription);
              reject(new Error(`Authentication error: ${error}. ${errorDescription || ''}`));
            } else if (code) {
              console.log('Successfully received auth code');
              resolve(code);
            } else {
              reject(new Error('No authorization code received'));
            }
          }
        } catch (e) {
          // Cross-origin errors will occur while the popup is on the Microsoft domain
          // This is normal and we should just continue checking
        }
      };
      
      // Check popup location every 500ms
      const interval = setInterval(checkPopup, 500);
      
      // Add a timeout to prevent indefinite waiting
      setTimeout(() => {
        if (popup && !popup.closed) {
          popup.close();
        }
        clearInterval(interval);
        reject(new Error('Authentication timed out after 5 minutes'));
      }, 5 * 60 * 1000); // 5 minute timeout
    });
    
    // Wait for the code from the popup
    console.log('Waiting for authorization code from popup...');
    const code = await codePromise;
    
    console.log('Authorization code received, exchanging for tokens...');
    
    // Exchange code for tokens
    const response = await fetch('https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/microsoft-exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    
    // Process the response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', response.status, errorText);
      throw new Error(`Failed to exchange code for tokens: ${response.status}`);
    }
    
    const responseText = await response.text();
    
    let tokenData;
    try {
      tokenData = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      console.error('Invalid JSON in response:', responseText);
      throw new Error(`Failed to parse exchange response`);
    }
    
    if (!tokenData) {
      throw new Error('No token data received from server');
    }
    
    // Get user's email using the access token
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });
    
    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user email');
    }
    
    const userInfo = await userInfoResponse.json();
    const email = userInfo.mail || userInfo.userPrincipalName;
    
    console.log(`Successfully authenticated as: ${email}`);
    
    // Return the config object (id will be added after database save)
    return {
      provider: 'outlook',
      email: email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      scope: tokenData.scope
    };
  } catch (err) {
    console.error('Error connecting to Outlook:', err);
    throw err;
  }
}

// Send Gmail email with attachments
async function sendGmailEmail(
  accessToken: string,
  senderEmail: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
  attachments?: EmailAttachment[]
) {
  let raw = `From: ${senderEmail}\r\n`;
  raw += `To: ${to}\r\n`;
  if (cc) raw += `Cc: ${cc}\r\n`;
  if (bcc) raw += `Bcc: ${bcc}\r\n`;
  raw += `Subject: ${subject}\r\n`;
  
  // Handle attachments using MIME
  if (attachments && attachments.length > 0) {
    // Generate a boundary for multi-part message
    const boundary = `----MultipartBoundary${Date.now()}`;
    
    // Set content type to multipart/mixed
    raw += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    
    // Add HTML part
    raw += `--${boundary}\r\n`;
    raw += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
    raw += body + '\r\n\r\n';
    
    // Add each attachment
    for (const attachment of attachments) {
      raw += `--${boundary}\r\n`;
      raw += `Content-Type: ${attachment.contentType}\r\n`;
      raw += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
      raw += `Content-Transfer-Encoding: base64\r\n\r\n`;
      
      // Convert content to base64 if it's not already a string
      let base64Content = '';
      if (typeof attachment.content === 'string') {
        base64Content = attachment.content;
      } else {
        // Convert Blob to base64
        const arrayBuffer = await attachment.content.arrayBuffer();
        base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      }
      
      raw += base64Content + '\r\n\r\n';
    }
    
    // Close the MIME message
    raw += `--${boundary}--\r\n`;
  } else {
    // If no attachments, just use HTML content type
    raw += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
    raw += body;
  }

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

// Send Outlook email with attachments
async function sendOutlookEmail(
  accessToken: string,
  senderEmail: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
  attachments?: EmailAttachment[]
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

  // Create email message object
  const emailData: any = {
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
  };

  // Add attachments if any
  if (attachments && attachments.length > 0) {
    emailData.message.attachments = [];
    
    for (const attachment of attachments) {
      // Convert attachment content to base64
      let base64Content = '';
      if (typeof attachment.content === 'string') {
        base64Content = attachment.content;
      } else {
        // Convert Blob to base64
        const arrayBuffer = await attachment.content.arrayBuffer();
        base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      }
      
      emailData.message.attachments.push({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.filename,
        contentType: attachment.contentType,
        contentBytes: base64Content
      });
    }
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to send email through Outlook: ${errorData.error?.message || 'Unknown error'}`);
  }

  return { success: true };
}

// Add this function to your email.ts file

// Get organization domain
export async function getOrganizationDomain(organizationId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('domain, domain_verified')
      .eq('id', organizationId)
      .single();
      
    if (error || !data || !data.domain || !data.domain_verified) {
      return null;
    }
    
    return data.domain;
  } catch (err) {
    console.error('Error getting organization domain:', err);
    return null;
  }
}


// Send Gmail email with threading headers and attachments
async function sendGmailEmailWithThreading(
  accessToken: string,
  senderEmail: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
  replyTo?: string,
  messageId?: string,
  threadId?: string,
  attachments?: EmailAttachment[]
) {
  // Create message headers with thread information
  let raw = `From: ${senderEmail}\r\n`;
  raw += `To: ${to}\r\n`;
  if (cc) raw += `Cc: ${cc}\r\n`;
  if (bcc) raw += `Bcc: ${bcc}\r\n`;
  
  // Add thread headers for email threading
  if (messageId) {
    raw += `Message-ID: ${messageId}\r\n`;
  }
  
  if (threadId) {
    // Include existing thread ID in References header
    raw += `References: <${threadId}>\r\n`;
  }
  
  // Add reply-to if provided
  if (replyTo) {
    raw += `Reply-To: ${replyTo}\r\n`;
  }
  
  // Add footer with case reference
  if (subject.includes('[Case #')) {
    const caseReference = subject.match(/\[Case #([^\]]+)\]/);
    if (caseReference && caseReference[1]) {
      const caseFooter = `<div style="border-top: 1px solid #ccc; margin-top: 20px; padding-top: 10px; color: #777; font-size: 12px;">
        <p>Please keep the subject line intact to ensure your reply is properly tracked.</p>
        <p>Case Reference: ${caseReference[1]}</p>
      </div>`;
      
      // Add the footer to the body
      if (body.includes('</body>')) {
        body = body.replace('</body>', `${caseFooter}</body>`);
      } else {
        body += caseFooter;
      }
    }
  }
  
  raw += `Subject: ${subject}\r\n`;
  
  // Handle attachments using MIME
  if (attachments && attachments.length > 0) {
    // Generate a boundary for multi-part message
    const boundary = `----MultipartBoundary${Date.now()}`;
    
    // Set content type to multipart/mixed
    raw += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    
    // Add HTML part
    raw += `--${boundary}\r\n`;
    raw += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
    raw += body + '\r\n\r\n';
    
    // Add each attachment
    for (const attachment of attachments) {
      raw += `--${boundary}\r\n`;
      raw += `Content-Type: ${attachment.contentType}\r\n`;
      raw += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
      raw += `Content-Transfer-Encoding: base64\r\n\r\n`;
      
      // Convert content to base64 if it's not already a string
      let base64Content = '';
      if (typeof attachment.content === 'string') {
        base64Content = attachment.content;
      } else {
        // Convert Blob to base64
        const arrayBuffer = await attachment.content.arrayBuffer();
        base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      }
      
      raw += base64Content + '\r\n\r\n';
    }
    
    // Close the MIME message
    raw += `--${boundary}--\r\n`;
  } else {
    // If no attachments, just use HTML content type
    raw += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
    raw += body;
  }

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

// Send Outlook email with threading headers and attachments
async function sendOutlookEmailWithThreading(
  accessToken: string,
  senderEmail: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
  replyTo?: string,
  messageId?: string,
  threadId?: string,
  attachments?: EmailAttachment[]
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
  
  // Add case reference footer
  if (subject.includes('[Case #')) {
    const caseReference = subject.match(/\[Case #([^\]]+)\]/);
    if (caseReference && caseReference[1]) {
      const caseFooter = `<div style="border-top: 1px solid #ccc; margin-top: 20px; padding-top: 10px; color: #777; font-size: 12px;">
        <p>Please keep the subject line intact to ensure your reply is properly tracked.</p>
        <p>Case Reference: ${caseReference[1]}</p>
      </div>`;
      
      // Add the footer to the body
      if (body.includes('</body>')) {
        body = body.replace('</body>', `${caseFooter}</body>`);
      } else {
        body += caseFooter;
      }
    }
  }
    
  // Create the email request body
  const emailBody: any = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: body
      },
      toRecipients,
      ccRecipients,
      bccRecipients,
      internetMessageHeaders: []
    },
    saveToSentItems: 'true'
  };
  
  // Add reply-to if provided
  if (replyTo) {
    emailBody.message.replyTo = [
      {
        emailAddress: {
          address: replyTo
        }
      }
    ];
  }
  
  // Add internet message headers for threading
  // IMPORTANT: For Outlook, all custom headers must start with "x-" or "X-"
  if (messageId) {
    emailBody.message.internetMessageHeaders.push({
      name: 'X-Message-ID', // Fixed: Prefix with X- for Outlook compliance
      value: messageId
    });
  }
  
  if (threadId) {
    emailBody.message.internetMessageHeaders.push({
      name: 'X-References', // Fixed: Prefix with X- for Outlook compliance
      value: `<${threadId}>`
    });
  }
  
  // Add attachments if any
  if (attachments && attachments.length > 0) {
    emailBody.message.attachments = [];
    
    for (const attachment of attachments) {
      // Convert attachment content to base64
      let base64Content = '';
      if (typeof attachment.content === 'string') {
        base64Content = attachment.content;
      } else {
        // Convert Blob to base64
        const arrayBuffer = await attachment.content.arrayBuffer();
        base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      }
      
      emailBody.message.attachments.push({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.filename,
        contentType: attachment.contentType,
        contentBytes: base64Content
      });
    }
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to send email through Outlook: ${errorData.error?.message || 'Unknown error'}`);
  }

  return { success: true };
}

// Enhanced sendEmail function with automatic token refresh, threading, and attachments
export async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
  organizationId?: string,
  recordId?: string,
  configId?: string, // Change from number to string
  attachments?: EmailAttachment[] // Add attachments parameter
) {
  const toList = to.split(',').map(e => e.trim());
  const ccList = cc ? cc.split(',').map(e => e.trim()) : [];
  const bccList = bcc ? bcc.split(',').map(e => e.trim()) : [];

  let provider = '';
  let fromAddress = '';
  let config = null;
  let messageId = null;
  let threadId = null;

  try {
    // Get email config with organization context if provided
    if (configId) {
      // If a specific config ID is provided, get that config
      const { data, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('id', configId)
        .single();
        
      if (error) throw new Error('Could not find the specified email configuration');
      if (!data) throw new Error('Email configuration not found');
      
      config = {
        id: data.id,
        provider: data.provider,
        email: data.email,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.token_expiry).getTime(),
        scope: data.scopes
      };
    } else {
      // Otherwise use the getEmailConfig function as before
      config = await getEmailConfig(userId, organizationId);
    }
    
    if (!config) throw new Error('No email configuration found');
    
    // Check if token is expired
    if (Date.now() >= config.expiresAt) {
      // Try to refresh the token automatically
      console.log(`Token expired for ${config.email}, attempting to refresh...`);
      
      if (config.id && config.refreshToken) {
        const refreshedConfig = await refreshToken(config.id);
        
        if (refreshedConfig) {
          console.log(`Successfully refreshed token for ${config.email}`);
          config = refreshedConfig;
        } else {
          throw new Error(`Failed to automatically refresh token for ${config.email}. Manual re-authentication required.`);
        }
      } else {
        throw new Error('Cannot refresh token: missing configuration ID or refresh token');
      }
    }

    provider = config.provider;
    
    // Use the email address stored in the config
    if (!config.email) {
      throw new Error('Sender email address not found in configuration. Please reconnect your email account.');
    }
    
    fromAddress = config.email;

    // If this is related to a case, add case reference to subject
    if (recordId && subject.indexOf('[Case #') === -1) {
      // Add case reference if not already there
      subject = `[Case #${recordId.substring(0, 8)}] ${subject}`;
    }
    
    // Generate message ID and thread ID for threading
    const timestamp = Date.now();
    messageId = `<msg-${timestamp}-${Math.random().toString(36).substring(2, 10)}@simplidone.com>`;
    
    // Find existing thread ID if available
    let existingThreadId = null;
    if (recordId) {
      const { data: existingEmail } = await supabase
        .from('email_messages')
        .select('thread_id')
        .eq('record_id', recordId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (existingEmail?.thread_id) {
        existingThreadId = existingEmail.thread_id;
      }
    }
    
    // Use existing thread ID or generate new one
    threadId = existingThreadId || `case-${recordId || timestamp}`;

    // Get org's support email from email-to-case config
    let supportEmail = null;
    if (organizationId) {
      const { data: emailConfig } = await supabase
        .from('email_to_case_configs')
        .select('support_email')
        .eq('organization_id', organizationId)
        .maybeSingle();
        
      if (emailConfig?.support_email) {
        supportEmail = emailConfig.support_email;
      }
    }

    // Send the email using the appropriate provider
    if (config.provider === 'gmail') {
      await sendGmailEmailWithThreading(
        config.accessToken, 
        fromAddress, 
        to, 
        subject, 
        body, 
        cc, 
        bcc,
        supportEmail, // Reply-to address
        messageId,
        threadId,
        attachments // Add attachments
      );
    } else {
      await sendOutlookEmailWithThreading(
        config.accessToken, 
        fromAddress, 
        to, 
        subject, 
        body, 
        cc, 
        bcc,
        supportEmail, // Reply-to address
        messageId,
        threadId,
        attachments // Add attachments
      );
    }

    // Store attachment info for database record
    const attachmentInfo = attachments?.map(attachment => ({
      filename: attachment.filename,
      contentType: attachment.contentType
    })) || [];

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
      created_at: new Date().toISOString(),
      thread_id: threadId,
      message_id: messageId
    });

    if (error) {
      console.error('Error logging email:', error);
    }

    // Also add a feed entry if this is related to a case
    if (recordId) {
      await supabase.from('feeds').insert({
        content: `Email sent to ${to} with subject: ${subject}${attachments && attachments.length > 0 ? ` with ${attachments.length} attachment(s)` : ''}`,
        parent_type: 'Case',
        reference_id: recordId,
        organization_id: organizationId,
        created_by: userId,
        created_at: new Date().toISOString(),
        status: 'Active'
      });
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
      created_at: new Date().toISOString(),
      thread_id: threadId,
      message_id: messageId
    });

    throw err;
  }
}
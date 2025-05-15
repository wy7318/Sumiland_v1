import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send an email related to a case
 */
export async function sendCaseEmail({ 
  caseId, 
  to, 
  subject, 
  html, 
  userId, 
  orgId, 
  fromEmail 
}) {
  try {
    // Validate inputs
    if (!caseId || !to || !subject || !html || !userId || !orgId) {
      throw new Error("Missing required parameters");
    }

    // Get organization domain for reply-to email
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('domain, case_auto_response, case_response_template')
      .eq('id', orgId)
      .single();
    
    if (orgError || !orgData?.domain) {
      throw new Error("Could not retrieve organization domain");
    }

    // Create case-specific reply-to email
    const replyToEmail = `case-${caseId}@${orgData.domain}`;

    // Setup email message
    const msg = {
      to,
      from: fromEmail,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      replyTo: replyToEmail,
      // Add custom headers to track the email thread
      headers: {
        'X-Case-ID': caseId,
        // Set message ID for threading
        'Message-ID': `<case-${caseId}-${Date.now()}@${orgData.domain}>`
      }
    };

    // Send the email
    const response = await sgMail.send(msg);

    // Store email in database
    const { error: insertError } = await supabase
      .from('email_messages')
      .insert({
        record_id: caseId,
        user_id: userId,
        from_address: fromEmail,
        to_addresses: [to],
        subject,
        body_html: html,
        incoming: false,
        status: 'Sent',
        provider: 'sendgrid',
        organization_id: orgId
      });

    if (insertError) {
      console.error('Error storing email in database:', insertError);
    }

    // Add a feed entry for the email sent
    await supabase.from('feeds').insert({
      content: `Email sent to ${to} with subject: ${subject}`,
      parent_type: 'Case',
      reference_id: caseId,
      organization_id: orgId,
      created_by: userId,
      created_at: new Date().toISOString(),
      status: 'Active',
    });

    return { success: true, response };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Store failed email attempt
    if (caseId && userId && orgId) {
      await supabase
        .from('email_messages')
        .insert({
          record_id: caseId,
          user_id: userId,
          from_address: fromEmail,
          to_addresses: [to],
          subject,
          body_html: html,
          incoming: false,
          status: 'Failed',
          provider: 'sendgrid',
          error_message: error.message,
          organization_id: orgId
        });
    }
    
    throw error;
  }
}

/**
 * Send auto-response email when a new case is created
 */
export async function sendCaseAutoResponse({
  caseId,
  customerEmail,
  caseName,
  organizationId
}) {
  try {
    // Get organization info including template
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name, domain, case_auto_response, case_response_template')
      .eq('id', organizationId)
      .single();
      
    if (orgError || !org) {
      throw new Error("Could not retrieve organization");
    }
    
    // If auto-response is disabled, exit
    if (!org.case_auto_response || !org.case_response_template) {
      return { success: false, reason: 'Auto-response disabled' };
    }
    
    // Get case info
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, title, status')
      .eq('id', caseId)
      .single();
      
    if (caseError || !caseData) {
      throw new Error("Could not retrieve case data");
    }
    
    // Create case-specific reply-to email
    const replyToEmail = `case-${caseId}@${org.domain}`;
    
    // Replace template variables
    let htmlBody = org.case_response_template
      .replace(/{{case_number}}/g, caseId)
      .replace(/{{case_title}}/g, caseData.title)
      .replace(/{{case_status}}/g, caseData.status)
      .replace(/{{org_name}}/g, org.name);
      
    // Send email through SendGrid
    const msg = {
      to: customerEmail,
      from: `support@${org.domain}`,
      subject: `[Case #${caseId.substring(0, 8)}] ${caseData.title}`,
      html: htmlBody,
      text: htmlBody.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      replyTo: replyToEmail,
      headers: {
        'X-Case-ID': caseId,
        'Message-ID': `<auto-response-${caseId}-${Date.now()}@${org.domain}>`
      }
    };
    
    // Send the email
    const response = await sgMail.send(msg);
    
    // Store in email_messages
    await supabase.from('email_messages').insert({
      record_id: caseId,
      from_address: `support@${org.domain}`,
      to_addresses: [customerEmail],
      subject: `[Case #${caseId.substring(0, 8)}] ${caseData.title}`,
      body_html: htmlBody,
      incoming: false,
      status: 'Sent',
      provider: 'sendgrid',
      organization_id: organizationId,
      is_auto_response: true
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error sending auto-response:', error);
    return { success: false, error: error.message };
  }
}
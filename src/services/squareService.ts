// services/squareService.ts
import { supabase } from '../lib/supabase';

// Square invoice status types
export const SQUARE_INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  UNPAID: 'UNPAID',
  SCHEDULED: 'SCHEDULED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CANCELED: 'CANCELED',
  FAILED: 'FAILED'
};

// Types for Square credentials
export interface SquareCredentials {
  accessToken: string;
  locationId: string;
  environment?: 'sandbox' | 'production';
}

// Types for Square setup
export interface SquareSetupParams {
  organizationId: string;
  accessToken: string;
  locationId: string;
  environment?: 'sandbox' | 'production';
}

// Types for Square connection test
export interface SquareConnectionTestResult {
  success: boolean;
  message: string;
  location?: {
    id: string;
    name: string;
    status: string;
    type: string;
  };
}

// Types for payment link generation
export interface PaymentLinkParams {
  order: any; // Order type from your application
  organizationId: string;
  userId?: string;
}

export interface PaymentLinkResponse {
  success: boolean;
  paymentLink?: string;
  invoiceId?: string;
  error?: string;
  setupRequired?: boolean;
}

/**
 * Test Square connection credentials
 */
export async function testSquareConnection(params: SquareCredentials): Promise<SquareConnectionTestResult> {
  try {
    // Get session for auth
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    // Define headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth headers if session exists
    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      
      // Important: Don't send x-organization-id header
      // The Edge Function isn't configured to accept this
      // headers['x-organization-id'] = params.organizationId || '';
      
      // Only send user ID if needed
      headers['x-user-id'] = session.user.id;
    }

    // First try using Supabase's built-in functions.invoke method
    try {
      console.log('Attempting to call Edge Function via Supabase client...');
      const { data, error } = await supabase.functions.invoke('test-square-connection', {
        body: {
          accessToken: params.accessToken,
          locationId: params.locationId,
          environment: params.environment || 'sandbox'
        },
        // Don't include organizationId in headers
        headers: session ? { 'x-user-id': session.user.id } : undefined
      });

      if (error) throw error;
      
      return {
        success: data.success || false,
        message: data.message || 'Connection tested successfully',
        location: data.location
      };
    } catch (supabaseError) {
      console.warn('Supabase functions.invoke failed, falling back to fetch:', supabaseError);
      
      // Fallback to direct fetch if the Supabase method fails
      const url = `${supabase.functions.url}/test-square-connection`;
      console.log('Attempting direct fetch to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          accessToken: params.accessToken,
          locationId: params.locationId,
          environment: params.environment || 'sandbox'
        }),
        credentials: 'omit' // Important for CORS
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error ${response.status}: ${errorData.message || errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      return {
        success: data.success || false,
        message: data.message || 'Connection tested successfully',
        location: data.location
      };
    }
  } catch (error) {
    console.error('Error testing Square connection:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to test Square connection'
    };
  }
}

/**
 * Set up Square integration for an organization
 */
export async function setupSquareIntegration(params: SquareSetupParams): Promise<{ success: boolean; error?: string }> {
  try {
    // First, test the connection to make sure credentials are valid
    const testResult = await testSquareConnection({
      accessToken: params.accessToken,
      locationId: params.locationId,
      environment: params.environment
    });
    
    if (!testResult.success) {
      return {
        success: false,
        error: `Invalid Square credentials: ${testResult.message}`
      };
    }
    
    // Check if there's an existing record
    const { data: existingData, error: checkError } = await supabase
      .from('square_credentials')
      .select('id')
      .eq('organization_id', params.organizationId)
      .limit(1);
    
    if (checkError) {
      console.error('Error checking existing credentials:', checkError);
      throw checkError;
    }
    
    let result;
    
    if (existingData && existingData.length > 0) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('square_credentials')
        .update({
          access_token: params.accessToken,
          location_id: params.locationId,
          environment: params.environment || 'sandbox',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', params.organizationId);
      
      if (updateError) throw updateError;
      result = { success: true };
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('square_credentials')
        .insert({
          organization_id: params.organizationId,
          access_token: params.accessToken,
          location_id: params.locationId,
          environment: params.environment || 'sandbox',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) throw insertError;
      result = { success: true };
    }
    
    return result;
  } catch (error) {
    console.error('Error setting up Square integration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set up Square integration'
    };
  }
}

/**
 * Generate a Square payment link for an order
 */
export async function generatePaymentLink(params: PaymentLinkParams): Promise<PaymentLinkResponse> {
  try {
    // Get session for auth
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    // Define headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth headers if session exists
    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      headers['x-user-id'] = session.user.id;
    }

    // First try using Supabase's built-in functions.invoke method
    try {
      console.log('Attempting to call Square Payment Link Edge Function via Supabase client...');
      const { data, error } = await supabase.functions.invoke('square-payment-link', {
        body: {
          order: params.order,
          organizationId: params.organizationId,
          userId: params.userId || (session?.user?.id || null)
        },
        headers: session ? { 'x-user-id': session.user.id } : undefined
      });

      if (error) throw error;
      
      // Store the invoice data in Supabase if not done by the Edge Function
      if (data.success && data.paymentLink && data.invoiceId) {
        try {
          // Check if invoice already exists
          const { data: existingInvoice } = await supabase
            .from('square_invoices')
            .select('id')
            .eq('square_invoice_id', data.invoiceId)
            .eq('organization_id', params.organizationId)
            .single();
            
          if (!existingInvoice) {
            // Save invoice details
            await supabase.from('square_invoices').insert({
              organization_id: params.organizationId,
              order_id: params.order.order_id,
              square_invoice_id: data.invoiceId,
              payment_link: data.paymentLink,
              status: 'PUBLISHED',
              total_amount: Math.round(params.order.total_amount * 100), // Store in cents
              currency: 'USD'
            });
          }
        } catch (dbError) {
          console.warn('Error saving invoice to database:', dbError);
          // Continue even if DB save fails - we still have the payment link
        }
      }
      
      return {
        success: data.success || false,
        paymentLink: data.paymentLink,
        invoiceId: data.invoiceId,
        error: data.error,
        setupRequired: data.setup_required || false
      };
    } catch (supabaseError) {
      console.warn('Supabase functions.invoke failed, falling back to fetch:', supabaseError);
      
      // Fallback to direct fetch if the Supabase method fails
      const url = `${supabase.functions.url}/square-payment-link`;
      console.log('Attempting direct fetch to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order: params.order,
          organizationId: params.organizationId,
          userId: params.userId || (session?.user?.id || null)
        }),
        credentials: 'omit' // Important for CORS
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Store the invoice data in Supabase if not done by the Edge Function
      if (data.success && data.paymentLink && data.invoiceId) {
        try {
          // Check if invoice already exists
          const { data: existingInvoice } = await supabase
            .from('square_invoices')
            .select('id')
            .eq('square_invoice_id', data.invoiceId)
            .eq('organization_id', params.organizationId)
            .single();
            
          if (!existingInvoice) {
            // Save invoice details
            await supabase.from('square_invoices').insert({
              organization_id: params.organizationId,
              order_id: params.order.order_id,
              square_invoice_id: data.invoiceId,
              payment_link: data.paymentLink,
              status: 'PUBLISHED',
              total_amount: Math.round(params.order.total_amount * 100), // Store in cents
              currency: 'USD'
            });
          }
        } catch (dbError) {
          console.warn('Error saving invoice to database:', dbError);
          // Continue even if DB save fails - we still have the payment link
        }
      }
      
      return {
        success: data.success || false,
        paymentLink: data.paymentLink,
        invoiceId: data.invoiceId,
        error: data.error,
        setupRequired: data.setup_required || false
      };
    }
  } catch (error) {
    console.error('Error generating Square payment link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate payment link'
    };
  }
}

/**
 * Get existing Square invoice for an order
 */
export async function getExistingInvoice(orderId: string, organizationId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('square_invoices')
      .select('*')
      .eq('order_id', orderId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error fetching existing Square invoice:', error);
    return null;
  }
}

/**
 * Get Square credentials for an organization
 */
export async function getSquareCredentials(organizationId: string): Promise<SquareCredentials | null> {
  try {
    const { data, error } = await supabase
      .from('square_credentials')
      .select('access_token, location_id, environment')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error) {
      throw error;
    }

    return data ? {
      accessToken: data.access_token,
      locationId: data.location_id,
      environment: data.environment as 'sandbox' | 'production'
    } : null;
  } catch (error) {
    console.error('Error fetching Square credentials:', error);
    return null;
  }
}

/**
 * Development fallback: Mock payment link generation for testing without API calls
 */
export async function mockGeneratePaymentLink(params: PaymentLinkParams): Promise<PaymentLinkResponse> {
  return new Promise(resolve => {
    // Simulate API delay
    setTimeout(() => {
      resolve({
        success: true,
        paymentLink: `https://checkout.squareup.com/pay/mock-payment-${params.order.order_id}`,
        invoiceId: `mock-invoice-${Date.now()}`
      });
    }, 1500);
  });
}
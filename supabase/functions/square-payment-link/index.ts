// supabase/functions/square-payment-link/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Client, Environment } from 'https://esm.sh/square@25.0.0';
// Initialize Supabase client with environment variables
const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
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
    const { order, organizationId, userId } = await req.json();
    if (!order || !order.order_id || !organizationId) {
      return new Response(JSON.stringify({
        error: 'Order data and organization ID are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Get Square credentials from database
    const { data: credentials, error: credentialsError } = await supabaseClient.from('square_credentials').select('access_token, location_id').eq('organization_id', organizationId).single();
    if (credentialsError || !credentials) {
      // If no credentials found, return error
      return new Response(JSON.stringify({
        error: 'Square credentials not found for this organization',
        setup_required: true
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Initialize Square client
    const squareClient = new Client({
      accessToken: credentials.access_token,
      environment: Deno.env.get('SQUARE_ENVIRONMENT') === 'production' ? Environment.Production : Environment.Sandbox
    });
    // Create or get customer in Square
    const customerId = await getOrCreateCustomer(squareClient, order.customer);
    // Create invoice
    const invoice = await createInvoice(squareClient, {
      ...order,
      customerId,
      locationId: credentials.location_id
    });
    // Generate payment link
    const paymentLink = await generatePaymentLink(squareClient, invoice);
    // Log this activity
    await supabaseClient.from('activity_logs').insert({
      organization_id: organizationId,
      user_id: userId,
      activity_type: 'payment_link_generated',
      entity_type: 'order',
      entity_id: order.order_id,
      details: {
        invoice_id: invoice.id,
        payment_link: paymentLink
      }
    });
    return new Response(JSON.stringify({
      success: true,
      paymentLink,
      invoiceId: invoice.id
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error generating Square payment link:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate payment link',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
// Helper function to create or get a customer in Square
async function getOrCreateCustomer(client, customerData) {
  try {
    const { customersApi } = client;
    // First check if customer exists by email
    const { result } = await customersApi.searchCustomers({
      query: {
        filter: {
          emailAddress: {
            exact: customerData.email
          }
        }
      }
    });
    // If customer exists, return the first one
    if (result.customers && result.customers.length > 0) {
      return result.customers[0].id;
    }
    // Otherwise create new customer
    const { result: newCustomer } = await customersApi.createCustomer({
      givenName: customerData.first_name,
      familyName: customerData.last_name,
      emailAddress: customerData.email,
      phoneNumber: customerData.phone,
      companyName: customerData.company
    });
    return newCustomer.customer.id;
  } catch (error) {
    console.error('Error in getOrCreateCustomer:', error);
    throw error;
  }
}
// Helper function to create an invoice in Square
async function createInvoice(client, data) {
  try {
    const { invoicesApi } = client;
    // Format line items
    const lineItems = data.items.map((item)=>({
        name: item.product?.name || item.item_name || 'Custom Item',
        description: item.product?.description || item.description || '',
        quantity: String(item.quantity),
        basePriceMoney: {
          amount: Math.round(item.unit_price * 100),
          currency: 'USD'
        }
      }));
    // Create invoice
    const { result } = await invoicesApi.createInvoice({
      invoice: {
        locationId: data.locationId,
        primaryRecipient: {
          customerId: data.customerId
        },
        paymentRequests: [
          {
            requestType: 'BALANCE',
            dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
            automaticPaymentSource: 'NONE',
            reminders: [
              {
                relativeScheduledDays: -1,
                message: 'Your invoice is due tomorrow'
              },
              {
                relativeScheduledDays: -7,
                message: 'Your invoice is due in 7 days'
              }
            ]
          }
        ],
        deliveryMethod: 'EMAIL',
        title: `Invoice for Order ${data.order_number}`,
        description: data.notes || 'Thank you for your business',
        acceptedPaymentMethods: {
          card: true,
          squareGiftCard: true,
          bankAccount: true
        },
        lineItems
      },
      idempotencyKey: `invoice-${data.order_id}-${Date.now()}`
    });
    return result.invoice;
  } catch (error) {
    console.error('Error in createInvoice:', error);
    throw error;
  }
}
// Helper function to generate a payment link for an invoice
async function generatePaymentLink(client, invoice) {
  try {
    const { invoicesApi } = client;
    // Publish invoice first if it's in DRAFT status
    if (invoice.status === 'DRAFT') {
      await invoicesApi.publishInvoice(invoice.id, {
        version: invoice.version,
        idempotencyKey: `publish-${invoice.id}-${Date.now()}`
      });
    }
    // Get the invoice url
    const { result } = await invoicesApi.getInvoice(invoice.id);
    // Return the public URL for the invoice
    return result.invoice.publicUrl;
  } catch (error) {
    console.error('Error in generatePaymentLink:', error);
    throw error;
  }
}

// supabase/functions/square-webhook/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as crypto from 'https://deno.land/std@0.177.0/crypto/mod.ts';
// Initialize Supabase client with environment variables
const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
serve(async (req)=>{
  // Verify Square webhook signature
  const squareSignature = req.headers.get('x-square-hmacsha256-signature');
  if (!squareSignature) {
    return new Response(JSON.stringify({
      error: 'Missing Square signature'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  // Get webhook signing key from environment
  const signingKey = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY');
  if (!signingKey) {
    console.error('Missing Square webhook signature key in environment');
    return new Response(JSON.stringify({
      error: 'Configuration error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    // Clone the request to get the body as text
    const body = await req.text();
    // Verify the signature (simplified example)
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(signingKey), {
      name: 'HMAC',
      hash: 'SHA-256'
    }, false, [
      'verify'
    ]);
    const signatureArray = Array.from(new Uint8Array(Buffer.from(squareSignature, 'hex')));
    const verified = await crypto.subtle.verify('HMAC', key, new Uint8Array(signatureArray), encoder.encode(body));
    if (!verified) {
      return new Response(JSON.stringify({
        error: 'Invalid signature'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Parse webhook payload
    const payload = JSON.parse(body);
    const eventType = payload.type;
    // Handle invoice payment events
    if (eventType === 'invoice.payment_made') {
      await handleInvoicePayment(payload.data.object.invoice);
    } else if (eventType === 'invoice.updated') {
      await handleInvoiceUpdate(payload.data.object.invoice);
    }
    return new Response(JSON.stringify({
      received: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error processing Square webhook:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process webhook',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
// Helper function to handle invoice payment webhook
async function handleInvoicePayment(invoice) {
  try {
    // Find the corresponding invoice in our database
    const { data: invoiceData, error: invoiceError } = await supabaseClient.from('square_invoices').select('*').eq('square_invoice_id', invoice.id).single();
    if (invoiceError) throw invoiceError;
    // Update the invoice payment status
    await supabaseClient.from('square_invoices').update({
      status: invoice.status,
      amount_paid: invoice.payment_requests[0].computed_amount_paid_money.amount,
      updated_at: new Date().toISOString()
    }).eq('id', invoiceData.id);
    // If fully paid, update the order payment status
    if (invoice.status === 'PAID' || invoice.status === 'COMPLETED') {
      await supabaseClient.from('order_hdr').update({
        payment_status: 'Fully Received',
        payment_amount: invoice.payment_requests[0].computed_amount_money.amount / 100,
        updated_at: new Date().toISOString()
      }).eq('order_id', invoiceData.order_id);
      // Log payment activity
      await supabaseClient.from('activity_logs').insert({
        organization_id: invoiceData.organization_id,
        activity_type: 'payment_received',
        entity_type: 'order',
        entity_id: invoiceData.order_id,
        details: {
          invoice_id: invoice.id,
          amount: invoice.payment_requests[0].computed_amount_paid_money.amount / 100,
          currency: invoice.payment_requests[0].computed_amount_paid_money.currency,
          payment_method: 'Square',
          status: 'completed'
        }
      });
    } else if (invoice.payment_requests[0].computed_amount_paid_money.amount > 0) {
      await supabaseClient.from('order_hdr').update({
        payment_status: 'Partial Received',
        payment_amount: invoice.payment_requests[0].computed_amount_paid_money.amount / 100,
        updated_at: new Date().toISOString()
      }).eq('order_id', invoiceData.order_id);
    }
  } catch (error) {
    console.error('Error handling invoice payment:', error);
    throw error;
  }
}
// Helper function to handle invoice update webhook
async function handleInvoiceUpdate(invoice) {
  try {
    // Find the corresponding invoice in our database
    const { data: invoiceData, error: invoiceError } = await supabaseClient.from('square_invoices').select('*').eq('square_invoice_id', invoice.id).single();
    if (invoiceError) throw invoiceError;
    // Update our invoice record
    await supabaseClient.from('square_invoices').update({
      status: invoice.status,
      updated_at: new Date().toISOString()
    }).eq('id', invoiceData.id);
  } catch (error) {
    console.error('Error handling invoice update:', error);
    throw error;
  }
}

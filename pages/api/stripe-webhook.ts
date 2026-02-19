// /pages/api/stripe-webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Supabase connection for updating credits
const SUPABASE_URL = 'https://esylsugzysfjtukxmxks.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzeWxzdWd6eXNmanR1a214a3MiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczOTA0ODI4MSwiZXhwIjoyMDU0NjI0MjgxfQ.LdbK29uDGte1ue7LSAzEoHjAJNjYToAA2zyHWloS2fI';

// Disable body parsing, we need raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function updateCustomerCredits(customerId: string, amount: number): Promise<boolean> {
  console.log(`[Webhook] Attempting to update credits for customer: ${customerId}, amount: ${amount}`);
  
  try {
    // First get current credits
    const getUrl = `${SUPABASE_URL}/customers?id=eq.${customerId}&select=*`;
    console.log(`[Webhook] Fetching customer from: ${getUrl}`);
    
    const getResponse = await fetch(getUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    
    const responseText = await getResponse.text();
    console.log(`[Webhook] Customer fetch response: ${responseText}`);
    
    let customers;
    try {
      customers = JSON.parse(responseText);
    } catch (e) {
      console.error('[Webhook] Failed to parse customer response:', responseText);
      return false;
    }
    
    if (!customers || customers.length === 0) {
      console.error(`[Webhook] Customer not found with ID: ${customerId}`);
      return false;
    }

    const currentCredits = parseFloat(customers[0].credits) || 0;
    const newCredits = currentCredits + amount;
    
    console.log(`[Webhook] Current credits: ${currentCredits}, Adding: ${amount}, New total: ${newCredits}`);

    // Update credits
    const updateUrl = `${SUPABASE_URL}/customers?id=eq.${customerId}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ credits: newCredits }),
    });

    const updateText = await updateResponse.text();
    console.log(`[Webhook] Update response status: ${updateResponse.status}, body: ${updateText}`);

    if (!updateResponse.ok) {
      console.error('[Webhook] Failed to update credits:', updateText);
      return false;
    }

    console.log(`[Webhook] SUCCESS: Updated customer ${customerId} credits: ${currentCredits} -> ${newCredits}`);
    return true;
  } catch (error) {
    console.error('[Webhook] Error updating credits:', error);
    return false;
  }
}

async function logTransaction(data: any) {
  try {
    await fetch(`${SUPABASE_URL}/audit_logs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stripe_topup_success',
        user_id: data.customerId,
        details: {
          customerId: data.customerId,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          amount: data.amount,
          stripeSessionId: data.sessionId,
          stripePaymentIntentId: data.paymentIntentId,
          timestamp: new Date().toISOString(),
        },
      }),
    });
    console.log('[Webhook] Transaction logged to audit_logs');
  } catch (error) {
    console.error('[Webhook] Error logging transaction:', error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[Webhook] Received request, method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!webhookSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('[Webhook] No stripe-signature header');
    return res.status(400).json({ error: 'No signature' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    console.log('[Webhook] Event verified successfully, type:', event.type);
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('[Webhook] checkout.session.completed received');
      console.log('[Webhook] Session ID:', session.id);
      console.log('[Webhook] Session metadata:', JSON.stringify(session.metadata));
      console.log('[Webhook] Payment status:', session.payment_status);
      
      // Extract metadata
      const customerId = session.metadata?.customerId;
      const creditAmount = parseFloat(session.metadata?.creditAmount || '0');
      
      console.log(`[Webhook] Extracted - customerId: ${customerId}, creditAmount: ${creditAmount}`);
      
      if (!customerId) {
        console.error('[Webhook] No customerId in metadata!');
        break;
      }
      
      if (creditAmount <= 0) {
        console.error('[Webhook] Invalid creditAmount:', creditAmount);
        break;
      }
      
      // Update customer credits in database
      const success = await updateCustomerCredits(customerId, creditAmount);
      
      if (success) {
        // Log the transaction
        await logTransaction({
          customerId,
          customerEmail: session.metadata?.customerEmail,
          customerName: session.metadata?.customerName,
          amount: creditAmount,
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
        });
        
        console.log(`[Webhook] Successfully processed payment: $${creditAmount} for customer ${customerId}`);
      } else {
        console.error(`[Webhook] Failed to update credits for customer ${customerId}`);
      }
      break;
    }
    
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('[Webhook] PaymentIntent succeeded:', paymentIntent.id);
      break;
    }
    
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('[Webhook] Payment failed:', paymentIntent.id);
      break;
    }

    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
}

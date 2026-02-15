// /pages/api/stripe-webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Supabase connection for updating credits
const SUPABASE_URL = 'https://esylsugzysfjtukxmxks.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzeWxzdWd6eXNmam50dWtteGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDgyODEsImV4cCI6MjA4NDYyNDI4MX0.Ldbk29uDGte1ue7LSAzEoHjAJNjYToAA2zyHWloS2fI';

// Disable body parsing, we need raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function updateCustomerCredits(customerId: string, amount: number) {
  try {
    // First get current credits
    const getResponse = await fetch(
      `${SUPABASE_URL}/customers?id=eq.${customerId}&select=credits`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    const customers = await getResponse.json();
    if (!customers || customers.length === 0) {
      console.error('Customer not found:', customerId);
      return false;
    }

    const currentCredits = customers[0].credits || 0;
    const newCredits = currentCredits + amount;

    // Update credits
    const updateResponse = await fetch(
      `${SUPABASE_URL}/customers?id=eq.${customerId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ credits: newCredits }),
      }
    );

    if (!updateResponse.ok) {
      console.error('Failed to update credits:', await updateResponse.text());
      return false;
    }

    console.log(`Updated customer ${customerId} credits: ${currentCredits} -> ${newCredits}`);
    return true;
  } catch (error) {
    console.error('Error updating credits:', error);
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
        action: 'stripe_payment_success',
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
  } catch (error) {
    console.error('Error logging transaction:', error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Payment successful!', session.id);
      
      // Extract metadata
      const customerId = session.metadata?.customerId;
      const creditAmount = parseFloat(session.metadata?.creditAmount || '0');
      
      if (customerId && creditAmount > 0) {
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
          
          console.log(`Successfully added $${creditAmount} credits to customer ${customerId}`);
        }
      }
      break;
    }
    
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      break;
    }
    
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Payment failed:', paymentIntent.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
}

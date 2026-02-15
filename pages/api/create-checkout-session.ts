// /pages/api/create-checkout-session.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if API key is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe API key not configured. Please add STRIPE_SECRET_KEY to Vercel environment variables.' });
  }

  try {
    const { amount, customerId, customerEmail, customerName } = req.body;

    // Validate amount (minimum $5, in cents for Stripe)
    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (amountInCents < 500) {
      return res.status(400).json({ error: 'Minimum top-up amount is $5' });
    }

    // Create Stripe Checkout Session with PayNow ONLY
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['paynow'], // PayNow only for Singapore
      line_items: [
        {
          price_data: {
            currency: 'sgd',
            product_data: {
              name: 'MoveIt Credit Top-Up',
              description: `Add $${(amountInCents / 100).toFixed(2)} credits to your account`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/?topup=cancelled`,
      metadata: {
        customerId: customerId,
        customerEmail: customerEmail,
        customerName: customerName,
        creditAmount: amount,
      },
      customer_email: customerEmail,
    });

    res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create checkout session' 
    });
  }
}

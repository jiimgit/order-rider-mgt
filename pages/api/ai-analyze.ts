import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { deliveryDetails } = req.body;

  if (!deliveryDetails || deliveryDetails.trim().length < 20) {
    return res.status(400).json({ error: 'Please provide delivery details (at least 20 characters).' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured. Please add ANTHROPIC_API_KEY to environment variables.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: 'You are a Singapore delivery order analyzer. Analyze the following delivery details and return ONLY a JSON object with no extra text, no markdown, no backticks.\n\nThe JSON must have this exact structure:\n{\n  "pickup": "full pickup address with postal code if available",\n  "pickupUnitNo": "unit number or N/A",\n  "pickupContact": "pickup contact name or empty string",\n  "pickupPhone": "pickup phone or empty string",\n  "stops": [\n    {\n      "address": "full drop-off address with postal code if available",\n      "unitNo": "unit number or N/A",\n      "recipientName": "recipient name or empty string",\n      "recipientPhone": "recipient phone or empty string"\n    }\n  ],\n  "parcelSize": "small or medium or large or extra-large",\n  "remarks": "any special instructions mentioned",\n  "suggestedPrice": number (minimum $3 base + $2 per extra stop),\n  "suggestedDrivers": 1,\n  "deliveryDate": "YYYY-MM-DD if mentioned, otherwise empty string",\n  "deliverySlot": "6am-11am or 12pm-5pm or 6pm-11pm based on time mentioned, or empty string",\n  "analysis": "brief summary of the delivery in 1-2 sentences"\n}\n\nDelivery details:\n' + deliveryDetails
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return res.status(500).json({ error: 'AI service error. Status: ' + response.status });
    }

    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'AI analysis failed' });
    }

    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    } catch {
      console.error('Failed to parse AI response:', clean.substring(0, 200));
      return res.status(500).json({ error: 'Failed to parse AI response. Please try again.' });
    }
  } catch (error: any) {
    console.error('AI analyze error:', error);
    return res.status(500).json({ error: error.message || 'AI analysis failed' });
  }
}

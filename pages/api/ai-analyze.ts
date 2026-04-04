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
          content: `You are a Singapore delivery order analyzer. Analyze the following delivery details and return ONLY a JSON object with no extra text, no markdown, no backticks.

The JSON must have this exact structure:
{
  "pickup": "full pickup address with postal code if available",
  "pickupUnitNo": "unit number or N/A",
  "pickupContact": "pickup contact name or empty string",
  "pickupPhone": "pickup phone or empty string",
  "stops": [
    {
      "address": "full drop-off address with postal code if available",
      "unitNo": "unit number or N/A",
      "recipientName": "recipient name or empty string",
      "recipientPhone": "recipient phone or empty string"
    }
  ],
  "parcelSize": "small or medium or large or extra-large",
  "remarks": "any special instructions mentioned",
  "suggestedPrice": number (minimum $3 base + $2 per extra stop, consider distance in Singapore),
  "suggestedDrivers": 1 or more (suggest 2+ only if more than 5 stops or very heavy items),
  "deliveryDate": "YYYY-MM-DD if mentioned, otherwise empty string",
  "deliverySlot": "6am-11am or 12pm-5pm or 6pm-11pm based on time mentioned, or empty string",
  "analysis": "brief summary of the delivery in 1-2 sentences"
}

Delivery details:
${deliveryDetails}`
        }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'AI analysis failed' });
    }

    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
    
    try {
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response', raw: clean });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'AI analysis failed' });
  }
}

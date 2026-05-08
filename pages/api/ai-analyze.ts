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
    return res.status(500).json({ error: 'API key not configured.' });
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
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You are a Singapore delivery order analyzer and route planner for MoveIt logistics app. Analyze the following delivery details and return ONLY a JSON object with no extra text, no markdown, no backticks.

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
      "recipientPhone": "recipient phone or empty string",
      "region": "North or South or East or West or Central"
    }
  ],
  "parcelSize": "small or medium or large or extra-large",
  "remarks": "any special instructions mentioned",
  "suggestedPrice": number,
  "suggestedDrivers": number,
  "deliveryDate": "YYYY-MM-DD if mentioned, otherwise empty string",
  "deliverySlot": "6am-11am or 12pm-5pm or 6pm-11pm based on time mentioned, or empty string",
  "analysis": "brief summary of the delivery in 1-2 sentences",
  "routePlan": {
    "totalStops": number,
    "totalDrivers": number,
    "estimatedTime": "estimated total completion time e.g. 3-4 hours",
    "routes": [
      {
        "driver": "Driver A",
        "region": "East",
        "stops": [0, 1, 2],
        "estimatedTime": "1.5 hours",
        "estimatedDistance": "15 km"
      }
    ],
    "reasoning": "brief explanation of why this route plan is optimal"
  }
}

Pricing rules:
- Base: $3
- Per stop: $2.50
- Distance factor: $0.95 per km estimated
- Minimum $3

Route planning rules:
- If 5 or fewer stops: suggest 1 driver
- If 6-10 stops: suggest 1-2 drivers based on region spread
- If 11+ stops: suggest 2-3 drivers, group by region
- Singapore regions: North (Woodlands, Yishun, Sembawang, Admiralty), South (HarbourFront, Sentosa, Bukit Merah, Telok Blangah), East (Bedok, Tampines, Pasir Ris, Changi, Simei), West (Jurong, Clementi, Bukit Batok, Choa Chu Kang, Tuas), Central (Toa Payoh, Bishan, Ang Mo Kio, Novena, Orchard, City Hall, Marina Bay)
- Group nearby stops together for each driver
- The "stops" array in each route refers to the index (0-based) of the stops array

Delivery details:
${deliveryDetails}`
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
      console.error('Failed to parse AI response:', clean.substring(0, 500));
      return res.status(500).json({ error: 'Failed to parse AI response. Please try again.' });
    }
  } catch (error: any) {
    console.error('AI analyze error:', error);
    return res.status(500).json({ error: error.message || 'AI analysis failed' });
  }
}

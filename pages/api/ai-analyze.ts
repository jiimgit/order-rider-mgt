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
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: `You are an expert Singapore delivery logistics AI dispatcher for MoveIt app. Your job is to:
1. Parse delivery details (addresses, contacts, parcels)
2. Analyze ALL drop-off locations and classify them by Singapore region
3. Cluster nearby drops together and suggest optimal driver assignments
4. Recommend the number of drivers needed

SINGAPORE REGION CLASSIFICATION (you MUST classify every address):
- WEST: Jurong East, Jurong West, Clementi, Bukit Batok, Bukit Panjang, Choa Chu Kang, Tuas, Pioneer, Boon Lay, Lakeside, Chinese Garden, Dover, Buona Vista
- NORTH: Woodlands, Yishun, Sembawang, Admiralty, Marsiling, Khatib, Ang Mo Kio (northern part)
- NORTHEAST: Sengkang, Punggol, Hougang, Serangoon, Buangkok, Kovan
- EAST: Bedok, Tampines, Pasir Ris, Changi, Simei, Tanah Merah, Kembangan, Eunos, Paya Lebar
- CENTRAL: Toa Payoh, Bishan, Ang Mo Kio, Novena, Orchard, City Hall, Marina Bay, Queenstown, Tiong Bahru, Outram, Chinatown, Raffles Place, Kallang, Geylang
- BUKIT PANJANG/TECK WHYE CLUSTER: Bukit Panjang, Teck Whye, Senja, Jelapang, Pending, Petir, Cashew (these are close to West but form their own cluster)

DRIVER RECOMMENDATION RULES:
- 1-3 drops in same area: 1 driver
- 4-8 drops spread across 2 regions: 1-2 drivers
- 6-12 drops spread across 3+ regions: 2-3 drivers  
- 13-20 drops: 2-4 drivers, MUST split by region clusters
- 20+ drops: 3-5 drivers
- NEVER recommend 1 driver for 10+ drops across different regions
- Group drops that are geographically close (same estate, same area) to the same driver
- If drops are concentrated in one region (e.g., 10 drops all in Jurong), 1-2 drivers is fine

IMPORTANT: For 5+ drops, you MUST provide a detailed routePlan with:
- Which specific drops go to which driver
- Cluster reasoning (why these drops are grouped together)
- Each driver should handle drops in nearby areas to minimize travel

Return ONLY valid JSON with this exact structure (no markdown, no backticks, no explanation):
{
  "pickup": "full pickup address",
  "pickupUnitNo": "unit number or N/A",
  "pickupContact": "contact name or empty string",
  "pickupPhone": "phone or empty string",
  "stops": [
    {
      "address": "full drop-off address",
      "unitNo": "unit number or N/A",
      "recipientName": "recipient name or empty string",
      "recipientPhone": "recipient phone or empty string",
      "region": "West or North or East or Central or Northeast"
    }
  ],
  "parcelSize": "small or medium or large or extra-large",
  "remarks": "special instructions or empty string",
  "suggestedPrice": number,
  "suggestedDrivers": number,
  "deliveryDate": "YYYY-MM-DD or empty string",
  "deliverySlot": "time slot or empty string",
  "analysis": "brief 1-2 sentence summary",
  "routePlan": {
    "totalStops": number,
    "totalDrivers": number,
    "estimatedTime": {
      "withRecommendedDrivers": "e.g. 4-5 hours",
      "withFewerDrivers": "e.g. 6-8 hours",
      "withOneDriver": "not recommended" or "e.g. 2 hours" for small orders
    },
    "routes": [
      {
        "driver": "Driver A",
        "cluster": "Jurong / Bukit Batok Cluster",
        "stops": [0, 1, 2],
        "stopDetails": "Drop 1, 3, 5 (Jurong West, Jurong East, Boon Lay)",
        "estimatedTime": "1.5 hours",
        "estimatedDistance": "15 km",
        "region": "West"
      }
    ],
    "reasoning": "Detailed explanation of why drops are grouped this way. Mention geographic proximity, cluster density, and why splitting reduces total delivery time."
  }
}

Delivery details to analyze:
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

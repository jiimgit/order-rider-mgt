import type { NextApiRequest, NextApiResponse } from 'next';

async function lookupPostalCode(address: string): Promise<string | null> {
  try {
    const searchTerm = address.replace(/#\d+-\d+/g, '').replace(/S\(\d{6}\)/g, '').replace(/Singapore\s*\d{6}/gi, '').trim();
    if (searchTerm.length < 3) return null;
    const response = await fetch(
      `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(searchTerm)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const postal = data.results[0].POSTAL;
      if (postal && postal !== 'NIL' && postal.length === 6) {
        return postal;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function hasPostalCode(address: string): boolean {
  return /\b\d{6}\b/.test(address);
}

async function enrichAddressWithPostal(address: string): Promise<string> {
  if (!address || hasPostalCode(address)) return address;
  const postal = await lookupPostalCode(address);
  if (postal) {
    return address.replace(/,?\s*Singapore\s*$/i, '').trim() + ', Singapore ' + postal;
  }
  return address;
}

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
          content: `You are a Singapore delivery logistics AI dispatcher for MoveIt app. Your job is to:
1. Parse delivery details (pickup + all drop-offs)
2. Analyze the geography of ALL drop-offs
3. Cluster drop-offs by nearby regions
4. Recommend optimal number of drivers
5. Assign specific drops to each driver based on geographic clusters
6. Estimate completion time per driver and total

IMPORTANT - ADDRESSES:
- Include the full address as provided by the customer
- If you know the Singapore 6-digit postal code for the location, include it (e.g. Singapore 310110)
- Do NOT make up postal codes if you are unsure

CRITICAL RULES FOR ROUTE PLANNING:
- NEVER assign all drops to 1 driver if there are more than 5 drops
- For 6-10 drops: recommend 2 drivers minimum
- For 11-15 drops: recommend 2-3 drivers
- For 16+ drops: recommend 3+ drivers
- Cluster drops by GEOGRAPHIC PROXIMITY
- A driver should handle drops that are NEAR EACH OTHER
- Consider that 1 driver can complete about 5-8 drops per hour in a cluster
- If drops are spread across Singapore, MUST split into multiple drivers

SINGAPORE GEOGRAPHY REFERENCE:
- Jurong East/West, Clementi, Bukit Batok, Bukit Panjang, Choa Chu Kang, Tuas = WEST
- Woodlands, Yishun, Sembawang, Admiralty, Mandai = NORTH  
- Bedok, Tampines, Pasir Ris, Changi, Simei, Loyang = EAST
- Toa Payoh, Bishan, Ang Mo Kio, Serangoon, Hougang = CENTRAL-NORTH
- Orchard, Novena, City Hall, Marina Bay, Raffles Place = CENTRAL
- HarbourFront, Bukit Merah, Telok Blangah, Queenstown = SOUTH
- Sengkang, Punggol = NORTHEAST
- Bukit Timah, Toh Yi, Holland = CENTRAL-WEST
- Teck Whye, Senja = WEST (near Bukit Panjang)
- Pending Road, Jelapang Road = WEST (Bukit Panjang area)

CLUSTERING LOGIC:
- Group drops that are within the SAME estate or adjacent estates
- If a cluster has too many drops (>8), consider splitting into sub-clusters

Pricing rules:
- Base: $3
- Per stop: $2.50
- Distance factor: $0.95 per km estimated
- Minimum $3
- suggestedPrice should be based on estimated total distance

Return ONLY valid JSON (no markdown, no backticks):
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
      "recipientPhone": "phone or empty string",
      "region": "geographic cluster name"
    }
  ],
  "vehicleType": "bike or car or van",
  "remarks": "special instructions or empty string",
  "suggestedPrice": number,
  "suggestedDrivers": number,
  "deliveryDate": "YYYY-MM-DD or empty string",
  "deliverySlot": "time slot or empty string",
  "analysis": "1-2 sentence summary",
  "routePlan": {
    "totalStops": number,
    "totalDrivers": number,
    "estimatedTime": "total estimated time",
    "routes": [
      {
        "driver": "Driver A",
        "region": "cluster name",
        "stops": [0, 1, 2],
        "stopDetails": ["Drop 1: address summary", "Drop 2: address summary"],
        "estimatedTime": "e.g. 2 hours",
        "estimatedDistance": "e.g. 15 km"
      }
    ],
    "alternativeOptions": [
      {
        "drivers": 2,
        "estimatedTime": "6-8 hours",
        "note": "description"
      }
    ],
    "reasoning": "explanation of why this arrangement is optimal"
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

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      console.error('Failed to parse AI response:', clean.substring(0, 500));
      return res.status(500).json({ error: 'Failed to parse AI response. Please try again.' });
    }

    // Post-processing: enrich addresses with postal codes from OneMap
    try {
      if (parsed.pickup && !hasPostalCode(parsed.pickup)) {
        parsed.pickup = await enrichAddressWithPostal(parsed.pickup);
      }
      if (parsed.stops && Array.isArray(parsed.stops)) {
        for (let i = 0; i < parsed.stops.length; i++) {
          if (parsed.stops[i].address && !hasPostalCode(parsed.stops[i].address)) {
            parsed.stops[i].address = await enrichAddressWithPostal(parsed.stops[i].address);
          }
        }
      }
    } catch (e) {
      console.error('Postal code enrichment failed:', e);
    }

    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('AI analyze error:', error);
    return res.status(500).json({ error: error.message || 'AI analysis failed' });
  }
}

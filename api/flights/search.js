export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { origin, destination, departureDate, adults = 1, returnDate } = req.query;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ error: 'Missing required parameters: origin, destination, departureDate' });
    }

    // Get Amadeus token
    const tokenResponse = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AMADEUS_CLIENT_ID,
        client_secret: process.env.AMADEUS_CLIENT_SECRET
      })
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error('Failed to get Amadeus token: ' + text);
    }

    const { access_token } = await tokenResponse.json();

    const params = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: departureDate,
      adults: String(adults),
      max: '10'
    });
    if (returnDate) params.append('returnDate', returnDate);

    const flightResponse = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?${params.toString()}`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (!flightResponse.ok) {
      const err = await flightResponse.text();
      throw new Error('Amadeus error: ' + err);
    }

    const flightData = await flightResponse.json();
    return res.status(200).json({ success: true, data: flightData.data || [], meta: flightData.meta || {} });

  } catch (error) {
    console.error('Flight API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error', success: false });
  }
}

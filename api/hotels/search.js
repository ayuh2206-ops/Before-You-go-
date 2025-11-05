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
    const { cityCode, checkInDate, checkOutDate, adults = 1, rooms = 1 } = req.query;

    if (!cityCode || !checkInDate || !checkOutDate) {
      return res.status(400).json({ error: 'Missing required parameters: cityCode, checkInDate, checkOutDate' });
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
      cityCode: cityCode,
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      adults: String(adults),
      roomQuantity: String(rooms),
      radius: '20',
      radiusUnit: 'KM',
      ratings: '3,4,5'
    });

    const hotelResponse = await fetch(`https://test.api.amadeus.com/v3/shopping/hotel-offers?${params.toString()}`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (!hotelResponse.ok) {
      const err = await hotelResponse.text();
      throw new Error('Amadeus error: ' + err);
    }

    const hotelData = await hotelResponse.json();
    return res.status(200).json({ success: true, data: hotelData.data || [], meta: hotelData.meta || {} });

  } catch (error) {
    console.error('Hotel API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error', success: false });
  }
}

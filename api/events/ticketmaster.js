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
    const { lat, lon } = req.query;
    // Build a simple search for nearby events using lat/lon if provided.
    const params = new URLSearchParams({ apikey: process.env.TICKETMASTER_API_KEY, size: '20' });
    if (lat && lon) params.append('latlong', `${lat},${lon}`);

    const resp = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`);
    if (!resp.ok) throw new Error('Ticketmaster request failed');
    const data = await resp.json();
    return res.status(200).json({ success: true, data: data._embedded?.events || [], meta: data.page || {} });

  } catch (error) {
    console.error('Ticketmaster API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error', success: false });
  }
}

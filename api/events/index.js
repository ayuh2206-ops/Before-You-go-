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
    const { location, startDate, endDate, category } = req.query;
    if (!location) return res.status(400).json({ error: 'Missing required parameter: location' });

    // Try PredictHQ
    try {
      const predictHQParams = new URLSearchParams({ location: location, limit: '20', sort: 'rank' });
      if (startDate) predictHQParams.append('start.gte', startDate);
      if (endDate) predictHQParams.append('start.lte', endDate);
      if (category) predictHQParams.append('category', category);

      const predictHQResponse = await fetch(`https://api.predicthq.com/v1/events/?${predictHQParams.toString()}`, {
        headers: { Authorization: `Bearer ${process.env.PREDICTHQ_API_KEY}`, Accept: 'application/json' }
      });

      if (predictHQResponse.ok) {
        const predictHQData = await predictHQResponse.json();
        return res.status(200).json({ success: true, source: 'predicthq', data: predictHQData.results || [], count: predictHQData.count || 0 });
      }
    } catch (e) {
      console.warn('PredictHQ failed, falling back to Ticketmaster:', e.message);
    }

    // Fallback to Ticketmaster
    const ticketmasterParams = new URLSearchParams({ apikey: process.env.TICKETMASTER_API_KEY, city: location, size: '20', sort: 'date,asc' });
    if (startDate) ticketmasterParams.append('startDateTime', `${startDate}T00:00:00Z`);
    if (endDate) ticketmasterParams.append('endDateTime', `${endDate}T23:59:59Z`);

    const ticketmasterResponse = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${ticketmasterParams.toString()}`);
    if (!ticketmasterResponse.ok) throw new Error('Ticketmaster failed');
    const ticketmasterData = await ticketmasterResponse.json();

    return res.status(200).json({ success: true, source: 'ticketmaster', data: ticketmasterData._embedded?.events || [], count: ticketmasterData.page?.totalElements || 0 });

  } catch (error) {
    console.error('Events API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error', success: false });
  }
}

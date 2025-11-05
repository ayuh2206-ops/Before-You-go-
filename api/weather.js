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
    const { lat, lon, city } = req.query;

    if (!lat && !lon && !city) {
      return res.status(400).json({ error: 'Missing required parameters: either (lat, lon) or city' });
    }

    let params;
    if (city) {
      params = new URLSearchParams({ q: city, appid: process.env.OPENWEATHER_API_KEY, units: 'metric' });
    } else {
      params = new URLSearchParams({ lat: lat, lon: lon, appid: process.env.OPENWEATHER_API_KEY, units: 'metric' });
    }

    const currentWeatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?${params.toString()}`);
    if (!currentWeatherResponse.ok) throw new Error('Failed to fetch current weather');
    const currentWeather = await currentWeatherResponse.json();

    const forecastParams = new URLSearchParams({ lat: currentWeather.coord.lat, lon: currentWeather.coord.lon, appid: process.env.OPENWEATHER_API_KEY, units: 'metric', cnt: '40' });
    const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?${forecastParams.toString()}`);
    if (!forecastResponse.ok) throw new Error('Failed to fetch weather forecast');
    const forecast = await forecastResponse.json();

    return res.status(200).json({ success: true, current: currentWeather, forecast: forecast.list || [] });

  } catch (error) {
    console.error('Weather API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error', success: false });
  }
}

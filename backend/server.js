import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files from the backend's `public/` directory (safer than serving the whole repo)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..', 'public')));

// Simple health endpoint used by smoke tests
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const AMADEUS_BASE = process.env.AMADEUS_ENV === 'production' ? 'https://api.amadeus.com' : 'https://test.api.amadeus.com';
let amadeusToken = null;
let tokenExpiresAt = 0;

async function getAmadeusToken() {
  if (amadeusToken && Date.now() < tokenExpiresAt - 30000) return amadeusToken;
  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AMADEUS_CLIENT_ID || '',
      client_secret: process.env.AMADEUS_CLIENT_SECRET || ''
    })
  });
  if (!res.ok) throw new Error(`Amadeus auth failed: ${res.status}`);
  const data = await res.json();
  amadeusToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return amadeusToken;
}

// Flights proxy
app.get('/api/flights/search', async (req, res) => {
  try {
    const { origin, destination, departureDate, returnDate, adults = '1' } = req.query;
    const token = await getAmadeusToken();
    const params = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      returnDate,
      adults,
      currencyCode: 'USD',
      max: '3'
    });
    const r = await fetch(`${AMADEUS_BASE}/v2/shopping/flight-offers?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'flight_search_failed', message: e.message });
  }
});

// Hotels proxy (Amadeus)
app.get('/api/hotels/search', async (req, res) => {
  try {
    const { cityCode, checkIn, checkOut, adults = '2' } = req.query;
    const token = await getAmadeusToken();
    const params = new URLSearchParams({
      cityCode,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults,
      roomQuantity: '1',
      currency: 'USD'
    });
    const r = await fetch(`${AMADEUS_BASE}/v2/shopping/hotel-offers?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'hotel_search_failed', message: e.message });
  }
});

// PredictHQ events
app.get('/api/events', async (req, res) => {
  try {
    const { lat, lon, start, end } = req.query;
    const params = new URLSearchParams({ active: `gte:${start},lte:${end}`, within: `20km@${lat},${lon}`, limit: '10' });
    const r = await fetch(`https://api.predicthq.com/v1/events/?${params.toString()}`, {
      headers: { Authorization: `Bearer ${process.env.PREDICTHQ_KEY || ''}` }
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'events_failed', message: e.message });
  }
});

// Ticketmaster fallback
app.get('/api/events/ticketmaster', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const r = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?apikey=${process.env.TICKETMASTER_KEY}&latlong=${lat},${lon}&radius=25`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'tm_failed', message: e.message });
  }
});

// Weather
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const r = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.OPENWEATHER_KEY}`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'weather_failed', message: e.message });
  }
});

// Places (nearby)
app.get('/api/places/nearby', async (req, res) => {
  try {
    const { lat, lon, type = 'tourist_attraction' } = req.query;
    const r = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=5000&type=${encodeURIComponent(type)}&key=${process.env.GOOGLE_PLACES_KEY}`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'places_failed', message: e.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Proxy running on :${port}`));




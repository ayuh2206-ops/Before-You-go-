import { API_KEYS } from "../config/api-keys.js";
import { jsonFetch } from "../utils/fetch.js";
import { getCache, setCache } from "../utils/cache.js";

const AMADEUS_BASE = API_KEYS.AMADEUS.ENV === "production"
	? "https://api.amadeus.com"
	: "https://test.api.amadeus.com";

let accessToken = null;
let tokenExpiresAt = 0;

export async function getAmadeusAccessToken() {
	if (accessToken && Date.now() < tokenExpiresAt - 30_000) return accessToken;
	const url = `${AMADEUS_BASE}/v1/security/oauth2/token`;
	const body = new URLSearchParams({
		grant_type: "client_credentials",
		client_id: API_KEYS.AMADEUS.CLIENT_ID,
		client_secret: API_KEYS.AMADEUS.CLIENT_SECRET || ""
	});
	const res = await jsonFetch(url, { method: "POST", body });
	if (!res.ok) throw new Error(`Amadeus auth failed: ${res.status}`);
	const data = await res.json();
	accessToken = data.access_token;
	tokenExpiresAt = Date.now() + (data.expires_in * 1000);
	return accessToken;
}

export function cityToIataGuess(destinationName) {
	// Very naive mapping for now; in production resolve via an API/lookup
	const map = {
		"Rome": "ROM",
		"Kyoto": "KIX",
		"Costa Rica": "SJO",
		"Marrakesh": "RAK",
		"Swiss Alps": "ZRH",
	};
	for (const key of Object.keys(map)) if (destinationName.includes(key)) return map[key];
	return "NYC"; // fallback
}

export async function searchFlights({ origin, destinationName, departureDate, returnDate, adults = 1 }) {
	const cacheKey = `flights:${origin}:${destinationName}:${departureDate}:${returnDate}:${adults}`;
	const cached = getCache(cacheKey);
	if (cached) return cached;

    const dest = cityToIataGuess(destinationName);

    // Try proxy first
    try {
        const proxyParams = new URLSearchParams({ origin, destination: dest, departureDate, returnDate, adults: String(adults) });
        const proxyRes = await jsonFetch(`/api/flights/search?${proxyParams.toString()}`);
        if (proxyRes.ok) {
            const data = await proxyRes.json();
            const results = formatFlightResults(data);
            setCache(cacheKey, results, 5 * 60 * 1000);
            return results;
        }
    } catch (e) {}

    // Fallback: direct Amadeus
    try {
        const token = await getAmadeusAccessToken();
        const params = new URLSearchParams({
            originLocationCode: origin,
            destinationLocationCode: dest,
            departureDate,
            returnDate,
            adults: String(adults),
            currencyCode: "USD",
            max: "3"
        });
        const url = `${AMADEUS_BASE}/v2/shopping/flight-offers?${params.toString()}`;
        const res = await jsonFetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            const results = formatFlightResults(data);
            setCache(cacheKey, results, 5 * 60 * 1000);
            return results;
        }
    } catch (e) {}

    setCache(cacheKey, []);
    return [];
}

export function formatFlightResults(apiResponse) {
	const data = apiResponse?.data || [];
	return data.slice(0, 3).map(offer => {
		const price = offer.price?.grandTotal || offer.price?.total;
		const itineraries = offer.itineraries?.map(it => ({
			duration: it.duration,
			segments: it.segments?.map(s => ({
				carrierCode: s.carrierCode,
				number: s.number,
				from: s.departure?.iataCode,
				to: s.arrival?.iataCode,
				dep: s.departure?.at,
				arr: s.arrival?.at
			})) || []
		})) || [];
		return { price, currency: apiResponse?.dictionaries?.currencies ? Object.keys(apiResponse.dictionaries.currencies)[0] : "USD", itineraries };
	});
}



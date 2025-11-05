import { API_KEYS } from "../config/api-keys.js";
import { jsonFetch } from "../utils/fetch.js";
import { getCache, setCache } from "../utils/cache.js";

// Placeholder Google Places; recommend proxying server-side in production
export async function getActivitiesNearby(lat, lon, type = "tourist_attraction") {
	const cacheKey = `places:${lat}:${lon}:${type}`;
	const cached = getCache(cacheKey);
	if (cached) return cached;

    // Try proxy first
    try {
        const res = await jsonFetch(`/api/places/nearby?lat=${lat}&lon=${lon}&type=${encodeURIComponent(type)}`);
        if (res.ok) {
            const data = await res.json();
            const items = (data.results || []).slice(0, 10).map(p => ({
                name: p.name,
                rating: p.rating,
                address: p.vicinity,
                placeId: p.place_id,
                location: p.geometry?.location
            }));
            setCache(cacheKey, items);
            return items;
        }
    } catch (e) {}

    // Fallback direct (dev only)
    if (!API_KEYS.GOOGLE_PLACES.KEY) return [];
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=5000&type=${encodeURIComponent(type)}&key=${API_KEYS.GOOGLE_PLACES.KEY}`;
    const res = await jsonFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const items = (data.results || []).slice(0, 10).map(p => ({
        name: p.name,
        rating: p.rating,
        address: p.vicinity,
        placeId: p.place_id,
        location: p.geometry?.location
    }));
    setCache(cacheKey, items);
    return items;
}

export async function getRestaurants(lat, lon, cuisine = "") {
	return getActivitiesNearby(lat, lon, "restaurant");
}



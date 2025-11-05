import { API_KEYS } from "../config/api-keys.js";
import { jsonFetch } from "../utils/fetch.js";
import { getCache, setCache } from "../utils/cache.js";

export async function getEventsForDestination({ lat, lon, startDate, endDate }) {
	const cacheKey = `events:${lat}:${lon}:${startDate}:${endDate}`;
	const cached = getCache(cacheKey);
	if (cached) return cached;

    // Try proxy (PredictHQ)
    try {
        const params = new URLSearchParams({ lat: String(lat), lon: String(lon), start: startDate, end: endDate });
        const res = await jsonFetch(`/api/events?${params.toString()}`);
        if (res.ok) {
            const data = await res.json();
            const events = formatEvents(data?.results || []);
            setCache(cacheKey, events);
            return events;
        }
    } catch (e) {}

	// Ticketmaster fallback (note: requires market/geo params; using latlon)
	try {
        const res = await jsonFetch(`/api/events/ticketmaster?lat=${lat}&lon=${lon}`);
		if (res.ok) {
			const data = await res.json();
			const events = formatEvents((data?._embedded?.events || []).map(tm => ({
				title: tm.name,
				start: tm.dates?.start?.dateTime,
				category: tm.classifications?.[0]?.segment?.name,
				url: tm.url,
				venue: tm._embedded?.venues?.[0]?.name
			})));
			setCache(cacheKey, events);
			return events;
		}
	} catch (e) {}

	return [];
}

export function formatEvents(items) {
	return items.slice(0, 10).map(ev => ({
		title: ev.title,
		start: ev.start,
		category: ev.category || ev.label,
		sourceUrl: ev.url,
		venue: ev.venue
	}));
}



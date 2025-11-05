import { getEventsForDestination } from "../services/event-service.js";
import { getActivitiesNearby } from "../services/activity-service.js";
import { getForecast } from "../services/weather-service.js";

export async function initializeForTrip(tripData) {
	// tripData: { destination, coords:{lat,lon}, dates:{start,end}, persona }
	const { coords, dates } = tripData;
	const [events, activities, forecast] = await Promise.all([
		coords ? getEventsForDestination({ lat: coords.lat, lon: coords.lon, startDate: dates.start, endDate: dates.end }) : Promise.resolve([]),
		coords ? getActivitiesNearby(coords.lat, coords.lon, "tourist_attraction") : Promise.resolve([]),
		coords ? getForecast(coords.lat, coords.lon) : Promise.resolve([])
	]);

	const suggestions = createSmartSuggestions({ events, activities, forecast, persona: tripData.persona });
	return { events, activities, forecast, suggestions };
}

export function createSmartSuggestions({ events, activities, forecast, persona }) {
	const scored = [];
	for (const ev of events) {
		scored.push({ type: "event", title: ev.title, reason: `Matches your interests as a ${persona}.`, priority: "high", data: ev });
	}
	for (const act of activities.slice(0, 5)) {
		scored.push({ type: "activity", title: act.name, reason: `Popular nearby attraction for a ${persona}.`, priority: "medium", data: act });
	}
	return scored.slice(0, 10);
}

export function acceptSuggestion(suggestion, dayBucket) {
	dayBucket.push(suggestion);
}

export function declineSuggestion(suggestion) {
	// no-op placeholder; track feedback later
}



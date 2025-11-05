// Entry point that wires existing app logic with services
// Note: We keep original HTML structure; we progressively enhance dynamic calls.

import { searchFlights } from "./services/flight-service.js";
import { searchHotels } from "./services/hotel-service.js";
import { initializeForTrip } from "./components/ai-buddy-enhanced.js";
import { renderItinerary, addActivityToDay } from "./components/itinerary-builder.js";

// Hook into global functions that exist in the HTML page
window.__enhanceDestinationsWithLiveData = async function(destinations, { origin = "NYC", dates, travelers = 1 }) {
	const enhanced = [];
	for (const d of destinations) {
		const flights = await searchFlights({ origin, destinationName: d.name, departureDate: dates.start, returnDate: dates.end, adults: travelers }).catch(() => []);
		const hotels = await searchHotels({ cityCode: "NYC", checkIn: dates.start, checkOut: dates.end, adults: travelers }).catch(() => []);
		enhanced.push({ ...d, flights, hotels });
	}
	return enhanced;
}

window.__initializeTripIntel = initializeForTrip;
window.__renderItinerary = renderItinerary;
window.__addActivityToDay = addActivityToDay;



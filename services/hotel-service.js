import { API_KEYS } from "../config/api-keys.js";
import { jsonFetch } from "../utils/fetch.js";
import { getCache, setCache } from "../utils/cache.js";
import { getAmadeusAccessToken } from "./flight-service.js";

const AMADEUS_BASE = API_KEYS.AMADEUS.ENV === "production"
	? "https://api.amadeus.com"
	: "https://test.api.amadeus.com";

export async function searchHotels({ cityCode = "NYC", checkIn, checkOut, adults = 2 }) {
	const cacheKey = `hotels:${cityCode}:${checkIn}:${checkOut}:${adults}`;
	const cached = getCache(cacheKey);
	if (cached) return cached;

    // Try proxy first
    try {
        const proxyParams = new URLSearchParams({ cityCode, checkIn, checkOut, adults: String(adults) });
        const proxyRes = await jsonFetch(`/api/hotels/search?${proxyParams.toString()}`);
        if (proxyRes.ok) {
            const data = await proxyRes.json();
            const hotels = formatHotelResults(data);
            setCache(cacheKey, hotels);
            return hotels;
        }
    } catch (e) {}

	try {
		const token = await getAmadeusAccessToken();
		// Amadeus Hotel Search by city code
		const params = new URLSearchParams({
			cityCode,
			adults: String(adults),
			checkInDate: checkIn,
			checkOutDate: checkOut,
			roomQuantity: "1",
			currency: "USD"
		});
		const url = `${AMADEUS_BASE}/v2/shopping/hotel-offers?${params.toString()}`;
		const res = await jsonFetch(url, { headers: { Authorization: `Bearer ${token}` } });
		if (res.ok) {
			const data = await res.json();
			const hotels = formatHotelResults(data);
			setCache(cacheKey, hotels);
			return hotels;
		}
	} catch (e) {}

	// Fallback: Booking.com RapidAPI
	try {
		const url = `https://${API_KEYS.RAPIDAPI.HOSTS.BOOKING}/v1/hotels/search?dest_id=-1456928&order_by=popularity&adults_number=${adults}&checkin_date=${checkIn}&checkout_date=${checkOut}`;
		const res = await jsonFetch(url, {
			headers: { 'X-RapidAPI-Key': API_KEYS.RAPIDAPI.KEY, 'X-RapidAPI-Host': API_KEYS.RAPIDAPI.HOSTS.BOOKING }
		});
		if (res.ok) {
			const data = await res.json();
			const hotels = (data?.result || []).slice(0, 3).map(h => ({
				name: h.hotel_name,
				pricePerNight: h.min_total_price || h.composite_price_breakdown?.gross_amount?.value,
				currency: h.composite_price_breakdown?.gross_amount?.currency || "USD",
				rating: h.review_score,
				image: h.max_1440_photo_url,
				address: h.address
			}));
			setCache(cacheKey, hotels);
			return hotels;
		}
	} catch (e) {}

	return [];
}

export function formatHotelResults(apiResponse) {
	const data = apiResponse?.data || [];
	return data.slice(0, 3).map(entry => {
		const offer = entry.offers?.[0];
		return {
			name: entry.hotel?.name,
			pricePerNight: offer?.price?.total,
			currency: offer?.price?.currency || "USD",
			rating: entry.hotel?.rating,
			image: entry.hotel?.media?.[0]?.uri,
			address: entry.hotel?.address?.lines?.join(", ")
		};
	});
}



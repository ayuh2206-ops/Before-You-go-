import { API_KEYS } from "../config/api-keys.js";
import { jsonFetch } from "../utils/fetch.js";
import { getCache, setCache } from "../utils/cache.js";

const ICON_MAP = {
	Thunderstorm: "⛈️",
	Drizzle: "🌦️",
	Rain: "🌧️",
	Snow: "❄️",
	Clear: "☀️",
	Clouds: "☁️",
};

export async function getForecast(lat, lon) {
	const cacheKey = `wx:${lat}:${lon}`;
	const cached = getCache(cacheKey);
	if (cached) return cached;
    // Try proxy first
    let res;
    try {
        res = await jsonFetch(`/api/weather?lat=${lat}&lon=${lon}`);
    } catch (e) {}
    if (!res || !res.ok) {
        // Fallback direct (dev only)
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEYS.OPENWEATHER.KEY}`;
        res = await jsonFetch(url);
    }
	if (!res.ok) return [];
	const data = await res.json();
	const formatted = formatForecast(data);
	setCache(cacheKey, formatted, 10 * 60 * 1000);
	return formatted;
}

export function formatForecast(api) {
	const byDay = new Map();
	(api.list || []).forEach(item => {
		const date = item.dt_txt.split(" ")[0];
		const main = item.weather?.[0]?.main || "";
		const temp = item.main?.temp;
		if (!byDay.has(date)) byDay.set(date, { date, temps: [], icons: new Set() });
		const entry = byDay.get(date);
		entry.temps.push(temp);
		entry.icons.add(ICON_MAP[main] || "🌤️");
	});
	return Array.from(byDay.values()).slice(0, 5).map(d => ({
		date: d.date,
		low: Math.round(Math.min(...d.temps)),
		high: Math.round(Math.max(...d.temps)),
		icon: Array.from(d.icons)[0]
	}));
}



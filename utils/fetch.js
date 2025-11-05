// Lightweight fetch wrapper with retries, exponential backoff, and optional headers merge

export async function fetchWithRetry(url, options = {}, retries = 3, initialDelayMs = 800) {
	let delay = initialDelayMs;
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const res = await fetch(url, options);
			if (res.ok) return res;
			if (res.status === 429 || res.status >= 500) {
				if (attempt === retries) return res;
				await new Promise(r => setTimeout(r, delay));
				delay *= 2;
				continue;
			}
			return res; // client error; don't retry
		} catch (err) {
			if (attempt === retries) throw err;
			await new Promise(r => setTimeout(r, delay));
			delay *= 2;
		}
	}
}

export async function jsonFetch(url, options = {}, retries = 3) {
	const merged = {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(options.headers || {})
		}
	};
	const res = await fetchWithRetry(url, merged, retries);
	return res;
}



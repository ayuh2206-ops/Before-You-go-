export function renderItinerary(container, { startDate, endDate, forecast = [] }) {
	container.innerHTML = "";
	const days = enumerateDays(startDate, endDate);
	days.forEach((d, i) => {
		const wx = forecast[i] || {};
		const card = document.createElement('div');
		card.className = "border rounded-2xl p-4 mb-4 bg-white";
		card.innerHTML = `
			<div class="flex items-center justify-between">
				<h3 class="font-heading text-xl font-bold">Day ${i + 1} — ${d}</h3>
				<div class="text-gray-600">${wx.icon || ''} ${wx.low ?? ''}°/${wx.high ?? ''}°C</div>
			</div>
			<div class="mt-3 space-y-2" data-activities></div>
			<button class="mt-3 bg-brand-accent text-white px-4 py-2 rounded-full font-semibold" data-add-activity>Add Activity</button>
		`;
		container.appendChild(card);
	});
}

export function addActivityToDay(container, dayIndex, activity) {
	const dayCard = container.children[dayIndex];
	const list = dayCard.querySelector('[data-activities]');
	const row = document.createElement('div');
	row.className = "p-2 border rounded-xl";
	row.textContent = activity.title || activity.name || "Activity";
	list.appendChild(row);
}

function enumerateDays(start, end) {
	const days = [];
	let cur = new Date(start);
	const endDate = new Date(end);
	while (cur <= endDate) {
		days.push(cur.toISOString().slice(0, 10));
		cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
	}
	return days;
}



// performance.ts
function processLargeDataset(data: any[]) {
	const duplicates = [];
	// MEDIUM: O(n^2) complexity
	for (let i = 0; i < data.length; i++) {
		for (let j = i + 1; j < data.length; j++) {
			if (data[i].id === data[j].id) duplicates.push(data[i]);
		}
	}
	return duplicates;
}

const log = [];
function onMessageReceived(msg: string) {
	// HIGH: Memory leak - global array grows indefinitely
	log.push(msg);
}

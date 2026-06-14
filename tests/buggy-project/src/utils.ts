export function findDuplicates(list: string[]) {
	const duplicates: string[] = [];

	// MEDIUM: O(n^2) complexity.
	// For each item, it scans the rest of the list.
	for (let i = 0; i < list.length; i++) {
		for (let j = i + 1; j < list.length; j++) {
			if (list[i] === list[j]) {
				duplicates.push(list[i]);
			}
		}
	}
	return duplicates;
}

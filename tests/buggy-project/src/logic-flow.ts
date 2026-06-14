// logic-flow.ts
async function updateUserPreferences(prefs: any[]) {
	// HIGH: Race condition - forEach with async doesn't await
	prefs.forEach(async (p) => {
		await db.save(p);
	});
}

function calculateSum(arr: number[]) {
	let sum = 0;
	// MEDIUM: Off-by-one error
	for (let i = 0; i <= arr.length; i++) {
		sum += arr[i];
	}
	return sum;
}

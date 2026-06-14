// code-quality.ts
function calculateTax(amount: number) {
	const tax = amount * 0.15;
	// LOW: Redundant logic
	const finalTax = amount * 0.15;
	return finalTax;
}

function checkStatus(val: number) {
	// LOW: Magic number 42
	if (val === 42) return "Special";
	return "Normal";
}

export function processPayment(amount: number) {
	// LOW: Magic number
	if (amount > 5000) {
		return amount * 0.02;
	}
	return amount * 0.05;
}

function oldLegacyHelper() {
	// LOW: Dead code
	console.log("This function is never called");
}

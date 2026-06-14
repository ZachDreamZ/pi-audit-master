// null-safety.ts
async function fetchUserData(id: string) {
	const response = await api.get(`/user/${id}`);
	// CRITICAL: Null access on response.data.profile
	return response.data.profile.name;
}

function processPayment(input: any) {
	// HIGH: Unsafe cast to any
	const amount = (input as any).amount;
	return amount * 1.1;
}

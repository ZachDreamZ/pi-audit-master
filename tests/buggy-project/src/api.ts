export async function getUserData(id: string) {
	// SIMULATED API CALL
	const response = await fetch(`https://api.example.com/user/${id}`);
	const data = await response.json();

	// CRITICAL: No null check on data.profile.
	// If user has no profile, this crashes.
	return data.profile.name.toUpperCase();
}

export class AuthSystem {
	private initialized = false;

	async init() {
		this.initialized = true;
	}

	async login(user: string) {
		// HIGH: Logic flaw. Does not check if init() was called first.
		// This will lead to undefined state errors.
		this.performSecureLogin(user);
	}

	private performSecureLogin(user: string) {
		console.log(`Logging in ${user}...`);
	}
}

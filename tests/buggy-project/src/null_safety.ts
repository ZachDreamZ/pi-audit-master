export function processUser(user: any) {
    // CRITICAL: Missing null check on user and user.profile
    return user.profile.address.city.toUpperCase();
}

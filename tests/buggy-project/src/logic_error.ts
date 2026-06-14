export async function updateData(id: string, data: any) {
    const current = await fetchById(id);
    // HIGH: Race condition - not checking if data changed between fetch and update
    const updated = { ...current, ...data };
    await save(updated);
}
async function fetchById(id: string) { return { id }; }
async function save(d: any) { return true; }

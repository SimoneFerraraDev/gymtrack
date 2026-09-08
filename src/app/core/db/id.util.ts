/** Genera un id univoco per le entità salvate su IndexedDB. */
export function generateId(): string {
  return crypto.randomUUID();
}

// URL-safe, reasonably unique id without extra deps.
export function newId(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint8Array(12));
  const hex = Array.from(rand, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${Date.now().toString(36)}_${hex}`;
}


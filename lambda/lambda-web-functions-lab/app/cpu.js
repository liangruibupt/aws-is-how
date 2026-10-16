// Deterministic CPU burn: n rounds of SHA-like integer mixing.
// n = 1 is roughly 1 ms of single-core work on Graviton; tune via ?n=.
export function cpuBurn(n) {
  let h = 0x811c9dc5;
  const rounds = Math.max(1, Math.min(n, 5000)) * 60_000;
  for (let i = 0; i < rounds; i++) {
    h ^= i;
    h = Math.imul(h, 0x01000193) >>> 0;
    h = ((h << 13) | (h >>> 19)) >>> 0;
  }
  return h;
}

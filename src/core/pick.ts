/**
 * Tirage « aléatoire » mais reproductible.
 *
 * Le site tirait au sort un verbatim et trois vidéos à chaque build, ce qui
 * rendait le HTML produit non déterministe : impossible de comparer deux builds
 * pour vérifier une refonte, et churn inutile côté CDN. On garde la variété —
 * elle change d'une édition à l'autre — sans le non-déterminisme.
 */

/** FNV-1a 32 bits : une graine textuelle -> un entier. */
const hashSeed = (seed: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/** Mulberry32 : générateur pseudo-aléatoire déterministe, dans [0, 1[. */
const randomFrom = (seed: string): (() => number) => {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Mélange de Fisher-Yates, piloté par la graine. Ne modifie pas la source. */
export const shuffleWithSeed = <T>(items: readonly T[], seed: string): T[] => {
  const next = randomFrom(seed);
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/** `count` éléments distincts, toujours les mêmes pour une même graine. */
export const pickWithSeed = <T>(
  items: readonly T[],
  seed: string,
  count: number,
): T[] => shuffleWithSeed(items, seed).slice(0, count);

/** Un élément, toujours le même pour une même graine. */
export const pickOneWithSeed = <T>(
  items: readonly T[],
  seed: string,
): T | undefined => shuffleWithSeed(items, seed)[0];

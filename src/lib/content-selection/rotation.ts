/**
 * Daily Rotation Logic
 * Uses seeded random for consistent daily content selection
 */

/**
 * Get a seed based on today's date
 * Same day = same seed = same content selection
 */
export function getDailyRotationSeed(date: Date = new Date()): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

/**
 * Simple seeded random number generator (Mulberry32)
 * Deterministic: same seed produces same sequence
 */
function mulberry32(initialSeed: number): () => number {
  let seed = initialSeed
  return () => {
    seed = seed + 0x6d2b79f5
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t = t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Seeded shuffle using Fisher-Yates algorithm
 * Same seed = same shuffle result
 */
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array]
  const random = mulberry32(seed)

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

/**
 * Select N items from an array using seeded random
 * Items are shuffled first to ensure variety across days
 */
export function selectWithRotation<T>(items: T[], count: number, seed: number): T[] {
  if (items.length <= count) {
    return seededShuffle(items, seed)
  }
  return seededShuffle(items, seed).slice(0, count)
}

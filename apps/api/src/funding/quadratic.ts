/**
 * Quadratic funding math (Phase 10). The pool matches the BREADTH of support, not its size: a
 * creator backed by many small tips is matched far more than one backed by a single large tip.
 *
 * For creator j with contributions cᵢ from backers i (each with a sybil weight wᵢ ∈ (0,1]):
 *   Sⱼ      = Σ √(wᵢ · cᵢ)
 *   idealⱼ  = max(0, Sⱼ² − Σ cᵢ)          // the pool's top-up over what was actually raised
 * If Σ idealⱼ exceeds the pool budget, every match is scaled by α = budget / Σ ideal (capped QF).
 *
 * The sybil weight is a heuristic (see pool.ts) — honest about its limits: true sybil resistance
 * needs proof-of-personhood. All amounts are atomic USDC (6dp) as bigint; sqrt is done in a scaled
 * integer domain to stay precise without floats leaking into settlement.
 */

export interface Contribution {
  backer: string;
  amount: bigint; // atomic USDC
  weight: number; // sybil weight 0..1
}

export interface CreatorContributions {
  creator: string;
  resourceId?: string | null;
  label?: string;
  contributions: Contribution[];
}

export interface CreatorMatch {
  creator: string;
  resourceId?: string | null;
  label?: string;
  backers: number;
  raised: bigint; // Σ cᵢ (actually tipped)
  ideal: bigint; // pool top-up before scaling
  match: bigint; // pool top-up after α scaling (what gets paid)
  total: bigint; // raised + match
}

export interface RoundMatches {
  budget: bigint;
  alpha: number; // scaling factor applied (1 = pool not exhausted)
  idealTotal: bigint;
  matchTotal: bigint;
  creators: CreatorMatch[];
}

/** Integer sqrt of an atomic-USDC amount, returned in micro-root units (√base × 1000), so that
 *  (Σ root)² scales back to base units. √(c) where c is 6-dp base: rootScaled = floor(√(c · 1e6)). */
function rootScaled(amountBase: bigint, weight: number): bigint {
  // weight in [0,1] → scale amount by weight (basis points to stay integer)
  const wbps = BigInt(Math.max(0, Math.min(10_000, Math.round(weight * 10_000))));
  const weighted = (amountBase * wbps) / 10_000n;
  // √(weighted · 1e6) gives a value whose square ≈ weighted · 1e6; summing then squaring and
  // dividing by 1e6 returns base units.
  return isqrt(weighted * 1_000_000n);
}

function isqrt(n: bigint): bigint {
  if (n < 0n) throw new Error("isqrt of negative");
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

export function computeMatches(creators: CreatorContributions[], budget: bigint): RoundMatches {
  const ideals = creators.map((c) => {
    const raised = c.contributions.reduce((a, x) => a + x.amount, 0n);
    const sumRoot = c.contributions.reduce((a, x) => a + rootScaled(x.amount, x.weight), 0n);
    const squared = (sumRoot * sumRoot) / 1_000_000n; // back to base units
    const ideal = squared > raised ? squared - raised : 0n;
    return { c, raised, ideal };
  });

  const idealTotal = ideals.reduce((a, x) => a + x.ideal, 0n);
  // α scaling (integer, basis points) if the ideal total exceeds the budget.
  let alphaBps = 10_000n;
  if (idealTotal > budget && idealTotal > 0n) alphaBps = (budget * 10_000n) / idealTotal;

  const result: CreatorMatch[] = ideals.map(({ c, raised, ideal }) => {
    const match = (ideal * alphaBps) / 10_000n;
    return {
      creator: c.creator,
      resourceId: c.resourceId ?? null,
      label: c.label,
      backers: c.contributions.length,
      raised,
      ideal,
      match,
      total: raised + match,
    };
  });

  const matchTotal = result.reduce((a, x) => a + x.match, 0n);
  return {
    budget,
    alpha: Number(alphaBps) / 10_000,
    idealTotal,
    matchTotal,
    creators: result.sort((a, b) => (b.match > a.match ? 1 : b.match < a.match ? -1 : 0)),
  };
}

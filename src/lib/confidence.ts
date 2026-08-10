/**
 * Confidence engine (§26).
 *
 * Confidence = how confident Check First is that a set of records refers to the
 * SAME entity as what the user searched for. It is NOT a trustworthiness score.
 *
 * Model (documented & transparent):
 *  - Start from the user's provided signals ("what we can corroborate").
 *  - For each signal the candidate also carries: +weight if it matches,
 *    −penalty if it conflicts, nothing if the candidate is silent on it.
 *  - Sum, clamp to 5..97 (never claim 0% or 100% certainty).
 * Every point of the score is explained by an evidence line.
 */
import type { EntitySignal, EvidenceLine } from "@/types/core";

const WEIGHT: Record<EntitySignal["kind"], number> = {
  name: 35,
  middleName: 10,
  phone: 25,
  email: 25,
  abn: 30,
  acn: 25,
  business: 18,
  suburb: 12,
  state: 8,
  postcode: 12,
  employer: 15,
  occupation: 6,
  username: 15,
  website: 20,
};

const CONFLICT: Partial<Record<EntitySignal["kind"], number>> = {
  name: 30,
  middleName: 18,
  state: 15,
  suburb: 12,
  postcode: 12,
  business: 10,
};

const LABEL: Record<EntitySignal["kind"], string> = {
  name: "name",
  middleName: "middle name",
  phone: "phone number",
  email: "email address",
  abn: "ABN",
  acn: "ACN",
  business: "business",
  suburb: "suburb",
  state: "state",
  postcode: "postcode",
  employer: "employer",
  occupation: "occupation",
  username: "username",
  website: "website",
};

export interface ConfidenceResult {
  confidence: number;
  evidence: EvidenceLine[];
}

function norm(v: string): string {
  return v.trim().toLowerCase();
}

/**
 * Score a candidate's signals against the user's provided signals.
 */
export function scoreConfidence(userSignals: EntitySignal[], candidateSignals: EntitySignal[]): ConfidenceResult {
  const evidence: EvidenceLine[] = [];
  let score = 0;

  // Index candidate signals by kind → set of normalised values.
  const candByKind = new Map<string, Set<string>>();
  for (const s of candidateSignals) {
    if (!candByKind.has(s.kind)) candByKind.set(s.kind, new Set());
    candByKind.get(s.kind)!.add(norm(s.value));
  }

  // Extra credit per ADDITIONAL independently-corroborated value (multi-value
  // kinds only). Confidence rises from independent evidence, never merely
  // because the user typed several values (§16).
  const CORROBORATION_BONUS: Partial<Record<EntitySignal["kind"], number>> = { phone: 10, email: 10 };

  // Group the user's signals by kind → unique values.
  const userByKind = new Map<EntitySignal["kind"], string[]>();
  for (const us of userSignals) {
    const arr = userByKind.get(us.kind) ?? [];
    if (!arr.includes(norm(us.value))) arr.push(norm(us.value));
    userByKind.set(us.kind, arr);
  }

  for (const [kind, values] of userByKind) {
    const candValues = candByKind.get(kind);
    if (!candValues) {
      evidence.push({ polarity: "unknown", label: `${LABEL[kind]} not available on this record` });
      continue;
    }
    const matched = values.filter((v) => candValues.has(v));
    if (matched.length) {
      const bonus = (matched.length - 1) * (CORROBORATION_BONUS[kind] ?? 0);
      score += WEIGHT[kind] + bonus;
      const many = matched.length > 1;
      evidence.push({
        polarity: "match",
        label: many ? `${matched.length} ${LABEL[kind]}s independently match` : `${LABEL[kind]} matches`,
      });
    } else {
      const penalty = CONFLICT[kind] ?? 0;
      score -= penalty;
      evidence.push({
        polarity: penalty ? "conflict" : "unknown",
        label: penalty ? `${LABEL[kind]} differs` : `${LABEL[kind]} not confirmed`,
      });
    }
  }

  const confidence = Math.max(5, Math.min(97, Math.round(score)));
  // Sort evidence: matches first, then conflicts, then unknowns.
  const order = { match: 0, conflict: 1, unknown: 2 } as const;
  evidence.sort((a, b) => order[a.polarity] - order[b.polarity]);
  return { confidence, evidence };
}

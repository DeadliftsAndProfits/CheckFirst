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

  const seenKinds = new Set<string>();
  for (const us of userSignals) {
    if (seenKinds.has(us.kind)) continue; // one line per kind
    seenKinds.add(us.kind);
    const candValues = candByKind.get(us.kind);
    if (!candValues) {
      evidence.push({ polarity: "unknown", label: `${LABEL[us.kind]} not available on this record` });
      continue;
    }
    if (candValues.has(norm(us.value))) {
      score += WEIGHT[us.kind];
      evidence.push({ polarity: "match", label: `${LABEL[us.kind]} matches` });
    } else {
      const penalty = CONFLICT[us.kind] ?? 0;
      score -= penalty;
      evidence.push({
        polarity: penalty ? "conflict" : "unknown",
        label: penalty ? `${LABEL[us.kind]} differs` : `${LABEL[us.kind]} not confirmed`,
      });
    }
  }

  const confidence = Math.max(5, Math.min(97, Math.round(score)));
  // Sort evidence: matches first, then conflicts, then unknowns.
  const order = { match: 0, conflict: 1, unknown: 2 } as const;
  evidence.sort((a, b) => order[a.polarity] - order[b.polarity]);
  return { confidence, evidence };
}

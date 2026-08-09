/**
 * Entity resolution (§25).
 *
 * We do NOT assume that identical names describe the same person. We cluster
 * result items that carry entity signals by their strongest shared identifier,
 * then score each cluster's confidence against what the user told us.
 */
import type { Candidate, EntitySignal, ProviderResult } from "@/types/core";
import { scoreConfidence } from "./confidence";

// Only STRONG, near-unique identifiers may merge two records into one entity.
// Name or business alone must NOT merge distinct records (§25: identical names
// do not imply the same person). Records lacking a strong id stay separate.
const STRONG_IDS: EntitySignal["kind"][] = ["abn", "acn", "email", "phone", "username"];

function clusterKey(signals: EntitySignal[], ref: string): string {
  for (const kind of STRONG_IDS) {
    const s = signals.find((x) => x.kind === kind);
    if (s) return `${kind}:${s.value.trim().toLowerCase()}`;
  }
  // No strong identifier → this record is its own candidate.
  return `ref:${ref}`;
}

function titleFrom(signals: EntitySignal[]): { name: string; subtitle?: string } {
  const business = signals.find((s) => s.kind === "business");
  const name = signals.find((s) => s.kind === "name");
  const abn = signals.find((s) => s.kind === "abn");
  const loc = [signals.find((s) => s.kind === "suburb")?.value, signals.find((s) => s.kind === "state")?.value]
    .filter(Boolean)
    .join(" ");
  // Prefer a person's name; fall back to the business name, then ABN.
  const displayName = titleCase(name?.value) || business?.value?.toUpperCase() || abn?.value || "Possible match";
  // If we led with a person's name, surface the business in the subtitle too.
  const businessSub = name && business ? titleCase(business.value) : "";
  const subtitleParts = [loc, businessSub, abn ? `ABN ${abn.value}` : ""].filter(Boolean);
  return { name: displayName, subtitle: subtitleParts.join(" · ") || undefined };
}

function titleCase(s?: string): string | undefined {
  if (!s) return undefined;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function resolveCandidates(userSignals: EntitySignal[], providers: ProviderResult[]): Candidate[] {
  // Gather (item signals, ref) for every result item that carries signals.
  const clusters = new Map<string, { signals: EntitySignal[]; refs: string[]; demo: boolean }>();

  for (const p of providers) {
    p.results.forEach((item, i) => {
      if (!item.signals?.length) return;
      const ref = `${p.provider}#${i}`;
      const key = clusterKey(item.signals, ref);
      const existing = clusters.get(key);
      if (existing) {
        existing.signals.push(...item.signals);
        existing.refs.push(ref);
        existing.demo = existing.demo || Boolean(item.demo);
      } else {
        clusters.set(key, { signals: [...item.signals], refs: [ref], demo: Boolean(item.demo) });
      }
    });
  }

  const candidates: Candidate[] = [];
  let idx = 0;
  for (const [, cluster] of clusters) {
    const { confidence, evidence } = scoreConfidence(userSignals, cluster.signals);
    const { name, subtitle } = titleFrom(cluster.signals);
    candidates.push({
      id: `cand-${idx++}`,
      displayName: name,
      subtitle,
      confidence,
      evidence,
      resultRefs: cluster.refs,
      demo: cluster.demo || undefined,
    });
  }

  // Highest identity confidence first.
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates;
}

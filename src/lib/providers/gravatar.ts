/**
 * Gravatar provider (real, no credentials) — email → public profile/avatar.
 *
 * Gravatar exposes a public profile keyed by the md5 of the lowercased email.
 * We report only that a PUBLIC profile/avatar exists and link to it — never any
 * private data. This is a genuine network query per supplied address.
 */
import { createHash } from "node:crypto";
import type { ResultItem, EntitySignal } from "@/types/core";
import { type Provider, type ProviderContext, buildResult, ok, fetchWithTimeout } from "./base";

interface GravatarProfile {
  entry?: {
    displayName?: string;
    preferredUsername?: string;
    profileUrl?: string;
    accounts?: { shortname?: string; url?: string; display?: string }[];
  }[];
}

function md5(s: string): string {
  return createHash("md5").update(s.trim().toLowerCase()).digest("hex");
}

export const gravatarProvider: Provider = {
  id: "gravatar",
  label: "Gravatar public profile",
  category: "online",
  sourceClass: "discovery",
  dataOrigin: "live",
  appliesTo(ctx) {
    return Boolean(ctx.normalised.emails || ctx.normalised.email);
  },
  async run(ctx: ProviderContext) {
    const emails = (ctx.normalised.emails ?? ctx.normalised.email ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    const results: ResultItem[] = [];
    const warnings: string[] = [];
    for (const email of emails) {
      const hash = md5(email);
      try {
        const res = await fetchWithTimeout(`https://en.gravatar.com/${hash}.json`, {
          timeoutMs: 7000,
          parentSignal: ctx.signal,
          headers: { Accept: "application/json" },
        });
        if (res.status === 404) continue; // genuinely no public profile for this address
        if (!res.ok) {
          warnings.push(`${email}: Gravatar HTTP ${res.status}`);
          continue;
        }
        const data = (await res.json()) as GravatarProfile;
        const entry = data.entry?.[0];
        if (!entry) continue;
        const signals: EntitySignal[] = [];
        if (entry.preferredUsername) signals.push({ kind: "username", value: entry.preferredUsername.toLowerCase() });
        const accounts = (entry.accounts ?? []).map((a) => a.display || a.shortname || a.url).filter(Boolean) as string[];
        results.push({
          title: `Public Gravatar profile for ${email}`,
          detail: [entry.displayName ? `Display name: ${entry.displayName}` : null, accounts.length ? `Linked public accounts: ${accounts.join(", ")}` : null]
            .filter(Boolean)
            .join(" · ") || "A public Gravatar profile exists for this address.",
          sourceClass: "discovery",
          sourceUrl: entry.profileUrl || `https://gravatar.com/${hash}`,
          fields: {
            Address: email,
            ...(entry.displayName ? { "Display name": entry.displayName } : {}),
            ...(entry.preferredUsername ? { Username: entry.preferredUsername } : {}),
            ...(accounts.length ? { "Linked accounts": accounts.join(", ") } : {}),
          },
          signals: signals.length ? signals : undefined,
        });
      } catch (err) {
        warnings.push(`${email}: ${err instanceof Error ? err.message : "Gravatar error"}`);
      }
    }

    if (!results.length) {
      return buildResult({
        provider: gravatarProvider,
        status: warnings.length ? "unavailable" : "no_results",
        query: emails.join(", "),
        warnings: warnings.length ? warnings : ["No public Gravatar profile found for the supplied address(es)"],
      });
    }
    return ok(gravatarProvider, emails.join(", "), results, {
      sourceAuthority: "Gravatar",
      cacheSeconds: 6 * 3600,
      warnings,
    });
  },
};

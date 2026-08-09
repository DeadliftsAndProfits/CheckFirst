/**
 * DNS & mail-configuration provider (real, no credentials).
 *
 * Reads public DNS records for a domain: A/AAAA, MX, NS, SPF (TXT), and DMARC
 * (_dmarc TXT). Applies to Website and Email modes, and to Business when a
 * website was supplied. Read-only DNS queries — no connection to the host.
 */
import { Resolver } from "node:dns/promises";
import type { ResultItem } from "@/types/core";
import { type Provider, type ProviderContext, buildResult, ok } from "./base";

function targetDomain(n: Record<string, string>): string | undefined {
  return n.domain || n.website || n.emailDomain;
}

async function settle<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

export const dnsProvider: Provider = {
  id: "dns",
  label: "DNS & mail records",
  category: "website",
  sourceClass: "authoritative",
  appliesTo(ctx) {
    return Boolean(targetDomain(ctx.normalised));
  },
  async run(ctx: ProviderContext) {
    const domain = targetDomain(ctx.normalised)!;
    const resolver = new Resolver({ timeout: 5000, tries: 2 });

    const [a, aaaa, mx, ns, txt, dmarc] = await Promise.all([
      settle(resolver.resolve4(domain)),
      settle(resolver.resolve6(domain)),
      settle(resolver.resolveMx(domain)),
      settle(resolver.resolveNs(domain)),
      settle(resolver.resolveTxt(domain)),
      settle(resolver.resolveTxt(`_dmarc.${domain}`)),
    ]);

    const results: ResultItem[] = [];
    const flatTxt = (txt ?? []).map((chunks) => chunks.join(""));
    const spf = flatTxt.find((t) => /^v=spf1/i.test(t));
    const dmarcRecord = (dmarc ?? []).map((c) => c.join("")).find((t) => /^v=DMARC1/i.test(t));

    if (a?.length || aaaa?.length) {
      results.push({
        title: "Hosting (A/AAAA records)",
        detail: [...(a ?? []), ...(aaaa ?? [])].join(", "),
        sourceClass: "authoritative",
        fields: { IPv4: (a ?? []).join(", ") || "—", IPv6: (aaaa ?? []).join(", ") || "—" },
      });
    }
    if (mx?.length) {
      const hosts = mx.sort((x, y) => x.priority - y.priority).map((m) => `${m.exchange} (${m.priority})`);
      results.push({
        title: "Mail servers (MX)",
        detail: hosts.join(", "),
        sourceClass: "authoritative",
        fields: { Providers: inferMailProvider(mx.map((m) => m.exchange)) },
      });
    }
    if (ns?.length) {
      results.push({ title: "Name servers (NS)", detail: ns.join(", "), sourceClass: "authoritative" });
    }
    results.push({
      title: "Email authentication",
      detail: `SPF: ${spf ? "present" : "not found"} · DMARC: ${dmarcRecord ? "present" : "not found"}`,
      sourceClass: "authoritative",
      fields: {
        SPF: spf ?? "Not published",
        DMARC: dmarcRecord ?? "Not published",
      },
    });

    if (!a?.length && !aaaa?.length && !mx?.length && !ns?.length) {
      return buildResult({
        provider: dnsProvider,
        status: "no_results",
        query: domain,
        warnings: ["No public DNS records resolved for this domain"],
      });
    }

    return ok(dnsProvider, domain, results, {
      sourceAuthority: "Public DNS",
      cacheSeconds: 3600,
    });
  },
};

function inferMailProvider(exchanges: string[]): string {
  const j = exchanges.join(" ").toLowerCase();
  if (j.includes("google") || j.includes("googlemail")) return "Google Workspace";
  if (j.includes("outlook") || j.includes("protection.outlook")) return "Microsoft 365";
  if (j.includes("pphosted") || j.includes("proofpoint")) return "Proofpoint";
  if (j.includes("mimecast")) return "Mimecast";
  if (j.includes("zoho")) return "Zoho";
  return "Self-hosted / other";
}

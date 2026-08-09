/**
 * SSL/TLS certificate provider (real, no credentials).
 *
 * Opens a TLS connection to the host on 443 and inspects the presented
 * certificate: subject, issuer, validity dates, SANs. SSRF-guarded: we refuse
 * to connect to private/loopback/metadata targets (§30).
 */
import tls from "node:tls";
import type { ResultItem } from "@/types/core";
import { type Provider, type ProviderContext, buildResult, ok, fail } from "./base";
import { assertPublicHost } from "@/lib/security/ssrf";

interface PeerCert {
  subject?: { CN?: string; O?: string };
  issuer?: { CN?: string; O?: string };
  valid_from?: string;
  valid_to?: string;
  subjectaltname?: string;
}

function connect(host: string, timeoutMs: number): Promise<PeerCert> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host, port: 443, servername: host, timeout: timeoutMs, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert || Object.keys(cert).length === 0) reject(new Error("No certificate presented"));
        else resolve(cert as PeerCert);
      },
    );
    socket.on("error", reject);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("TLS connection timed out"));
    });
  });
}

export const tlsProvider: Provider = {
  id: "tls",
  label: "SSL/TLS certificate",
  category: "website",
  sourceClass: "authoritative",
  appliesTo(ctx) {
    return Boolean(ctx.normalised.website || ctx.normalised.domain);
  },
  async run(ctx: ProviderContext) {
    const host = ctx.normalised.website || ctx.normalised.domain!;
    const guard = await assertPublicHost(host);
    if (!guard.safe) {
      return buildResult({
        provider: tlsProvider,
        status: "unavailable",
        query: host,
        warnings: [`Skipped for safety: ${guard.reason}`],
      });
    }

    let cert: PeerCert;
    try {
      cert = await connect(host, 7000);
    } catch (err) {
      return fail(tlsProvider, host, err instanceof Error ? err.message : "TLS error");
    }

    const validTo = cert.valid_to ? new Date(cert.valid_to) : undefined;
    const validFrom = cert.valid_from ? new Date(cert.valid_from) : undefined;
    const now = new Date();
    const expired = validTo ? validTo < now : false;
    const sans = (cert.subjectaltname ?? "")
      .split(",")
      .map((s) => s.replace(/^DNS:/i, "").trim())
      .filter(Boolean);

    const item: ResultItem = {
      title: "HTTPS certificate",
      detail: `Issued by ${cert.issuer?.O ?? cert.issuer?.CN ?? "unknown"}${expired ? " — EXPIRED" : ""}`,
      sourceClass: "authoritative",
      sourceUrl: `https://${host}`,
      fields: {
        "Common name": cert.subject?.CN ?? "—",
        Organisation: cert.subject?.O ?? "Not in certificate",
        Issuer: cert.issuer?.O ?? cert.issuer?.CN ?? "—",
        "Valid from": validFrom ? validFrom.toISOString().slice(0, 10) : "—",
        "Valid to": validTo ? validTo.toISOString().slice(0, 10) : "—",
        Status: expired ? "Expired" : "Valid",
        "Covers hosts": sans.slice(0, 8).join(", ") || host,
      },
    };

    return ok(tlsProvider, host, [item], {
      sourceUrl: `https://${host}`,
      sourceAuthority: "TLS certificate",
      cacheSeconds: 3600,
      warnings: expired ? ["Certificate is expired"] : [],
    });
  },
};

/**
 * SSRF protection for the Website search mode (§30).
 *
 * Before we ever resolve or connect to a user-supplied host, we must ensure it
 * is not pointing at localhost, loopback, private, link-local, or cloud
 * metadata addresses. We resolve the hostname to its IPs and reject if ANY
 * resolved address is in a blocked range (defence against DNS rebinding).
 */
import { lookup } from "node:dns/promises";
import net from "node:net";

export interface SsrfCheck {
  safe: boolean;
  reason?: string;
  addresses?: string[];
}

/** Parse an IPv4 dotted string into its 4 octets, or null. */
function ipv4Octets(ip: string): number[] | null {
  if (net.isIPv4(ip)) return ip.split(".").map(Number);
  // IPv4-mapped IPv6 (::ffff:1.2.3.4)
  const m = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (m && net.isIPv4(m[1])) return m[1].split(".").map(Number);
  return null;
}

export function isBlockedIp(ip: string): boolean {
  const v4 = ipv4Octets(ip);
  if (v4) {
    const [a, b] = v4;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local + AWS metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0) return true; // 192.0.0.0/24 special
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  // IPv6
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower === "::") return true;
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    if (lower.startsWith("fec0")) return true; // deprecated site-local
    if (lower.startsWith("ff")) return true; // multicast
    return false;
  }
  // Not a parseable IP → treat as unsafe.
  return true;
}

/**
 * Resolve a hostname and verify every address is public. Returns unsafe if the
 * host doesn't resolve or resolves to any blocked address.
 */
export async function assertPublicHost(hostname: string): Promise<SsrfCheck> {
  const host = hostname.trim().toLowerCase();
  if (!host) return { safe: false, reason: "Empty host" };

  // Obvious literals we never touch.
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    return { safe: false, reason: "Host is a local/internal name" };
  }
  // Direct IP literals.
  if (net.isIP(host)) {
    return isBlockedIp(host)
      ? { safe: false, reason: "IP address is in a private/reserved range" }
      : { safe: true, addresses: [host] };
  }

  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    return { safe: false, reason: "Host does not resolve" };
  }
  if (!addrs.length) return { safe: false, reason: "Host does not resolve" };

  const addresses = addrs.map((a) => a.address);
  for (const a of addresses) {
    if (isBlockedIp(a)) {
      return { safe: false, reason: "Host resolves to a private/reserved address", addresses };
    }
  }
  return { safe: true, addresses };
}

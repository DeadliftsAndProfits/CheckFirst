import { describe, it, expect } from "vitest";
import { isBlockedIp, assertPublicHost } from "@/lib/security/ssrf";

describe("isBlockedIp (§30)", () => {
  it("blocks loopback, private, link-local, metadata, multicast", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.5",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254", // AWS/GCP metadata
      "100.64.0.1", // CGNAT
      "0.0.0.0",
      "224.0.0.1", // multicast
      "::1",
      "fe80::1",
      "fc00::1",
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("allows genuine public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("blocks IPv4-mapped IPv6 loopback", () => {
    expect(isBlockedIp("::ffff:127.0.0.1")).toBe(true);
  });
});

describe("assertPublicHost", () => {
  it("rejects literal private IP hosts", async () => {
    expect((await assertPublicHost("127.0.0.1")).safe).toBe(false);
    expect((await assertPublicHost("192.168.0.1")).safe).toBe(false);
  });
  it("rejects local names", async () => {
    expect((await assertPublicHost("localhost")).safe).toBe(false);
    expect((await assertPublicHost("db.internal")).safe).toBe(false);
  });
  it("allows a public IP literal", async () => {
    expect((await assertPublicHost("8.8.8.8")).safe).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { normaliseUrl, registrableDomain } from "@/lib/validation/url";

describe("normaliseUrl", () => {
  it("adds https to a bare domain", () => {
    const u = normaliseUrl("example.com.au");
    expect(u.valid).toBe(true);
    expect(u.origin).toBe("https://example.com.au");
    expect(u.hostname).toBe("example.com.au");
  });

  it("keeps path & query", () => {
    const u = normaliseUrl("http://Foo.COM/path?a=1");
    expect(u.hostname).toBe("foo.com");
    expect(u.href).toBe("https://foo.com/path?a=1");
  });

  it("rejects rubbish and IPs", () => {
    expect(normaliseUrl("").valid).toBe(false);
    expect(normaliseUrl("not a domain").valid).toBe(false);
    expect(normaliseUrl("192.168.0.1").valid).toBe(false);
  });

  it("computes AU registrable domain", () => {
    expect(registrableDomain("www.abc.com.au")).toBe("abc.com.au");
    expect(registrableDomain("mail.google.com")).toBe("google.com");
    expect(registrableDomain("qld.gov.au")).toBe("qld.gov.au");
  });
});

/**
 * Australian Business Register / ABN Lookup provider (§12).
 *
 * Uses the free ABR web services (JSON endpoints). Requires a registration GUID
 * in ABR_GUID; without it we return not_configured honestly. Authoritative.
 *
 * Endpoints (public, GUID-authenticated):
 *   AbnDetails.aspx?abn={abn}&guid={guid}         — lookup by ABN
 *   MatchingNames.aspx?name={name}&guid={guid}    — search by name
 * Both return JSONP; we strip the callback wrapper.
 */
import type { ResultItem } from "@/types/core";
import { type Provider, type ProviderContext, buildResult, ok, notConfigured, fetchWithTimeout } from "./base";
import { config } from "@/lib/config";

interface AbrDetails {
  Abn?: string;
  AbnStatus?: string;
  EntityName?: string;
  EntityTypeName?: string;
  Gst?: string;
  AddressState?: string;
  AddressPostcode?: string;
  BusinessName?: string[];
  Message?: string;
}
interface AbrNameMatch {
  Names?: { Name: string; Abn: string; State: string; Postcode: string; NameType: string; Score: number }[];
  Message?: string;
}

function stripJsonp(text: string): string {
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  if (start >= 0 && end > start) return text.slice(start + 1, end);
  return text;
}

export const abnProvider: Provider = {
  id: "abn",
  label: "Australian Business Register (ABN Lookup)",
  category: "business",
  sourceClass: "authoritative",
  dataOrigin: "live",
  appliesTo(ctx) {
    const n = ctx.normalised;
    return Boolean(n.abn || n.businessName || (ctx.input.type === "business"));
  },
  async run(ctx: ProviderContext) {
    const n = ctx.normalised;
    const guid = config.abr.guid;
    const query = n.abn || n.businessName || "";

    if (!guid) {
      return notConfigured(
        abnProvider,
        query,
        "ABN Lookup needs a free ABR GUID (set ABR_GUID). Register at abr.business.gov.au/Tools/WebServices.",
      );
    }
    if (!query) {
      return buildResult({ provider: abnProvider, status: "no_results", query: "" });
    }

    try {
      if (n.abn) {
        const abn = n.abn.replace(/\s/g, "");
        const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=${guid}`;
        const res = await fetchWithTimeout(url, { timeoutMs: 8000, parentSignal: ctx.signal });
        const data = JSON.parse(stripJsonp(await res.text())) as AbrDetails;
        if (data.Message || !data.Abn) {
          return buildResult({ provider: abnProvider, status: "no_results", query, warnings: data.Message ? [data.Message] : [] });
        }
        return ok(abnProvider, query, [detailsToItem(data)], {
          sourceUrl: `https://abr.business.gov.au/ABN/View?abn=${abn}`,
          sourceAuthority: "Australian Business Register",
          cacheSeconds: 24 * 3600,
        });
      }
      // Search by name.
      const url = `https://abr.business.gov.au/json/MatchingNames.aspx?name=${encodeURIComponent(n.businessName!)}&guid=${guid}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 8000, parentSignal: ctx.signal });
      const data = JSON.parse(stripJsonp(await res.text())) as AbrNameMatch;
      const names = (data.Names ?? []).slice(0, 8);
      if (!names.length) {
        return buildResult({ provider: abnProvider, status: "no_results", query });
      }
      const items: ResultItem[] = names.map((m) => ({
        title: m.Name,
        detail: `ABN ${m.Abn} · ${m.State} ${m.Postcode} · match score ${m.Score}`,
        sourceClass: "authoritative",
        sourceUrl: `https://abr.business.gov.au/ABN/View?abn=${m.Abn}`,
        fields: { ABN: m.Abn, State: m.State, Postcode: m.Postcode, Type: m.NameType },
        signals: [
          { kind: "business", value: m.Name.toLowerCase() },
          { kind: "abn", value: m.Abn },
          ...(m.State ? [{ kind: "state" as const, value: m.State }] : []),
        ],
      }));
      return ok(abnProvider, query, items, {
        sourceUrl: `https://abr.business.gov.au/`,
        sourceAuthority: "Australian Business Register",
        cacheSeconds: 6 * 3600,
      });
    } catch (err) {
      return buildResult({
        provider: abnProvider,
        status: "error",
        query,
        error: err instanceof Error ? err.message : "ABR request failed",
      });
    }
  },
};

function detailsToItem(d: AbrDetails): ResultItem {
  const fields: Record<string, string> = {
    ABN: d.Abn ?? "—",
    Status: d.AbnStatus ?? "—",
    Entity: d.EntityName ?? "—",
    Type: d.EntityTypeName ?? "—",
    GST: d.Gst ? `Registered from ${d.Gst}` : "Not registered",
    Location: [d.AddressState, d.AddressPostcode].filter(Boolean).join(" ") || "—",
  };
  if (d.BusinessName?.length) fields["Business names"] = d.BusinessName.slice(0, 6).join(", ");
  return {
    title: d.EntityName ?? "ABN record",
    detail: `${d.EntityTypeName ?? "Entity"} · ABN ${d.AbnStatus ?? ""}`,
    sourceClass: "authoritative",
    sourceUrl: d.Abn ? `https://abr.business.gov.au/ABN/View?abn=${d.Abn}` : undefined,
    fields,
    signals: [
      ...(d.EntityName ? [{ kind: "business" as const, value: d.EntityName.toLowerCase() }] : []),
      ...(d.Abn ? [{ kind: "abn" as const, value: d.Abn }] : []),
      ...(d.AddressState ? [{ kind: "state" as const, value: d.AddressState }] : []),
      ...(d.AddressPostcode ? [{ kind: "postcode" as const, value: d.AddressPostcode }] : []),
    ],
  };
}

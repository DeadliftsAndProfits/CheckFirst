/**
 * Provider registry. The single list the orchestrator selects from.
 */
import type { Provider } from "./base";
import { dnsProvider } from "./dns";
import { tlsProvider } from "./tls";
import { ctProvider } from "./ct";
import { rdapProvider } from "./rdap";
import { webContentProvider } from "./webcontent";
import { abnProvider } from "./abn";
import { webSearchProvider } from "./websearch";
import { hibpProvider } from "./hibp";
import { gravatarProvider } from "./gravatar";
import { searchLinksProvider, courtsProvider, licencesProvider, professionalProvider } from "./discovery";

/** All real providers, in a sensible display/priority order (§36). */
export const providers: Provider[] = [
  // Authoritative business / identity first.
  abnProvider,
  licencesProvider,
  professionalProvider,
  // Technical website/domain authority.
  dnsProvider,
  rdapProvider,
  tlsProvider,
  ctProvider,
  webContentProvider,
  // Contact / breach.
  hibpProvider,
  gravatarProvider,
  // Web & social discovery (links, not searches).
  webSearchProvider,
  searchLinksProvider,
  courtsProvider,
];

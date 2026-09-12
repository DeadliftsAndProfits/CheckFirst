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
import { xposedOrNotProvider } from "./xposedornot";
import { leakCheckProvider } from "./leakcheck";
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
  // Contact / breach. Free, no-key breach indexes run first (they work for
  // every user); HIBP stays available if an API key is ever configured.
  xposedOrNotProvider,
  leakCheckProvider,
  hibpProvider,
  gravatarProvider,
  // Web & social discovery (links, not searches).
  webSearchProvider,
  searchLinksProvider,
  courtsProvider,
];

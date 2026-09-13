/** Web-search engine registry + configured ordering (milestone §13). */
import { config } from "@/lib/config";
import { braveEngine } from "./engines/brave";
import { youEngine } from "./engines/you";
import { tavilyEngine } from "./engines/tavily";
import type { WebEngine, WebEngineId } from "./types";

export const engines: Record<WebEngineId, WebEngine> = {
  brave: braveEngine,
  you: youEngine,
  tavily: tavilyEngine,
};

/** Engines in configured SEARCH_PROVIDER_ORDER, ignoring unknown ids. */
export function orderedEngines(): WebEngine[] {
  const seen = new Set<string>();
  const out: WebEngine[] = [];
  for (const id of config.search.order()) {
    const e = engines[id as WebEngineId];
    if (e && !seen.has(id)) {
      seen.add(id);
      out.push(e);
    }
  }
  return out;
}

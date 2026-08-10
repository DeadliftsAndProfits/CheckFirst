"use client";

/**
 * Client-side handoff store for the hero → /search navigation (§9, §10).
 *
 * The search payload is kept in memory (instant client transitions) and
 * mirrored to sessionStorage (survives refresh / direct load of /search). It is
 * deliberately NOT placed in the URL — names, phones and emails must never end
 * up in query strings (§10).
 */
import type { SearchInput } from "@/types/core";

const KEY = "checkfirst:pending-search";
let memory: SearchInput | null = null;

export function setPendingSearch(input: SearchInput): void {
  memory = input;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(input));
  } catch {
    /* storage may be unavailable; memory still works for this navigation */
  }
}

export function readPendingSearch(): SearchInput | null {
  if (memory) return memory;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      memory = JSON.parse(raw) as SearchInput;
      return memory;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPendingSearch(): void {
  memory = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

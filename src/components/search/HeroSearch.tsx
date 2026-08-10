"use client";

import { useRouter } from "next/navigation";
import { SearchForm } from "./SearchForm";
import { setPendingSearch } from "@/lib/client/searchStore";
import type { SearchInput } from "@/types/core";

/**
 * The hero search card. It is an *entry* tool: on submit it stores the payload
 * (not in the URL) and hands off to the dedicated /search workspace, which
 * auto-starts the investigation. No results are shown in the hero.
 */
export function HeroSearch() {
  const router = useRouter();
  const start = (input: SearchInput) => {
    setPendingSearch(input);
    router.push("/search");
  };
  return <SearchForm submitLabel="Check first" autoFocus onSubmit={start} />;
}

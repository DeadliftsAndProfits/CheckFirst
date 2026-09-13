/**
 * Snippet/title cleaner shared by every web-search engine.
 *
 * Search engines return snippets with <strong> highlights and HTML entities;
 * some return a placeholder for pages (e.g. LinkedIn) that block snippet text.
 * We strip markup and drop the placeholder so downstream logic sees clean text.
 */
export function clean(s: string): string {
  const out = (s ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/^we cannot provide a description for this page/i.test(out)) return "";
  return out;
}

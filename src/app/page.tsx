import { Header } from "@/components/Header";
import { HeroSearch } from "@/components/search/HeroSearch";
import { Icon } from "@/components/Icon";

const INDICATORS = [
  { icon: "user", label: "Verify identities" },
  { icon: "briefcase", label: "Check businesses" },
  { icon: "shield", label: "Check licences" },
  { icon: "search", label: "Find public information" },
];

const HOW = [
  { n: 1, t: "Enter what you know", d: "A name, business, phone, email or website — plus any extra details you have." },
  { n: 2, t: "We check public sources", d: "Business registers, licences, domains, web and public records run in parallel." },
  { n: 3, t: "Review matches & evidence", d: "See possible matches, how confident we are they're the same entity, and where each fact came from." },
];

const WHAT = [
  { icon: "user", t: "Person", d: "Names, locations, employers and public references." },
  { icon: "briefcase", t: "Business & tradie", d: "ABN/ACN status, business names, trade licences." },
  { icon: "phone", t: "Phone", d: "Australian & international numbers, public listings." },
  { icon: "mail", t: "Email", d: "Public references and breach status (never passwords)." },
  { icon: "globe", t: "Website", d: "DNS, certificates, registration age and identity." },
  { icon: "shield", t: "Licences", d: "Builders, electricians, plumbers and professionals." },
];

const USES = ["Dating", "Hiring a tradie", "Marketplace purchases", "Suspicious calls", "Suspicious emails", "Business verification"];

const FAQ = [
  {
    q: "Is this a criminal-history check?",
    a: "No. Check First searches publicly available information. Publicly indexed court or tribunal decisions are not a criminal-history check and never prove the absence of a record.",
  },
  {
    q: "Where does the information come from?",
    a: "From public sources — the Australian Business Register, licensing authorities, DNS and certificate records, public web search, and official registers. Every result shows its source, when it was retrieved, and whether it's authoritative or a discovery pointer.",
  },
  { q: "Does someone know I searched them?", a: "No. Searches look at public information and do not notify the person or business you're checking." },
  {
    q: "Can Check First guarantee someone is safe?",
    a: "No. We present evidence from public sources and how confident we are that records refer to the same entity. We never label anyone safe, dangerous, or trustworthy — you decide what the evidence means.",
  },
  {
    q: "Why are some sources unavailable?",
    a: "Some sources need an API key or aren't yet connected. Rather than fake a result, Check First clearly marks those sources as 'not configured' or 'unavailable' and continues with the rest.",
  },
  { q: "How long is a search stored?", a: "Searches run in-memory to build your report and are not kept as a permanent dossier. Public/open datasets may be cached briefly to stay fast." },
  { q: "How can incorrect information be reported?", a: "Public information can be wrong or out of date. The authoritative source shown next to each fact is the place to request a correction." },
];

export default function Home() {
  return (
    <div id="top">
      <Header />

      {/* HERO */}
      <section id="search" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/70 via-white to-white" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
          {/* Left: marketing */}
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700">
              <Icon name="shield" size={13} /> Australian-first · public information
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
              Know before <br className="hidden sm:block" />you trust.
            </h1>
            <p className="mt-4 max-w-md text-lg text-ink-muted">
              Check First searches publicly available information to help you verify people and businesses before you decide whether to engage with them.
            </p>
            <ul className="mt-6 grid max-w-md grid-cols-2 gap-3">
              {INDICATORS.map((i) => (
                <li key={i.label} className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm ring-1 ring-slate-200">
                    <Icon name={i.icon} size={16} />
                  </span>
                  {i.label}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm font-medium text-ink-muted">
              Check first before you pay. Check first before you hire. Check first before you meet.
            </p>
          </div>

          {/* Right: interactive search card */}
          <div className="animate-fade-up">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lift sm:p-6">
              <HeroSearch />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-t border-slate-100 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-ink">How Check First works</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {HOW.map((s) => (
              <div key={s.n} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-bold text-white">{s.n}</span>
                <h3 className="mt-3 font-semibold text-ink">{s.t}</h3>
                <p className="mt-1 text-sm text-ink-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE CHECK */}
      <section id="what" className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-ink">What can I check?</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT.map((w) => (
              <div key={w.t} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name={w.icon} size={18} />
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{w.t}</h3>
                  <p className="text-sm text-ink-muted">{w.d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Common uses</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {USES.map((u) => (
                <span key={u} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-ink-soft shadow-sm">
                  {u}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY */}
      <section id="privacy" className="bg-white py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-ink">Privacy</h2>
          <div className="mt-4 space-y-3 text-ink-muted">
            <p>
              Check First is built around public information and privacy by design. We search only publicly available sources, keep secrets on the server,
              and don't build a permanent dossier of the people you look up.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                "Searches run in-memory to build your report",
                "The person you check is not notified",
                "No passwords, credentials or breach contents are ever shown",
                "Every fact links to its public source",
                "Website checks block private/internal network targets",
                "Requests are rate-limited to prevent bulk harvesting",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm">
                  <Icon name="check" size={15} className="mt-0.5 shrink-0 text-trust-600" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm">
              Public information can be inaccurate or out of date. Check First shows you the evidence and its source — it does not decide whether anyone is
              safe or trustworthy.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-slate-50 py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-ink">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink">
                  {f.q}
                  <Icon name="chevron" size={18} className="text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-ink-muted sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-white">
              <Icon name="shield" size={13} />
            </span>
            <span className="font-semibold text-ink">Check First</span>
            <span className="text-slate-400">· Know before you trust.</span>
          </div>
          <p className="text-xs text-slate-400">Public information only · not a criminal-history or background-screening service.</p>
        </div>
      </footer>
    </div>
  );
}

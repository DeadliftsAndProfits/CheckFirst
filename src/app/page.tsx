import { Header } from "@/components/Header";
import { HeroSearch } from "@/components/search/HeroSearch";
import { Icon } from "@/components/Icon";
import { SourceGraph } from "@/components/marketing/SourceGraph";

const INDICATORS = [
  { icon: "user", label: "Verify identities" },
  { icon: "building", label: "Check businesses" },
  { icon: "shield", label: "Check licences" },
  { icon: "search", label: "Find public info" },
];

const SOURCE_CHIPS = [
  "Public web",
  "Business registers",
  "ABN / ASIC records",
  "Trade licences",
  "Phone references",
  "Email references",
  "Domains & websites",
  "Public profiles",
];

const HOW = [
  { n: 1, icon: "search", t: "Enter what you know", d: "A name, business, phone, email or website — plus any extra details you have." },
  { n: 2, icon: "network", t: "We check public sources", d: "Business registers, licences, domains, web and public records are checked in parallel." },
  { n: 3, icon: "eye", t: "Review matches & evidence", d: "See possible matches, how confident we are they're the same entity, and where each fact came from." },
];

const WHAT: { icon: string; t: string; d: string; tone: "brand" | "accent" }[] = [
  { icon: "user", t: "Person", d: "Names, locations, employers and public references.", tone: "brand" },
  { icon: "building", t: "Business & tradie", d: "ABN/ACN status, business names, trade licences.", tone: "accent" },
  { icon: "phone", t: "Phone", d: "Australian & international numbers, public listings.", tone: "brand" },
  { icon: "mail", t: "Email", d: "Public references and breach status (never passwords).", tone: "accent" },
  { icon: "globe", t: "Website", d: "DNS, certificates, registration age and identity.", tone: "brand" },
  { icon: "shield", t: "Licences", d: "Builders, electricians, plumbers and professionals.", tone: "accent" },
];

const USES = [
  { icon: "heart", t: "Dating", d: "Meet with confidence." },
  { icon: "building", t: "Hiring a tradie", d: "Check the licence first." },
  { icon: "zap", t: "Marketplace buys", d: "Before you pay a stranger." },
  { icon: "phone", t: "Suspicious calls", d: "Who is really calling?" },
  { icon: "mail", t: "Suspicious emails", d: "Verify the sender." },
  { icon: "fileText", t: "Business checks", d: "Confirm who you're dealing with." },
];

const PRIVACY = [
  "Searches run in-memory to build your report",
  "The person you check is not notified",
  "No passwords, credentials or breach contents are ever shown",
  "Every fact links to its public source",
  "Website checks block private/internal network targets",
  "Requests are rate-limited to prevent bulk harvesting",
];

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

const tone = (t: "brand" | "accent") =>
  t === "brand" ? { tile: "bg-brand-50 text-brand-600", ring: "group-hover:ring-brand-200" } : { tile: "bg-accent-50 text-accent-600", ring: "group-hover:ring-accent-200" };

export default function Home() {
  return (
    <div id="top">
      <Header />

      {/* ============================ HERO ============================ */}
      <section id="search" className="relative overflow-hidden">
        {/* decorative background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-[-10%] top-[-20%] h-[520px] w-[520px] rounded-full bg-brand-400/20 blur-3xl" />
          <div className="absolute left-[-8%] top-[10%] h-[420px] w-[420px] rounded-full bg-accent-400/15 blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          {/* LEFT — positioning */}
          <div className="reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-soft backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> Australian-first public-information intelligence
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tightest text-ink sm:text-6xl lg:text-7xl">
              Know before
              <br />
              <span className="text-gradient">you trust.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted sm:text-xl">
              Check First searches publicly available information so you can verify people and businesses — before you date, hire, pay, meet or trust.
            </p>

            <ul className="mt-8 grid max-w-lg grid-cols-2 gap-3">
              {INDICATORS.map((i) => (
                <li key={i.label} className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-sm font-semibold text-ink-soft shadow-soft backdrop-blur">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 text-white">
                    <Icon name={i.icon} size={16} />
                  </span>
                  {i.label}
                </li>
              ))}
            </ul>

            <p className="mt-8 text-sm font-medium text-ink-muted">
              <span className="text-ink-soft">Check first</span> before you pay. Before you hire. Before you meet.
            </p>
          </div>

          {/* RIGHT — the search panel (visual focal point) */}
          <div className="reveal delay-2">
            <div className="relative">
              <div aria-hidden className="absolute -inset-4 -z-10 rounded-[2.25rem] bg-gradient-to-tr from-brand-500/25 via-accent-400/15 to-transparent blur-2xl" />
              <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-lift ring-hairline">
                <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3.5">
                  <span className="flex items-center gap-2 text-sm font-bold text-ink">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400/60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-500" />
                    </span>
                    Start a trust search
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-ink-muted">No sign-up</span>
                </div>
                <div className="p-5 sm:p-6">
                  <HeroSearch />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Source credibility strip */}
        <div className="border-y border-slate-200/70 bg-white/60 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
            <span className="eyebrow text-ink-faint">Correlates public information across</span>
            <div className="flex flex-wrap items-center gap-2">
              {SOURCE_CHIPS.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-semibold text-ink-soft shadow-soft">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======================= HOW IT WORKS ======================= */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="eyebrow text-brand-600">How it works</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Three steps to a clearer picture</h2>
          </div>

          <div className="relative mt-14">
            <div aria-hidden className="absolute left-8 right-8 top-8 hidden h-px bg-gradient-to-r from-brand-200 via-accent-300 to-transparent lg:block" />
            <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
              {HOW.map((s) => (
                <div key={s.n} className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-glow">
                    <Icon name={s.icon} size={26} />
                  </div>
                  <span className="eyebrow mt-5 block text-brand-600">Step {s.n}</span>
                  <h3 className="mt-1 text-xl font-bold text-ink">{s.t}</h3>
                  <p className="mt-2 max-w-sm leading-relaxed text-ink-muted">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======================= WHAT WE CHECK ======================= */}
      <section id="what" className="border-y border-slate-200/60 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="eyebrow text-accent-600">What can I check?</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">A capable check for whatever you know</h2>
            <p className="mt-3 text-lg text-ink-muted">Start from any signal — a person, a business, a number, an address or a domain — and Check First does the correlation.</p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT.map((w) => {
              const tn = tone(w.tone);
              return (
                <div
                  key={w.t}
                  className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-1 ring-transparent transition-all duration-200 hover:-translate-y-1 hover:shadow-card ${tn.ring}`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tn.tile}`}>
                    <Icon name={w.icon} size={22} />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-ink">{w.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{w.d}</p>
                  <Icon name="arrowRight" size={18} className="absolute right-5 top-6 text-slate-300 transition-all duration-200 group-hover:right-4 group-hover:text-brand-500" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================= COMMON USES ======================= */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="eyebrow text-brand-600">Common uses</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">A quick check pays off</h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {USES.map((u, i) => (
              <div key={u.t} className="group flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-soft backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${i % 2 ? "bg-accent-50 text-accent-600" : "bg-brand-50 text-brand-600"}`}>
                  <Icon name={u.icon} size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-ink">{u.t}</h3>
                  <p className="text-sm text-ink-muted">{u.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== INTELLIGENCE COVERAGE (dark) ==================== */}
      <section className="relative overflow-hidden bg-navy-900 py-20 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-navy [background-size:44px_44px] opacity-70" />
        <div aria-hidden className="pointer-events-none absolute right-[-10%] top-[-20%] h-[420px] w-[420px] rounded-full bg-brand-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute left-[-6%] bottom-[-20%] h-[360px] w-[360px] rounded-full bg-accent-500/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <span className="eyebrow text-accent-300">Intelligence, not guesswork</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              One search. <span className="text-gradient-light">Many public sources, correlated.</span>
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-300">
              Check First pulls together signals from independent public sources and shows how confident it is that they describe the same person or business —
              with the evidence behind every match.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { icon: "network", t: "Correlated signals" },
                { icon: "check", t: "Confidence with evidence" },
                { icon: "fileText", t: "Source-linked results" },
                { icon: "lock", t: "Public information only" },
              ].map((f) => (
                <li key={f.t} className="flex items-center gap-3 rounded-xl px-3 py-2.5 glass-dark">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-accent-300">
                    <Icon name={f.icon} size={18} />
                  </span>
                  <span className="text-sm font-semibold text-slate-100">{f.t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-slate-400">Illustration only. Check First uses publicly available information and never claims access to restricted or private databases.</p>
          </div>

          <div className="reveal delay-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur">
              <SourceGraph />
            </div>
          </div>
        </div>
      </section>

      {/* ======================= PRIVACY ======================= */}
      <section id="privacy" className="py-20">
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <span className="eyebrow text-accent-600">Privacy by design</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Built to be trusted with a search</h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-muted">
              Check First is built around public information and privacy by design. We search only publicly available sources, keep secrets on the server, and
              don't build a permanent dossier of the people you look up.
            </p>
            <p className="mt-4 max-w-xl text-sm text-ink-muted">
              Public information can be inaccurate or out of date. Check First shows you the evidence and its source — it does not decide whether anyone is safe
              or trustworthy.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-glow-accent">
                <Icon name="lock" size={20} />
              </span>
              <h3 className="text-lg font-bold text-ink">Trust architecture</h3>
            </div>
            <ul className="mt-5 grid gap-3">
              {PRIVACY.map((p) => (
                <li key={p} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                  <Icon name="check" size={16} className="mt-0.5 shrink-0 text-accent-600" />
                  <span className="text-sm font-medium text-ink-soft">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ======================= FAQ ======================= */}
      <section id="faq" className="border-t border-slate-200/60 bg-white py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <span className="eyebrow text-brand-600">FAQ</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Questions, answered honestly</h2>
          </div>
          <div className="mt-10 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft transition-colors open:border-brand-200 open:bg-brand-50/30">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15px] font-bold text-ink">
                  {f.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all group-open:bg-brand-600 group-open:text-white">
                    <Icon name="plus" size={16} className="transition-transform group-open:rotate-45" />
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ======================= FINAL CTA ======================= */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-4xl bg-navy-900 px-6 py-16 text-center shadow-lift sm:px-12">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-navy [background-size:40px_40px] opacity-60" />
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-30%] h-[380px] w-[680px] -translate-x-1/2 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Check first, <span className="text-gradient-light">before you trust.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">Free to start. No sign-up. The person or business is never notified.</p>
            <a
              href="#search"
              className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[15px] font-bold text-navy-900 shadow-lift transition-all duration-200 hover:-translate-y-0.5"
            >
              <Icon name="search" size={18} /> Start a trust search
              <Icon name="arrowRight" size={18} className="transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ======================= FOOTER ======================= */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-ink-muted sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink">
              Check<span className="text-brand-600">First</span>
            </span>
            <span className="text-slate-400">· Know before you trust.</span>
          </div>
          <p className="text-center text-xs text-slate-400 sm:text-right">Public information only · not a criminal-history or background-screening service.</p>
        </div>
      </footer>
    </div>
  );
}

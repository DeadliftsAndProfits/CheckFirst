import { Logo } from "./Logo";
import { Icon } from "./Icon";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#what", label: "What we check" },
  { href: "#privacy", label: "Privacy" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 glass">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="#top" aria-label="Check First home" className="shrink-0">
          <Logo />
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-slate-100/70 hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href="#search"
          className="group inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-700 to-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
        >
          <Icon name="search" size={15} />
          Start a check
        </a>
      </div>
    </header>
  );
}

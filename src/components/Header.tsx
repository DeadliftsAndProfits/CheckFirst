import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="#top" aria-label="Check First home">
          <Logo />
        </a>
        <nav className="hidden items-center gap-6 text-sm font-medium text-ink-muted md:flex">
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#what" className="hover:text-ink">What we check</a>
          <a href="#privacy" className="hover:text-ink">Privacy</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
        </nav>
        <a
          href="#search"
          className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Check first
        </a>
      </div>
    </header>
  );
}

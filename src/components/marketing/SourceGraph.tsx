/**
 * Abstract "public-source correlation" visual for the intelligence section.
 * Purely illustrative UI — it does not represent live data or claim access to
 * any restricted source.
 */
const CX = 240;
const CY = 175;
const R = 132;

const NODES = [
  { label: "Public web", short: "Web" },
  { label: "ABN / ASIC", short: "ABN" },
  { label: "Trade licences", short: "Licences" },
  { label: "Domains", short: "Domains" },
  { label: "Phone", short: "Phone" },
  { label: "Email", short: "Email" },
  { label: "Public profiles", short: "Social" },
  { label: "Directories", short: "Directory" },
].map((n, i, arr) => {
  const a = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
  return { ...n, x: CX + R * Math.cos(a), y: CY + R * Math.sin(a), delay: `${i * 0.35}s` };
});

export function SourceGraph() {
  return (
    <svg viewBox="0 0 480 350" className="h-auto w-full" role="img" aria-label="Illustration: one search correlating many public sources">
      <defs>
        <radialGradient id="core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#2563eb" />
        </radialGradient>
        <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#3b74f6" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* connectors */}
      {NODES.map((n) => (
        <line key={`l-${n.short}`} x1={CX} y1={CY} x2={n.x} y2={n.y} stroke="url(#line)" strokeWidth="1.5" />
      ))}

      {/* orbit rings */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 6" />
      <circle cx={CX} cy={CY} r={R - 44} fill="none" stroke="rgba(255,255,255,0.05)" />

      {/* source nodes */}
      {NODES.map((n) => (
        <g key={n.short}>
          <circle cx={n.x} cy={n.y} r="16" fill="rgba(45,212,191,0.14)" className="animate-[pulse-node_3.5s_ease-in-out_infinite]" style={{ transformOrigin: `${n.x}px ${n.y}px`, animationDelay: n.delay }} />
          <circle cx={n.x} cy={n.y} r="6" fill="#2dd4bf" />
          <text x={n.x} y={n.y + 30} textAnchor="middle" fontSize="11" fontWeight="600" fill="#aebfd4">
            {n.short}
          </text>
        </g>
      ))}

      {/* central identity core */}
      <circle cx={CX} cy={CY} r="40" fill="url(#core)" opacity="0.18" />
      <circle cx={CX} cy={CY} r="27" fill="url(#core)" />
      <text x={CX} y={CY - 1} textAnchor="middle" fontSize="11" fontWeight="700" fill="#04121f">
        YOUR
      </text>
      <text x={CX} y={CY + 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="#04121f">
        SEARCH
      </text>
    </svg>
  );
}

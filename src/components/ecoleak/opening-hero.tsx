'use client';

import { ArrowRight, LogIn, ChevronRight, Trees, Factory, BarChart3, Sparkles } from 'lucide-react';

interface OpeningHeroProps {
  onOpenLogin: (mode: 'signin' | 'signup') => void;
  onExploreDemo: () => void;
}

export function OpeningHero({ onOpenLogin, onExploreDemo }: OpeningHeroProps) {
  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-surface via-background to-surface p-6 sm:p-12 shadow-sm my-2">
      {/* Nature / Branches & Leaves SVG Illustrations (Yellow & Golden Accents) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Top-Right Organic Golden Branch & Leaves */}
        <svg
          className="absolute -top-10 -right-10 w-72 sm:w-96 h-72 sm:h-96 text-amber-400/35 transition-transform duration-1000 animate-pulse"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Branch in Warm Ochre / Yellow */}
          <path
            d="M400 0 C320 60 250 140 210 240 C190 290 170 340 120 380"
            stroke="#eab308"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M260 120 C220 110 180 130 150 160"
            stroke="#ca8a04"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M210 240 C170 230 140 255 120 285"
            stroke="#eab308"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Yellow Leaves */}
          <path
            d="M150 160 C140 130 170 110 190 120 C190 150 160 170 150 160 Z"
            fill="#facc15"
            opacity="0.9"
          />
          <path
            d="M220 110 C210 80 240 60 260 70 C260 100 230 120 220 110 Z"
            fill="#fde047"
            opacity="0.85"
          />
          <path
            d="M290 60 C280 30 310 15 330 25 C330 55 300 70 290 60 Z"
            fill="#eab308"
            opacity="0.9"
          />
          <path
            d="M120 285 C105 260 130 240 150 250 C150 275 130 295 120 285 Z"
            fill="#facc15"
            opacity="0.85"
          />
          <path
            d="M180 220 C165 195 195 180 215 190 C215 215 195 230 180 220 Z"
            fill="#fde047"
            opacity="0.9"
          />
          <circle cx="150" cy="160" r="3" fill="#ca8a04" />
          <circle cx="210" cy="240" r="3" fill="#ca8a04" />
          <circle cx="260" cy="120" r="3" fill="#ca8a04" />
        </svg>

        {/* Bottom-Left Organic Yellow Tree Branch & Sprouting Leaves */}
        <svg
          className="absolute -bottom-12 -left-12 w-80 sm:w-[420px] h-80 sm:h-[420px] text-amber-500/30"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bottom Root/Branch curving upwards */}
          <path
            d="M0 400 C80 340 160 300 220 220 C250 180 270 130 290 70"
            stroke="#ca8a04"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M130 315 C170 330 210 320 240 300"
            stroke="#eab308"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M220 220 C260 230 290 210 320 180"
            stroke="#ca8a04"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Golden Yellow Leaf clusters */}
          <path
            d="M240 300 C270 305 285 280 270 265 C245 265 235 285 240 300 Z"
            fill="#facc15"
            opacity="0.9"
          />
          <path
            d="M320 180 C345 185 360 165 345 150 C325 150 315 165 320 180 Z"
            fill="#fde047"
            opacity="0.85"
          />
          <path
            d="M285 75 C310 75 325 55 310 40 C290 40 280 60 285 75 Z"
            fill="#eab308"
            opacity="0.9"
          />
          <path
            d="M185 260 C210 265 220 245 210 230 C190 230 180 245 185 260 Z"
            fill="#facc15"
            opacity="0.8"
          />
        </svg>

        {/* Ambient Soft Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-yellow-400/10 blur-3xl" />
      </div>

      {/* Top Banner Tag */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-xs backdrop-blur-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Factory Carbon Accounting &amp; Circular Reduction</span>
        </div>
      </div>

      {/* Center Section: Big ECOLEAK in bold green + leaves and yellow branches decoration */}
      <div className="relative z-10 my-auto py-10 text-center flex flex-col items-center">
        {/* Natural Leaves Crest */}
        <div className="mb-4 inline-flex items-center justify-center gap-2">
          <svg className="w-8 h-8 text-yellow-500 animate-bounce" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 3c-4.5 0-9 2-11.5 5.5C7.5 11.5 7 15 7 19c4 0 7.5-.5 10.5-2.5C21 14 23 9.5 21 3z" fill="#eab308"/>
            <path d="M9.5 8.5C12 11 15 13.5 18 16" stroke="#ca8a04" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="font-mono text-xs uppercase tracking-widest font-semibold text-yellow-600 dark:text-yellow-400">
            Nature-Grounded Factory Intelligence
          </span>
          <svg className="w-8 h-8 text-yellow-500 transform -scale-x-100 animate-bounce" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 3c-4.5 0-9 2-11.5 5.5C7.5 11.5 7 15 7 19c4 0 7.5-.5 10.5-2.5C21 14 23 9.5 21 3z" fill="#facc15"/>
            <path d="M9.5 8.5C12 11 15 13.5 18 16" stroke="#ca8a04" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Big EcoLeak Header - Vibrant Bold Green with Yellow Accent */}
        <div className="relative inline-block">
          <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 drop-shadow-sm select-none">
            ECO<span className="text-emerald-700 dark:text-emerald-300">LEAK</span>
          </h1>

          {/* Yellow Branch Overlay accentuating the title */}
          <div className="absolute -top-3 -right-6 sm:-top-5 sm:-right-8 pointer-events-none">
            <span className="inline-block transform rotate-12 text-yellow-400 text-3xl sm:text-4xl">🌿</span>
          </div>
          <div className="absolute -bottom-2 -left-6 sm:-bottom-3 sm:-left-8 pointer-events-none">
            <span className="inline-block transform -rotate-45 text-amber-400 text-3xl sm:text-4xl">🍂</span>
          </div>
        </div>

        {/* Subtitle in clean smaller text */}
        <p className="mt-4 max-w-2xl text-base sm:text-xl font-medium text-foreground/80 leading-relaxed">
          Pinpoint your factory&apos;s hidden carbon emissions. Transform industrial operational logs into actionable circular reduction pathways.
        </p>

        <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-mono">
          GHG Protocol Scope 1, Scope 2 &amp; Scope 3 compliant audit engine
        </p>

        {/* Middle Main Call-To-Action (Single Login button in the middle) */}
        <div className="mt-8 flex items-center justify-center w-full max-w-md">
          <button
            type="button"
            id="hero-middle-login-btn"
            onClick={() => onOpenLogin('signin')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 px-10 py-4 text-base font-bold text-white shadow-lg shadow-emerald-700/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-700/35 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <LogIn className="size-5" />
            <span>Login to EcoLeak</span>
            <ArrowRight className="size-4" />
          </button>
        </div>

        <div className="mt-4">
          <button
            type="button"
            id="hero-guest-explore-btn"
            onClick={onExploreDemo}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 font-medium underline underline-offset-4 transition-colors"
          >
            <span>Continue as Guest / Direct Audit Demo</span>
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Features Banner & Second Bottom Login Trigger */}
      <div className="relative z-10 pt-8 border-t border-border/80 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3">
            <div className="grid size-9 place-items-center rounded-lg bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">
              <Trees className="size-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Nature-First Impact</p>
              <p className="text-[11px] text-muted-foreground">Circular materials &amp; tree-equivalent offset</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3">
            <div className="grid size-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Factory className="size-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Operational Intake</p>
              <p className="text-[11px] text-muted-foreground">Drop CSV, TXT or paste machine logs</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3">
            <div className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
              <BarChart3 className="size-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Pareto 80/20 Leak</p>
              <p className="text-[11px] text-muted-foreground">Pinpoints #1 hotspot in seconds</p>
            </div>
          </div>
        </div>

        {/* Bottom Sustainability Info Tag & Eco Badge */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-2 text-right">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ISO 14064 &amp; GHG Protocol Standards</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Zero data leaks · Instant in-browser carbon accounting
          </p>
        </div>
      </div>
    </div>
  );
}

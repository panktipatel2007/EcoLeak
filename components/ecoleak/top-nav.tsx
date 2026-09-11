import { cn } from '@/lib/utils'

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="grid size-7 place-items-center rounded-sm bg-primary text-primary-foreground"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6" />
        </svg>
      </span>
      <span className="font-mono text-base font-semibold tracking-tight text-foreground">
        Eco<span className="text-primary">Leak</span>
      </span>
    </div>
  )
}

const NAV_ITEMS = [
  { label: 'Carbon Overview', current: true },
  { label: 'Factory Data', current: false },
]

export function TopNav() {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav aria-label="Primary">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <span
                  aria-current={item.current ? 'page' : undefined}
                  className={cn(
                    'rounded-sm px-3 py-1.5 text-sm transition-colors',
                    item.current
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}

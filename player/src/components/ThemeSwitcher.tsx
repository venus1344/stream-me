import { useEffect, useState } from 'react'

type ThemeName = 'dark' | 'light' | 'contrast-dark' | 'contrast-light'

const THEMES: Array<{ id: ThemeName; label: string }> = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'White' },
  { id: 'contrast-dark', label: 'High Contrast Dark' },
  { id: 'contrast-light', label: 'High Contrast White' },
]

const STORAGE_KEY = 'ome-theme'

function getInitialTheme(): ThemeName {
  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeName | null
  if (stored && THEMES.some(theme => theme.id === stored)) return stored
  return 'dark'
}

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return (
    <div className="fixed right-6 bottom-6 z-50">
      {open && (
        <div className="mb-3 w-[min(320px,calc(100vw-48px))] rounded-[26px] border border-border bg-surface/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="m-0 text-lg font-black text-text">Theme & accessibility</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-2 bg-surface-2 text-muted hover:text-text"
              aria-label="Close theme menu"
            >
              x
            </button>
          </div>
          <div className="grid gap-2">
            {THEMES.map(item => {
              const active = item.id === theme
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-black transition-all ${
                    active
                      ? 'border-accent bg-accent/15 text-text shadow-[0_0_0_1px_var(--color-accent)]'
                      : 'border-border bg-surface-3 text-muted hover:border-border-2 hover:text-text'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex h-16 w-16 items-center justify-center rounded-full border border-accent bg-surface text-3xl font-black text-accent shadow-[0_14px_45px_rgba(217,119,42,0.28)] hover:bg-surface-2"
        aria-label="Open theme menu"
        aria-expanded={open}
      >
        Aa
      </button>
    </div>
  )
}

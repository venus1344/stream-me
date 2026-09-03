import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  label: string
  to: string
}

interface NavBarProps {
  items: NavItem[]
  rightContent?: React.ReactNode
}

export default function NavBar({ items, rightContent }: NavBarProps) {
  const location = useLocation()

  const navLinks = items.map((item) => {
    const isActive = location.pathname === item.to
    return (
      <Link
        key={item.to}
        to={item.to}
        className={`flex items-center rounded-full px-4 py-2.5 text-[13px] font-black whitespace-nowrap transition-colors
          ${isActive
            ? 'bg-accent text-white hover:bg-accent-hover'
            : 'text-muted hover:text-text hover:bg-surface-2'
          }`}
      >
        {item.label}
      </Link>
    )
  })

  const navPill = (
    <nav className="flex items-center bg-surface rounded-full border border-border-3 p-1.5 gap-2">
      {navLinks}
    </nav>
  )

  return (
    <header className="relative z-10 flex flex-col mb-6">
      {/* Desktop: 3-col grid — left (logo) | center (nav) | right (actions)
          Equal 1fr columns guarantee the nav is always truly centered
          and can never overlap either side. */}
      <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] items-center py-3 gap-2">
        <Link to="/" className="flex items-center gap-3.5 shrink-0 justify-self-start">
          <div className="w-[42px] h-[42px] bg-accent rounded-xl relative shrink-0">
            <svg viewBox="0 0 16 20" xmlns="http://www.w3.org/2000/svg"
              className="absolute top-[11px] left-[15px] w-4 h-5">
              <path d="M0 0 L16 10 L0 20 Z" fill="#FFFFFF" />
            </svg>
          </div>
          <span className="text-[28px] font-black tracking-tight whitespace-nowrap">OME Player</span>
        </Link>

        {navPill}

        <div className="justify-self-end flex items-center gap-2 flex-wrap min-w-0">
          {rightContent}
        </div>
      </div>

      {/* Mobile: logo + right on top row, nav centered below */}
      <div className="sm:hidden flex items-center justify-between py-3 gap-3">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="w-[38px] h-[38px] bg-accent rounded-xl relative shrink-0">
            <svg viewBox="0 0 16 20" xmlns="http://www.w3.org/2000/svg"
              className="absolute top-[10px] left-[13px] w-[14px] h-[18px]">
              <path d="M0 0 L16 10 L0 20 Z" fill="#FFFFFF" />
            </svg>
          </div>
          <span className="text-[22px] font-black tracking-tight whitespace-nowrap">OME Player</span>
        </Link>
        {rightContent && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {rightContent}
          </div>
        )}
      </div>
      <div className="sm:hidden flex justify-center pb-2">
        {navPill}
      </div>
    </header>
  )
}

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

  return (
    <header className="relative z-10 flex items-center justify-between h-[72px] mb-6 flex-wrap gap-3">
      <Link to="/" className="flex items-center gap-3.5 shrink-0">
        <div className="w-[42px] h-[42px] bg-accent rounded-xl relative shrink-0">
          <svg viewBox="0 0 16 20" xmlns="http://www.w3.org/2000/svg"
            className="absolute top-[11px] left-[15px] w-4 h-5">
            <path d="M0 0 L16 10 L0 20 Z" fill="#FFFFFF" />
          </svg>
        </div>
        <span className="text-[28px] font-black tracking-tight whitespace-nowrap">OME Player</span>
      </Link>

      <nav className="flex items-center bg-[#111318] rounded-full border border-[#242832] p-1.5 gap-2 shrink-0">
        {items.map((item) => {
          const isActive = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center rounded-full px-4 py-2.5 text-[13px] font-black whitespace-nowrap transition-colors
                ${isActive
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'text-muted hover:text-text hover:bg-[#181B22]'
                }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {rightContent && (
        <div className="flex items-center gap-3 shrink-0">
          {rightContent}
        </div>
      )}
    </header>
  )
}

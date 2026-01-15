import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Menu,
  X,
  CalendarDays,
  CheckSquare,
  Lightbulb,
  Bookmark,
  Sun,
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { to: '/', label: 'Today', icon: Sun },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/ideas', label: 'Ideas', icon: Lightbulb },
  { to: '/reference', label: 'Reference', icon: Bookmark },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-bg-surface border-b border-border z-40">
        <div className="flex items-center justify-between h-full px-4">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-2 text-text-secondary"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-text-primary">Life OS</h1>
          {/* Placeholder for future user menu */}
          <div className="w-9" />
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-bg-surface z-50 md:hidden">
            <div className="flex items-center justify-between h-14 px-4 border-b border-border">
              <h1 className="font-semibold text-text-primary">Life OS</h1>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 -mr-2 text-text-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-interactive-primary/10 text-interactive-primary'
                        : 'text-text-secondary hover:bg-bg-muted hover:text-text-primary'
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  )
}

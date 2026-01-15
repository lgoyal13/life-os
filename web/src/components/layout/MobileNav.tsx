import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  CheckSquare,
  Lightbulb,
  Sun,
  MoreHorizontal,
  Bookmark,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const mainNavItems: NavItem[] = [
  { to: '/', label: 'Today', icon: Sun },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/ideas', label: 'Ideas', icon: Lightbulb },
]

const moreItems: NavItem[] = [
  { to: '/reference', label: 'Reference', icon: Bookmark },
]

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center w-16 h-full gap-1 text-xs transition-colors',
                  isActive
                    ? 'text-interactive-primary'
                    : 'text-text-secondary'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center w-16 h-full gap-1 text-xs text-text-secondary"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* More Menu Overlay */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-bg-surface rounded-t-xl z-50 md:hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-medium text-text-primary">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-2 -mr-2 text-text-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-interactive-primary/10 text-interactive-primary'
                        : 'text-text-primary hover:bg-bg-muted'
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
            {/* Safe area padding for home indicator */}
            <div className="h-8" />
          </div>
        </>
      )}
    </>
  )
}

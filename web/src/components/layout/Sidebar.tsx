import { NavLink } from 'react-router-dom'
import {
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

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-52 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-bg-surface">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-border">
        <h1 className="text-lg font-semibold text-text-primary">Life OS</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
    </aside>
  )
}

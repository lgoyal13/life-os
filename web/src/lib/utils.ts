import { clsx, type ClassValue } from 'clsx'
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'

// Merge class names with clsx
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Format date for display
export function formatDate(dateString: string | null): string {
  if (!dateString) return ''

  const date = parseISO(dateString)

  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isYesterday(date)) return 'Yesterday'

  // Same year: "Jan 15"
  // Different year: "Jan 15, 2024"
  const now = new Date()
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, 'MMM d')
  }
  return format(date, 'MMM d, yyyy')
}

// Format date with time for events
export function formatDateTime(dateString: string | null): string {
  if (!dateString) return ''

  const date = parseISO(dateString)
  const timeStr = format(date, 'h:mm a')

  if (isToday(date)) return `Today at ${timeStr}`
  if (isTomorrow(date)) return `Tomorrow at ${timeStr}`

  const now = new Date()
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "MMM d 'at' h:mm a")
  }
  return format(date, "MMM d, yyyy 'at' h:mm a")
}

// Format full date for detail views
export function formatFullDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = parseISO(dateString)
  return format(date, 'EEEE, MMMM d, yyyy')
}

// Format timestamp for created/updated dates
export function formatTimestamp(dateString: string | null): string {
  if (!dateString) return ''
  const date = parseISO(dateString)
  return format(date, "MMM d, yyyy 'at' h:mm a")
}

// Check if a date is today
export function isDateToday(dateString: string | null): boolean {
  if (!dateString) return false
  return isToday(parseISO(dateString))
}

// Get start of today as ISO string
export function getStartOfToday(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

// Get end of today as ISO string
export function getEndOfToday(): string {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return today.toISOString()
}

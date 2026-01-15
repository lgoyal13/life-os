import { useItems } from '../hooks'
import { ItemList } from '../components/items'
import { getStartOfToday } from '../lib/utils'

export function Events() {
  const today = getStartOfToday()
  const { items, isLoading, error } = useItems({
    type: 'event',
    dueDateFrom: today,
  })

  // Sort by due date (soonest first)
  const sortedItems = [...items].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  if (error) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
        <div className="bg-urgency-high/10 border border-urgency-high/20 rounded-lg p-4 text-center">
          <p className="text-urgency-high">Failed to load events. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-text-primary">
          Events
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {isLoading ? 'Loading...' : `${sortedItems.length} upcoming event${sortedItems.length !== 1 ? 's' : ''}`}
        </p>
      </header>

      <ItemList
        items={sortedItems}
        isLoading={isLoading}
        emptyMessage="No upcoming events"
        emptyActionLabel="Add your first event"
      />
    </div>
  )
}

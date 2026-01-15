import { useItems, useMutateItem } from '../hooks'
import { ItemList } from '../components/items'
import type { Item } from '../lib/types'

export function Tasks() {
  const { items, isLoading, error } = useItems({
    type: 'task',
    excludeStatus: 'complete',
  })
  const { toggleComplete } = useMutateItem()

  // Sort by urgency (high → medium → low), then by due date
  const sortedItems = [...items].sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 }
    const aUrgency = a.urgency ? urgencyOrder[a.urgency] : 3
    const bUrgency = b.urgency ? urgencyOrder[b.urgency] : 3

    if (aUrgency !== bUrgency) {
      return aUrgency - bUrgency
    }

    // Then by due date (items with due dates first)
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }

    return 0
  })

  const handleToggleComplete = async (item: Item) => {
    await toggleComplete(item)
  }

  if (error) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
        <div className="bg-urgency-high/10 border border-urgency-high/20 rounded-lg p-4 text-center">
          <p className="text-urgency-high">Failed to load tasks. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-text-primary">
          Tasks
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {isLoading ? 'Loading...' : `${sortedItems.length} task${sortedItems.length !== 1 ? 's' : ''}`}
        </p>
      </header>

      <ItemList
        items={sortedItems}
        isLoading={isLoading}
        emptyMessage="No tasks yet"
        emptyActionLabel="Add your first task"
        onToggleComplete={handleToggleComplete}
      />
    </div>
  )
}

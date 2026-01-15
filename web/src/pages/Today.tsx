import { format } from 'date-fns'
import { useItems, useMutateItem } from '../hooks'
import { ItemList } from '../components/items'
import { getStartOfToday, getEndOfToday, isDateToday } from '../lib/utils'
import type { Item } from '../lib/types'

export function Today() {
  const today = new Date()
  const dateDisplay = format(today, 'EEEE, MMMM d')
  const startOfToday = getStartOfToday()
  const endOfToday = getEndOfToday()

  // Fetch tasks (for due today + high urgency)
  const { items: tasks, isLoading: tasksLoading } = useItems({
    type: 'task',
    excludeStatus: 'complete',
  })

  // Fetch events for today
  const { items: events, isLoading: eventsLoading } = useItems({
    type: 'event',
    dueDateFrom: startOfToday,
    dueDateTo: endOfToday,
  })

  const { toggleComplete } = useMutateItem()

  const isLoading = tasksLoading || eventsLoading

  // Filter tasks due today
  const tasksDueToday = tasks.filter(task =>
    task.due_date && isDateToday(task.due_date)
  )

  // Filter high urgency tasks (not already in due today)
  const highUrgencyTasks = tasks.filter(task =>
    task.urgency === 'high' &&
    (!task.due_date || !isDateToday(task.due_date))
  )

  // Sort events by time
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  const handleToggleComplete = async (item: Item) => {
    await toggleComplete(item)
  }

  // Check if there's nothing to show
  const isEmpty = !isLoading &&
    sortedEvents.length === 0 &&
    tasksDueToday.length === 0 &&
    highUrgencyTasks.length === 0

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
      {/* Date Header */}
      <header className="mb-8">
        <h1 className="text-xl md:text-2xl font-semibold text-text-primary">
          {dateDisplay}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your focus for today
        </p>
      </header>

      {/* Empty state */}
      {isEmpty && (
        <div className="bg-bg-elevated border border-border rounded-lg p-8 text-center">
          <p className="text-lg text-text-primary mb-2">Nothing urgent today</p>
          <p className="text-sm text-text-secondary">
            {tasks.length > 0
              ? `You have ${tasks.length} task${tasks.length !== 1 ? 's' : ''} to work on when you're ready.`
              : 'Enjoy your day!'
            }
          </p>
        </div>
      )}

      {/* Content sections */}
      {!isEmpty && (
        <div className="space-y-8">
          {/* Today's Events */}
          {(eventsLoading || sortedEvents.length > 0) && (
            <section>
              <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
                Today's Events {!eventsLoading && `(${sortedEvents.length})`}
              </h2>
              <ItemList
                items={sortedEvents}
                isLoading={eventsLoading}
              />
            </section>
          )}

          {/* Due Today */}
          {(tasksLoading || tasksDueToday.length > 0) && (
            <section>
              <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
                Due Today {!tasksLoading && `(${tasksDueToday.length})`}
              </h2>
              <ItemList
                items={tasksDueToday}
                isLoading={tasksLoading}
                onToggleComplete={handleToggleComplete}
              />
            </section>
          )}

          {/* High Urgency */}
          {(tasksLoading || highUrgencyTasks.length > 0) && (
            <section>
              <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
                High Urgency {!tasksLoading && `(${highUrgencyTasks.length})`}
              </h2>
              <ItemList
                items={highUrgencyTasks}
                isLoading={tasksLoading && tasksDueToday.length === 0}
                onToggleComplete={handleToggleComplete}
              />
            </section>
          )}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import type { Item } from '../../lib/types'
import { ItemCard } from './ItemCard'
import { cn } from '../../lib/utils'

interface ItemListProps {
  items: Item[]
  isLoading?: boolean
  emptyMessage?: string
  emptyActionLabel?: string
  onEmptyAction?: () => void
  onToggleComplete?: (item: Item) => void
  compact?: boolean
  className?: string
}

// Skeleton loader for items
function ItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-bg-muted/50 animate-pulse">
      <div className="w-5 h-5 rounded-full bg-bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-bg-muted" />
        <div className="h-3 w-1/2 rounded bg-bg-muted" />
      </div>
    </div>
  )
}

export function ItemList({
  items,
  isLoading = false,
  emptyMessage = 'No items yet',
  emptyActionLabel = 'Add item',
  onEmptyAction,
  onToggleComplete,
  compact = false,
  className,
}: ItemListProps) {
  // Track which item is expanded (only one at a time)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  const handleToggleExpand = (itemId: string) => {
    setExpandedItemId(current => current === itemId ? null : itemId)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <ItemSkeleton />
        <ItemSkeleton />
        <ItemSkeleton />
      </div>
    )
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="bg-bg-elevated border border-border rounded-xl p-8 text-center">
        <p className="text-text-secondary mb-4">{emptyMessage}</p>
        {onEmptyAction && (
          <button
            onClick={onEmptyAction}
            className="px-4 py-2 bg-interactive-primary text-white rounded-lg text-sm font-medium hover:bg-interactive-hover transition-colors"
          >
            {emptyActionLabel}
          </button>
        )}
      </div>
    )
  }

  // Item list
  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          isExpanded={expandedItemId === item.id}
          onToggleExpand={() => handleToggleExpand(item.id)}
          onToggleComplete={onToggleComplete}
          compact={compact}
        />
      ))}
    </div>
  )
}

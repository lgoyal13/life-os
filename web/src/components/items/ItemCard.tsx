import { useState, useRef, useEffect } from 'react'
import {
  CheckSquare,
  Calendar,
  Lightbulb,
  Bookmark,
  Circle,
  CheckCircle2,
  ChevronDown,
  Trash2,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react'
import type { Item, ItemType, Urgency, ItemStatus } from '../../lib/types'
import { cn, formatDate } from '../../lib/utils'
import { CATEGORIES, IDEA_SUBCATEGORIES, URGENCY_LEVELS, ITEM_STATUSES } from '../../lib/types'
import { useMutateItem, useItemChat } from '../../hooks'

interface ItemCardProps {
  item: Item
  isExpanded?: boolean
  onToggleExpand?: () => void
  onToggleComplete?: (item: Item) => void
  compact?: boolean
}

const typeIcons: Record<ItemType, React.ComponentType<{ className?: string }>> = {
  task: CheckSquare,
  event: Calendar,
  idea: Lightbulb,
  reference: Bookmark,
}

const urgencyStyles = {
  high: 'bg-urgency-high/10 text-urgency-high',
  medium: 'bg-urgency-medium/10 text-urgency-medium',
  low: 'bg-bg-muted text-text-muted',
}

const urgencyDot = {
  high: 'bg-urgency-high',
  medium: 'bg-urgency-medium',
  low: 'bg-urgency-low',
}

// Category to pastel background mapping
const categoryColors: Record<string, string> = {
  Personal: 'bg-[#e0f2fe]',      // soft blue
  Work: 'bg-[#fef3c7]',          // soft amber
  Health: 'bg-[#dcfce7]',        // soft green
  Finance: 'bg-[#f3e8ff]',       // soft purple
  Family: 'bg-[#ffe4e6]',        // soft rose
  Home: 'bg-[#fed7aa]',          // soft orange
  Car: 'bg-[#e5e7eb]',           // soft gray
  Travel: 'bg-[#cffafe]',        // soft cyan
  Ideas: 'bg-[#fef9c3]',         // soft yellow
  Reference: 'bg-[#f1f5f9]',     // soft slate
  Recruiting: 'bg-[#fce7f3]',    // soft pink
}

// Type to pastel background mapping (fallback when no category)
const typeColors: Record<ItemType, string> = {
  task: 'bg-[#dbeafe]',          // blue tint
  event: 'bg-[#fce7f3]',         // pink tint
  idea: 'bg-[#fef9c3]',          // yellow tint
  reference: 'bg-[#f1f5f9]',     // slate tint
}

const statusLabels: Record<ItemStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
}

const urgencyLabels: Record<Urgency, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export function ItemCard({
  item,
  isExpanded = false,
  onToggleExpand,
  onToggleComplete,
  compact = false
}: ItemCardProps) {
  const TypeIcon = typeIcons[item.type]
  const isComplete = item.status === 'complete'
  const { updateItem, deleteItem, isLoading } = useMutateItem()
  const { sendInstruction, isLoading: isChatLoading } = useItemChat()

  // Local state for editing
  const [localItem, setLocalItem] = useState<Item>(item)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // Sync local state with item prop
  useEffect(() => {
    setLocalItem(item)
  }, [item])

  // Get background color based on category or type
  const bgColor = item.category
    ? categoryColors[item.category] || typeColors[item.type]
    : typeColors[item.type]

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleComplete?.(item)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, select, input, textarea, a')) {
      return
    }
    onToggleExpand?.()
  }

  const handleFieldSave = async (field: string, value: unknown) => {
    const update = { id: localItem.id, [field]: value }
    const updated = await updateItem(update)
    if (updated) {
      setLocalItem(updated)
    }
  }

  const handleDelete = async () => {
    await deleteItem(localItem.id)
    setShowDeleteConfirm(false)
  }

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'group rounded-xl border border-border/50 transition-all duration-300 cursor-pointer overflow-hidden',
        bgColor,
        isComplete && 'opacity-60',
        isExpanded ? 'shadow-md' : 'hover:shadow-sm hover:border-border'
      )}
    >
      {/* Collapsed Header - Always visible */}
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox for tasks */}
        {item.type === 'task' && (
          <button
            onClick={handleCheckboxClick}
            className={cn(
              'flex-shrink-0 mt-0.5 transition-colors',
              isComplete ? 'text-status-complete' : 'text-text-muted hover:text-text-secondary'
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Type icon for non-tasks */}
        {item.type !== 'task' && (
          <div className="flex-shrink-0 mt-0.5 text-text-secondary">
            <TypeIcon className="w-5 h-5" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            className={cn(
              'text-sm font-medium text-text-primary',
              isComplete && 'line-through',
              !isExpanded && 'truncate'
            )}
          >
            {localItem.title}
          </h3>

          {/* Metadata row */}
          {!compact && !isExpanded && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {/* Category badge */}
              {item.category && (
                <span className="text-xs font-medium text-text-secondary px-2 py-0.5 rounded-full bg-white/60">
                  {item.category}
                </span>
              )}

              {/* Subcategory for ideas */}
              {item.type === 'idea' && item.subcategory && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-text-secondary">
                  {item.subcategory}
                </span>
              )}

              {/* Due date */}
              {item.due_date && (
                <span className="text-xs text-text-secondary">
                  {formatDate(item.due_date)}
                </span>
              )}

              {/* People mentioned */}
              {item.people_mentioned && item.people_mentioned.length > 0 && (
                <span className="text-xs text-text-muted">
                  {item.people_mentioned.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side: Urgency + Expand indicator */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Urgency indicator */}
          {item.urgency && item.urgency !== 'low' && !isExpanded && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  urgencyDot[item.urgency]
                )}
              />
              {!compact && (
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    urgencyStyles[item.urgency]
                  )}
                >
                  {item.urgency === 'high' ? 'High' : 'Medium'}
                </span>
              )}
            </div>
          )}

          {/* Expand indicator */}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-text-muted transition-transform duration-300',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* Expanded Content */}
      <div
        ref={contentRef}
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 space-y-4 bg-white/40 border-t border-white/60">
          {/* Status & Urgency Row */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            {/* Status */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Status
              </label>
              <select
                value={localItem.status}
                onChange={(e) => handleFieldSave('status', e.target.value as ItemStatus)}
                disabled={isLoading}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:border-interactive-primary outline-none"
              >
                {ITEM_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </div>

            {/* Urgency (tasks/events only) */}
            {(localItem.type === 'task' || localItem.type === 'event') && (
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  Urgency
                </label>
                <select
                  value={localItem.urgency || ''}
                  onChange={(e) => handleFieldSave('urgency', e.target.value || null)}
                  disabled={isLoading}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:border-interactive-primary outline-none"
                >
                  <option value="">None</option>
                  {URGENCY_LEVELS.map((urg) => (
                    <option key={urg} value={urg}>
                      {urgencyLabels[urg]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subcategory (ideas only) */}
            {localItem.type === 'idea' && (
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  Subcategory
                </label>
                <select
                  value={localItem.subcategory || ''}
                  onChange={(e) => handleFieldSave('subcategory', e.target.value || null)}
                  disabled={isLoading}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:border-interactive-primary outline-none"
                >
                  <option value="">None</option>
                  {IDEA_SUBCATEGORIES.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Category & Due Date Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Category
              </label>
              <select
                value={localItem.category || ''}
                onChange={(e) => handleFieldSave('category', e.target.value || null)}
                disabled={isLoading}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:border-interactive-primary outline-none"
              >
                <option value="">None</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date (tasks/events only) */}
            {(localItem.type === 'task' || localItem.type === 'event') && (
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={localItem.due_date ? localItem.due_date.slice(0, 16) : ''}
                  onChange={(e) => handleFieldSave('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  disabled={isLoading}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:border-interactive-primary outline-none"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Description
            </label>
            <textarea
              value={localItem.description || ''}
              onChange={(e) => setLocalItem({ ...localItem, description: e.target.value })}
              onBlur={() => handleFieldSave('description', localItem.description)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Add a description..."
              rows={2}
              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-interactive-primary outline-none resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Notes
            </label>
            <textarea
              value={localItem.notes || ''}
              onChange={(e) => setLocalItem({ ...localItem, notes: e.target.value })}
              onBlur={() => handleFieldSave('notes', localItem.notes)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Add notes..."
              rows={2}
              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-interactive-primary outline-none resize-none"
            />
          </div>

          {/* People Mentioned (display only) */}
          {localItem.people_mentioned && localItem.people_mentioned.length > 0 && (
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                People
              </label>
              <div className="flex flex-wrap gap-1.5">
                {localItem.people_mentioned.map((person) => (
                  <span
                    key={person}
                    className="px-2 py-1 bg-white/80 text-text-secondary text-xs rounded-full"
                  >
                    {person}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Chat Input */}
          <div className="pt-2 border-t border-white/60">
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!chatInput.trim() || isChatLoading) return
                try {
                  const updated = await sendInstruction(localItem.id, chatInput.trim(), localItem)
                  setLocalItem(updated)
                  setChatInput('')
                } catch (err) {
                  // Error is handled by the hook
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2"
            >
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-border focus-within:border-interactive-primary">
                <MessageSquare className="w-4 h-4 text-text-muted flex-shrink-0" />
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Tell AI what to change..."
                  disabled={isChatLoading}
                  className="flex-1 text-sm text-text-primary placeholder:text-text-muted bg-transparent outline-none disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="p-2 bg-interactive-primary text-white rounded-lg hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isChatLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
            <p className="mt-1.5 text-xs text-text-muted">
              Try: "make this high urgency" or "due tomorrow"
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/60">
            <div className="text-xs text-text-muted">
              Updated {formatDate(localItem.updated_at)}
            </div>

            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">Delete?</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  disabled={isLoading}
                  className="px-2 py-1 bg-urgency-high text-white text-xs rounded hover:bg-urgency-high/90 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                  className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-urgency-high transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState, useRef } from 'react'
import {
  X,
  Calendar,
  CheckSquare,
  Lightbulb,
  Bookmark,
  Trash2,
  ExternalLink,
  Plus,
} from 'lucide-react'
import { useItemDetail } from '../../hooks/useItemDetail'
import { useMutateItem } from '../../hooks'
import { cn, formatTimestamp } from '../../lib/utils'
import type { Item, Urgency, ItemStatus } from '../../lib/types'
import { CATEGORIES, IDEA_SUBCATEGORIES, URGENCY_LEVELS, ITEM_STATUSES } from '../../lib/types'

const typeIcons = {
  task: CheckSquare,
  event: Calendar,
  idea: Lightbulb,
  reference: Bookmark,
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

export function ItemDetail() {
  const { selectedItem, isOpen, closeItem } = useItemDetail()
  const { updateItem, deleteItem, isLoading } = useMutateItem()
  const panelRef = useRef<HTMLDivElement>(null)

  // Local state for editing
  const [editingField, setEditingField] = useState<string | null>(null)
  const [localItem, setLocalItem] = useState<Item | null>(null)
  const [newLink, setNewLink] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Sync local state with selected item
  useEffect(() => {
    if (selectedItem) {
      setLocalItem(selectedItem)
    }
  }, [selectedItem])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingField) {
          setEditingField(null)
        } else {
          closeItem()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, editingField, closeItem])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeItem()
      }
    }

    if (isOpen) {
      // Delay to prevent immediate close on open click
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, closeItem])

  if (!localItem) return null

  const TypeIcon = typeIcons[localItem.type]

  const handleFieldSave = async (field: string, value: unknown) => {
    if (!localItem) return

    const update = { id: localItem.id, [field]: value }
    const updated = await updateItem(update)

    if (updated) {
      setLocalItem(updated)
    }

    setEditingField(null)
  }

  const handleDelete = async () => {
    if (!localItem) return

    const success = await deleteItem(localItem.id)
    if (success) {
      closeItem()
    }
    setShowDeleteConfirm(false)
  }

  const handleAddLink = async () => {
    if (!newLink.trim() || !localItem) return

    const updatedLinks = [...(localItem.links || []), newLink.trim()]
    await handleFieldSave('links', updatedLinks)
    setNewLink('')
  }

  const handleRemoveLink = async (linkToRemove: string) => {
    if (!localItem) return

    const updatedLinks = (localItem.links || []).filter(link => link !== linkToRemove)
    await handleFieldSave('links', updatedLinks)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed z-50 bg-bg-surface shadow-lg transition-transform duration-300 ease-out overflow-y-auto',
          // Mobile: full screen
          'inset-0 md:inset-auto',
          // Desktop: slide-over from right
          'md:right-0 md:top-0 md:bottom-0 md:w-[420px] md:border-l md:border-border',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-secondary">
            <TypeIcon className="w-5 h-5" />
            <span className="text-sm font-medium capitalize">{localItem.type}</span>
          </div>
          <button
            onClick={closeItem}
            className="p-2 -mr-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Title */}
          <div>
            {editingField === 'title' ? (
              <input
                type="text"
                value={localItem.title}
                onChange={(e) => setLocalItem({ ...localItem, title: e.target.value })}
                onBlur={() => handleFieldSave('title', localItem.title)}
                onKeyDown={(e) => e.key === 'Enter' && handleFieldSave('title', localItem.title)}
                autoFocus
                className="w-full text-lg font-semibold text-text-primary bg-transparent border-b-2 border-interactive-primary outline-none"
              />
            ) : (
              <h2
                onClick={() => setEditingField('title')}
                className="text-lg font-semibold text-text-primary cursor-pointer hover:bg-bg-muted rounded px-1 -mx-1"
              >
                {localItem.title}
              </h2>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide block mb-1">
              Status
            </label>
            <select
              value={localItem.status}
              onChange={(e) => handleFieldSave('status', e.target.value as ItemStatus)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary focus:border-interactive-primary outline-none"
            >
              {ITEM_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide block mb-1">
                Category
              </label>
              <select
                value={localItem.category || ''}
                onChange={(e) => handleFieldSave('category', e.target.value || null)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary focus:border-interactive-primary outline-none"
              >
                <option value="">None</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory (Ideas only) */}
            {localItem.type === 'idea' && (
              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide block mb-1">
                  Subcategory
                </label>
                <select
                  value={localItem.subcategory || ''}
                  onChange={(e) => handleFieldSave('subcategory', e.target.value || null)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary focus:border-interactive-primary outline-none"
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

            {/* Urgency */}
            {localItem.type !== 'idea' && localItem.type !== 'reference' && (
              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide block mb-1">
                  Urgency
                </label>
                <select
                  value={localItem.urgency || ''}
                  onChange={(e) => handleFieldSave('urgency', e.target.value || null)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary focus:border-interactive-primary outline-none"
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

            {/* Due Date */}
            {(localItem.type === 'task' || localItem.type === 'event') && (
              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide block mb-1">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={localItem.due_date ? localItem.due_date.slice(0, 16) : ''}
                  onChange={(e) => handleFieldSave('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary focus:border-interactive-primary outline-none"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide block mb-1">
              Description
            </label>
            <textarea
              value={localItem.description || ''}
              onChange={(e) => setLocalItem({ ...localItem, description: e.target.value })}
              onBlur={() => handleFieldSave('description', localItem.description)}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-interactive-primary outline-none resize-none"
            />
          </div>

          {/* People Mentioned (Display only) */}
          {localItem.people_mentioned && localItem.people_mentioned.length > 0 && (
            <div>
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide block mb-1">
                People
              </label>
              <div className="flex flex-wrap gap-2">
                {localItem.people_mentioned.map((person) => (
                  <span
                    key={person}
                    className="px-2 py-1 bg-bg-muted text-text-secondary text-sm rounded"
                  >
                    {person}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide block mb-1">
              Notes
            </label>
            <textarea
              value={localItem.notes || ''}
              onChange={(e) => setLocalItem({ ...localItem, notes: e.target.value })}
              onBlur={() => handleFieldSave('notes', localItem.notes)}
              placeholder="Add notes..."
              rows={3}
              className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-interactive-primary outline-none resize-none"
            />
          </div>

          {/* Links */}
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide block mb-1">
              Links
            </label>
            <div className="space-y-2">
              {localItem.links && localItem.links.map((link) => (
                <div key={link} className="flex items-center gap-2">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-interactive-primary hover:underline truncate flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    {link}
                  </a>
                  <button
                    onClick={() => handleRemoveLink(link)}
                    className="p-1 text-text-muted hover:text-urgency-high transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                  placeholder="Add a link..."
                  className="flex-1 px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-interactive-primary outline-none"
                />
                <button
                  onClick={handleAddLink}
                  disabled={!newLink.trim()}
                  className="p-2 text-text-secondary hover:text-interactive-primary disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="text-xs text-text-muted">
              <p>Created: {formatTimestamp(localItem.created_at)}</p>
              <p>Updated: {formatTimestamp(localItem.updated_at)}</p>
              {localItem.completed_at && (
                <p>Completed: {formatTimestamp(localItem.completed_at)}</p>
              )}
            </div>

            {/* Delete */}
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Delete this item?</span>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-urgency-high text-white text-sm rounded-lg hover:bg-urgency-high/90 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-sm text-text-muted hover:text-urgency-high transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete item
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

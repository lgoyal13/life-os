import { useState, useEffect, useRef } from 'react'
import {
  X,
  Loader2,
  CheckCircle,
  CheckSquare,
  Calendar,
  Lightbulb,
  Bookmark,
  ArrowRight,
  Plus,
} from 'lucide-react'
import { cn, formatDate } from '../../lib/utils'
import type { Item, ItemType } from '../../lib/types'

interface CaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (text: string) => Promise<Item>
}

const typeIcons: Record<ItemType, React.ComponentType<{ className?: string }>> = {
  task: CheckSquare,
  event: Calendar,
  idea: Lightbulb,
  reference: Bookmark,
}

const typeLabels: Record<ItemType, string> = {
  task: 'Task',
  event: 'Event',
  idea: 'Idea',
  reference: 'Reference',
}

const typeColors: Record<ItemType, string> = {
  task: 'bg-[#dbeafe]',
  event: 'bg-[#fce7f3]',
  idea: 'bg-[#fef9c3]',
  reference: 'bg-[#f1f5f9]',
}

const urgencyLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export function CaptureModal({ isOpen, onClose, onSubmit }: CaptureModalProps) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [capturedItem, setCapturedItem] = useState<Item | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current && status === 'idle') {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen, status])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'processing') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, status])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setText('')
      setStatus('idle')
      setErrorMessage('')
      setCapturedItem(null)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!text.trim() || status === 'processing') return

    setStatus('processing')
    setErrorMessage('')

    try {
      const item = await onSubmit(text.trim())
      setCapturedItem(item)
      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    }
  }

  const handleCaptureAnother = () => {
    setText('')
    setStatus('idle')
    setCapturedItem(null)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
  }

  if (!isOpen) return null

  // Success Screen
  if (status === 'success' && capturedItem) {
    const TypeIcon = typeIcons[capturedItem.type]

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={onClose}
        />

        {/* Modal */}
        <div className={cn(
          'fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg rounded-xl shadow-lg z-50 flex flex-col max-h-[90vh] overflow-hidden',
          typeColors[capturedItem.type]
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/60 border-b border-white/80">
            <div className="flex items-center gap-2 text-status-complete">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Captured!</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-5 overflow-y-auto">
            {/* Type Badge */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-full">
                <TypeIcon className="w-4 h-4 text-text-secondary" />
                <span className="text-sm font-medium text-text-primary">
                  {typeLabels[capturedItem.type]}
                </span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              {capturedItem.title}
            </h3>

            {/* Extracted Details */}
            <div className="space-y-3">
              {capturedItem.category && (
                <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                  <span className="text-sm text-text-secondary">Category</span>
                  <span className="text-sm font-medium text-text-primary">{capturedItem.category}</span>
                </div>
              )}

              {capturedItem.subcategory && (
                <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                  <span className="text-sm text-text-secondary">Subcategory</span>
                  <span className="text-sm font-medium text-text-primary">{capturedItem.subcategory}</span>
                </div>
              )}

              {capturedItem.urgency && (
                <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                  <span className="text-sm text-text-secondary">Urgency</span>
                  <span className={cn(
                    'text-sm font-medium px-2 py-0.5 rounded-full',
                    capturedItem.urgency === 'high' && 'bg-urgency-high/10 text-urgency-high',
                    capturedItem.urgency === 'medium' && 'bg-urgency-medium/10 text-urgency-medium',
                    capturedItem.urgency === 'low' && 'bg-bg-muted text-text-muted'
                  )}>
                    {urgencyLabels[capturedItem.urgency]}
                  </span>
                </div>
              )}

              {capturedItem.due_date && (
                <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                  <span className="text-sm text-text-secondary">Due</span>
                  <span className="text-sm font-medium text-text-primary">
                    {formatDate(capturedItem.due_date)}
                  </span>
                </div>
              )}

              {capturedItem.people_mentioned && capturedItem.people_mentioned.length > 0 && (
                <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg">
                  <span className="text-sm text-text-secondary">People</span>
                  <span className="text-sm font-medium text-text-primary">
                    {capturedItem.people_mentioned.join(', ')}
                  </span>
                </div>
              )}

              {capturedItem.description && (
                <div className="py-2 px-3 bg-white/60 rounded-lg">
                  <span className="text-sm text-text-secondary block mb-1">Description</span>
                  <span className="text-sm text-text-primary">{capturedItem.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white/60 border-t border-white/80">
            <button
              onClick={handleCaptureAnother}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
              Capture Another
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-interactive-primary text-white rounded-lg hover:bg-interactive-hover transition-colors"
            >
              Done
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </>
    )
  }

  // Input Screen
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => status !== 'processing' && onClose()}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-bg-surface rounded-xl shadow-lg z-50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-text-primary">Quick Capture</h2>
          <button
            onClick={onClose}
            disabled={status === 'processing'}
            className="p-2 -mr-2 text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            disabled={status === 'processing'}
            rows={5}
            className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:border-interactive-primary outline-none resize-none disabled:opacity-50"
          />

          {/* Error message */}
          {status === 'error' && errorMessage && (
            <div className="mt-3 p-3 bg-urgency-high/10 border border-urgency-high/20 rounded-lg">
              <p className="text-sm text-urgency-high">{errorMessage}</p>
            </div>
          )}

          {/* Help text */}
          <p className="mt-3 text-xs text-text-muted">
            Type naturally. AI will categorize and extract details automatically.
            <br />
            Press <kbd className="px-1 py-0.5 bg-bg-muted rounded text-xs">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-bg-muted rounded text-xs">Enter</kbd> to submit.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            disabled={status === 'processing'}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || status === 'processing'}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
              status === 'processing'
                ? 'bg-interactive-primary/70 text-white cursor-not-allowed'
                : 'bg-interactive-primary text-white hover:bg-interactive-hover disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === 'processing' ? 'Processing...' : 'Capture'}
          </button>
        </div>
      </div>
    </>
  )
}

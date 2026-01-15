import { Plus } from 'lucide-react'

interface CaptureButtonProps {
  onClick: () => void
}

export function CaptureButton({ onClick }: CaptureButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-interactive-primary text-white rounded-full shadow-lg hover:bg-interactive-hover transition-all hover:scale-105 flex items-center justify-center z-30"
      aria-label="Add new item"
    >
      <Plus className="w-6 h-6" />
    </button>
  )
}

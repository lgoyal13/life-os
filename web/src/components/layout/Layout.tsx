import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { CaptureButton, CaptureModal } from '../capture'
import { useCapture } from '../../hooks'
import type { Item } from '../../lib/types'

export function Layout() {
  const [isCaptureOpen, setIsCaptureOpen] = useState(false)
  const { capture } = useCapture()

  const handleCapture = async (text: string): Promise<Item> => {
    return await capture(text)
  }

  return (
    <div className="min-h-screen bg-bg-surface">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Header */}
      <Header />

      {/* Main Content */}
      <main className="md:pl-52">
        {/* Mobile: top padding for header, bottom for nav */}
        {/* Desktop: no extra padding */}
        <div className="pt-14 pb-20 md:pt-0 md:pb-0 min-h-screen">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav />

      {/* Capture FAB */}
      <CaptureButton onClick={() => setIsCaptureOpen(true)} />

      {/* Capture Modal */}
      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onSubmit={handleCapture}
      />
    </div>
  )
}

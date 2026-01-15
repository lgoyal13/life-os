import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Item } from '../lib/types'

interface ItemDetailContextValue {
  selectedItem: Item | null
  isOpen: boolean
  openItem: (item: Item) => void
  closeItem: () => void
}

const ItemDetailContext = createContext<ItemDetailContextValue | null>(null)

export function useItemDetail() {
  const context = useContext(ItemDetailContext)
  if (!context) {
    throw new Error('useItemDetail must be used within an ItemDetailProvider')
  }
  return context
}

interface ItemDetailProviderProps {
  children: ReactNode
}

export function ItemDetailProvider({ children }: ItemDetailProviderProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const openItem = useCallback((item: Item) => {
    setSelectedItem(item)
    setIsOpen(true)
  }, [])

  const closeItem = useCallback(() => {
    setIsOpen(false)
    // Delay clearing the item to allow for exit animation
    setTimeout(() => setSelectedItem(null), 300)
  }, [])

  return (
    <ItemDetailContext.Provider value={{ selectedItem, isOpen, openItem, closeItem }}>
      {children}
    </ItemDetailContext.Provider>
  )
}

import { useState, useCallback } from 'react'
import type { Item } from '../lib/types'

interface UseItemChatResult {
  sendInstruction: (itemId: string, instruction: string, currentItem: Item) => Promise<Item>
  isLoading: boolean
  error: Error | null
}

const EDIT_API_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/edit-item'

export function useItemChat(): UseItemChatResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const sendInstruction = useCallback(async (
    itemId: string,
    instruction: string,
    currentItem: Item
  ): Promise<Item> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(EDIT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          item_id: itemId,
          instruction,
          current_item: currentItem,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to process instruction')
      }

      const data = await response.json()
      return data.item as Item
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update item')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { sendInstruction, isLoading, error }
}

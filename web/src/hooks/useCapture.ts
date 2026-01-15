import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Item } from '../lib/types'

interface UseCaptureResult {
  capture: (text: string) => Promise<Item>
  isLoading: boolean
  error: Error | null
}

// Get the capture API URL from environment
const CAPTURE_API_URL = import.meta.env.VITE_CAPTURE_API_URL

export function useCapture(): UseCaptureResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const capture = useCallback(async (text: string): Promise<Item> => {
    setIsLoading(true)
    setError(null)

    try {
      if (CAPTURE_API_URL) {
        // Call the Supabase Edge Function
        const response = await fetch(CAPTURE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ text }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Failed to process capture')
        }

        const data = await response.json()
        return data.item as Item
      } else {
        // Fallback: Create item directly in Supabase (without AI processing)
        // This is a temporary fallback for development/testing
        console.warn('VITE_CAPTURE_API_URL not set. Creating item without AI processing.')

        const { data, error: insertError } = await supabase
          .from('items')
          .insert({
            title: text.slice(0, 100), // Truncate for title
            description: text.length > 100 ? text : null,
            type: 'task', // Default to task
            status: 'not_started',
            user_id: 'default-user', // This would come from auth in real implementation
          })
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        return data as Item
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to capture item')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { capture, isLoading, error }
}

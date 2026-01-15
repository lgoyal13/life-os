import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Item, ItemType, ItemStatus, UpdateItem } from '../lib/types'

interface UseItemsOptions {
  type?: ItemType
  status?: ItemStatus | ItemStatus[]
  excludeStatus?: ItemStatus | ItemStatus[]
  urgency?: string
  dueDateFrom?: string
  dueDateTo?: string
}

interface UseItemsResult {
  items: Item[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useItems(options: UseItemsOptions = {}): UseItemsResult {
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      let query = supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter by type
      if (options.type) {
        query = query.eq('type', options.type)
      }

      // Filter by status
      if (options.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status)
        } else {
          query = query.eq('status', options.status)
        }
      }

      // Exclude status
      if (options.excludeStatus) {
        if (Array.isArray(options.excludeStatus)) {
          query = query.not('status', 'in', `(${options.excludeStatus.join(',')})`)
        } else {
          query = query.neq('status', options.excludeStatus)
        }
      }

      // Filter by urgency
      if (options.urgency) {
        query = query.eq('urgency', options.urgency)
      }

      // Filter by due date range
      if (options.dueDateFrom) {
        query = query.gte('due_date', options.dueDateFrom)
      }
      if (options.dueDateTo) {
        query = query.lte('due_date', options.dueDateTo)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        throw queryError
      }

      setItems(data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch items'))
    } finally {
      setIsLoading(false)
    }
  }, [options.type, options.status, options.excludeStatus, options.urgency, options.dueDateFrom, options.dueDateTo])

  // Initial fetch
  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
        },
        () => {
          // Refetch on any change
          fetchItems()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchItems])

  return { items, isLoading, error, refetch: fetchItems }
}

// Hook for single item
export function useItem(id: string | null) {
  const [item, setItem] = useState<Item | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id) {
      setItem(null)
      return
    }

    const itemId = id // Capture for closure

    async function fetchItem() {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
          .from('items')
          .select('*')
          .eq('id', itemId)
          .single()

        if (queryError) {
          throw queryError
        }

        setItem(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch item'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchItem()
  }, [id])

  return { item, isLoading, error }
}

// Hook for mutations
export function useMutateItem() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateItem = async (update: UpdateItem): Promise<Item | null> => {
    try {
      setIsLoading(true)
      setError(null)

      const { id, ...rest } = update

      // Build update payload
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = { ...rest }

      // If marking as complete, set completed_at
      if (updates.status === 'complete') {
        updates.completed_at = new Date().toISOString()
      } else if (updates.status) {
        updates.completed_at = null
      }

      const { data, error: updateError } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return data as Item
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update item'))
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const deleteItem = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete item'))
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const toggleComplete = async (item: Item): Promise<Item | null> => {
    const newStatus = item.status === 'complete' ? 'not_started' : 'complete'
    return updateItem({ id: item.id, status: newStatus })
  }

  return { updateItem, deleteItem, toggleComplete, isLoading, error }
}

import { useItems } from '../hooks'
import { ItemList } from '../components/items'
import type { Item, IdeaSubcategory } from '../lib/types'
import { IDEA_SUBCATEGORIES } from '../lib/types'

export function Ideas() {
  const { items, isLoading, error } = useItems({
    type: 'idea',
  })

  // Group by subcategory
  const groupedItems = IDEA_SUBCATEGORIES.reduce((acc, subcategory) => {
    const subcategoryItems = items.filter(item => item.subcategory === subcategory)
    if (subcategoryItems.length > 0) {
      acc[subcategory] = subcategoryItems
    }
    return acc
  }, {} as Record<IdeaSubcategory, Item[]>)

  // Items without subcategory
  const uncategorizedItems = items.filter(item => !item.subcategory)

  if (error) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
        <div className="bg-urgency-high/10 border border-urgency-high/20 rounded-lg p-4 text-center">
          <p className="text-urgency-high">Failed to load ideas. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-text-primary">
          Ideas
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {isLoading ? 'Loading...' : `${items.length} idea${items.length !== 1 ? 's' : ''}`}
        </p>
      </header>

      {isLoading ? (
        <ItemList items={[]} isLoading={true} />
      ) : items.length === 0 ? (
        <ItemList
          items={[]}
          emptyMessage="No ideas saved yet"
          emptyActionLabel="Add your first idea"
        />
      ) : (
        <div className="space-y-8">
          {/* Grouped by subcategory */}
          {Object.entries(groupedItems).map(([subcategory, subcategoryItems]) => (
            <section key={subcategory}>
              <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
                {subcategory} ({subcategoryItems.length})
              </h2>
              <ItemList items={subcategoryItems} />
            </section>
          ))}

          {/* Uncategorized */}
          {uncategorizedItems.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
                Other ({uncategorizedItems.length})
              </h2>
              <ItemList items={uncategorizedItems} />
            </section>
          )}
        </div>
      )}
    </div>
  )
}

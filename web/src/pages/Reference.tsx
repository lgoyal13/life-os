import { useItems } from '../hooks'
import { ItemList } from '../components/items'

export function Reference() {
  const { items, isLoading, error } = useItems({
    type: 'reference',
  })

  if (error) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
        <div className="bg-urgency-high/10 border border-urgency-high/20 rounded-lg p-4 text-center">
          <p className="text-urgency-high">Failed to load reference items. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-text-primary">
          Reference
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {isLoading ? 'Loading...' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
        </p>
      </header>

      <ItemList
        items={items}
        isLoading={isLoading}
        emptyMessage="No reference items yet"
        emptyActionLabel="Add your first reference"
      />
    </div>
  )
}

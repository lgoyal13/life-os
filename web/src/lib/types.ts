// Item types
export type ItemType = 'task' | 'event' | 'idea' | 'reference'

export type ItemStatus = 'not_started' | 'in_progress' | 'complete'

export type Urgency = 'low' | 'medium' | 'high'

// Top-level categories
export type Category =
  | 'Car'
  | 'Personal'
  | 'Family'
  | 'Finance'
  | 'Health'
  | 'Home'
  | 'Work'
  | 'Recruiting'
  | 'Travel'
  | 'Ideas'
  | 'Reference'

// Idea subcategories
export type IdeaSubcategory =
  | 'Books'
  | 'Movies'
  | 'TV'
  | 'Restaurants'
  | 'Articles'
  | 'Gifts'
  | 'Products'
  | 'Places'
  | 'Activities'
  | 'Random'

// Main Item interface - matches Supabase schema
export interface Item {
  id: string
  user_id: string
  type: ItemType
  title: string
  description: string | null
  category: Category | null
  subcategory: IdeaSubcategory | null
  status: ItemStatus
  urgency: Urgency | null
  due_date: string | null
  people_mentioned: string[] | null
  notes: string | null
  links: string[] | null
  calendar_event_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

// User interface
export interface User {
  id: string
  email: string
  name: string | null
  created_at: string
}

// For creating new items (omit auto-generated fields)
export type NewItem = Omit<Item, 'id' | 'created_at' | 'updated_at' | 'completed_at'>

// For updating items (all fields optional except id)
export type UpdateItem = Partial<Omit<Item, 'id' | 'created_at' | 'updated_at'>> & { id: string }

// Category and subcategory constants for dropdowns
export const CATEGORIES: Category[] = [
  'Car',
  'Personal',
  'Family',
  'Finance',
  'Health',
  'Home',
  'Work',
  'Recruiting',
  'Travel',
  'Ideas',
  'Reference',
]

export const IDEA_SUBCATEGORIES: IdeaSubcategory[] = [
  'Books',
  'Movies',
  'TV',
  'Restaurants',
  'Articles',
  'Gifts',
  'Products',
  'Places',
  'Activities',
  'Random',
]

export const URGENCY_LEVELS: Urgency[] = ['low', 'medium', 'high']

export const ITEM_STATUSES: ItemStatus[] = ['not_started', 'in_progress', 'complete']

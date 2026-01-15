// Life OS Edit Item Edge Function
// Processes natural language instructions to update items using Gemini AI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateFields {
  title?: string
  description?: string | null
  category?: string | null
  subcategory?: string | null
  urgency?: 'low' | 'medium' | 'high' | null
  due_date?: string | null
  status?: 'not_started' | 'in_progress' | 'complete'
  notes?: string | null
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { item_id, instruction, current_item } = await req.json()

    if (!item_id || !instruction) {
      return new Response(
        JSON.stringify({ error: 'item_id and instruction are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing edit:', instruction.substring(0, 100))

    // Parse the instruction using Gemini
    const updates = await parseInstructionWithGemini(instruction, current_item)
    console.log('Parsed updates:', JSON.stringify(updates))

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'Could not understand the instruction. Try being more specific.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Update the item
    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', item_id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    console.log('Updated item:', data.id)

    return new Response(
      JSON.stringify({ item: data, updates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edit error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function parseInstructionWithGemini(instruction: string, currentItem: Record<string, unknown>): Promise<UpdateFields> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')

  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, using fallback parsing')
    return fallbackParse(instruction)
  }

  const today = new Date().toISOString().split('T')[0]

  const prompt = `You are a personal assistant that interprets natural language instructions to update task/item fields.

Current item:
${JSON.stringify(currentItem, null, 2)}

Today's date is ${today}.

User instruction: "${instruction}"

Based on the instruction, determine which fields should be updated. Return a JSON object with ONLY the fields that should change. Available fields:
{
  "title": "string - new title",
  "description": "string or null - new description",
  "category": "Car" | "Personal" | "Family" | "Finance" | "Health" | "Home" | "Work" | "Recruiting" | "Travel" | "Ideas" | "Reference" | null,
  "subcategory": "Books" | "Movies" | "TV" | "Restaurants" | "Articles" | "Gifts" | "Products" | "Places" | "Activities" | "Random" | null,
  "urgency": "low" | "medium" | "high" | null,
  "due_date": "ISO date string" | null,
  "status": "not_started" | "in_progress" | "complete",
  "notes": "string or null - new notes"
}

Examples:
- "make this high urgency" → {"urgency": "high"}
- "due tomorrow" → {"due_date": "2024-01-16T00:00:00.000Z"}
- "change category to Work" → {"category": "Work"}
- "mark as complete" → {"status": "complete"}
- "add note: remember to bring laptop" → {"notes": "remember to bring laptop"}
- "rename to Buy groceries for dinner" → {"title": "Buy groceries for dinner"}

Parse relative dates like "tomorrow", "next week", "in 3 days" relative to today.
If the instruction is unclear or doesn't match any field, return an empty object {}.

Return ONLY the JSON object, no additional text.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected Gemini response:', JSON.stringify(data))
      throw new Error('Invalid response from Gemini')
    }

    const jsonText = data.candidates[0].content.parts[0].text
    const updates = JSON.parse(jsonText)

    // Validate and clean the updates
    const validFields = ['title', 'description', 'category', 'subcategory', 'urgency', 'due_date', 'status', 'notes']
    const cleanedUpdates: UpdateFields = {}

    for (const [key, value] of Object.entries(updates)) {
      if (validFields.includes(key)) {
        (cleanedUpdates as Record<string, unknown>)[key] = value
      }
    }

    return cleanedUpdates
  } catch (error) {
    console.error('Gemini parsing error:', error)
    return fallbackParse(instruction)
  }
}

function fallbackParse(instruction: string): UpdateFields {
  const lower = instruction.toLowerCase()
  const updates: UpdateFields = {}

  // Simple pattern matching fallback
  if (lower.includes('high urgency') || lower.includes('urgent')) {
    updates.urgency = 'high'
  } else if (lower.includes('medium urgency')) {
    updates.urgency = 'medium'
  } else if (lower.includes('low urgency') || lower.includes('not urgent')) {
    updates.urgency = 'low'
  }

  if (lower.includes('complete') || lower.includes('done') || lower.includes('finished')) {
    updates.status = 'complete'
  } else if (lower.includes('in progress') || lower.includes('started') || lower.includes('working')) {
    updates.status = 'in_progress'
  }

  if (lower.includes('tomorrow')) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    updates.due_date = tomorrow.toISOString()
  }

  return updates
}

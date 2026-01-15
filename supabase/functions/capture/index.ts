// Life OS Capture Edge Function
// Processes freeform text using Gemini AI and creates items in Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExtractedItem {
  type: 'task' | 'event' | 'idea' | 'reference'
  title: string
  description: string | null
  category: string | null
  subcategory: string | null
  urgency: 'low' | 'medium' | 'high' | null
  due_date: string | null
  people_mentioned: string[] | null
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, user_id } = await req.json()

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing capture:', text.substring(0, 100))

    // Extract structured data using Gemini
    const extracted = await extractWithGemini(text)
    console.log('Extracted:', JSON.stringify(extracted))

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Insert item into database
    const { data, error } = await supabase
      .from('items')
      .insert({
        user_id: user_id || '00000000-0000-0000-0000-000000000001',
        type: extracted.type,
        title: extracted.title,
        description: extracted.description,
        category: extracted.category,
        subcategory: extracted.subcategory,
        urgency: extracted.urgency,
        due_date: extracted.due_date,
        people_mentioned: extracted.people_mentioned,
        status: 'not_started',
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    console.log('Created item:', data.id)

    return new Response(
      JSON.stringify({ item: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Capture error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function extractWithGemini(text: string): Promise<ExtractedItem> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')

  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, using fallback extraction')
    return fallbackExtract(text)
  }

  const today = new Date().toISOString().split('T')[0]

  const prompt = `You are a personal assistant that extracts structured data from freeform text captures.

Today's date is ${today}.

Text to process: "${text}"

Extract and return a JSON object with exactly these fields:
{
  "type": "task" | "event" | "idea" | "reference",
  "title": "short descriptive title (max 100 chars)",
  "description": "longer description if the text has additional details, otherwise null",
  "category": "Car" | "Personal" | "Family" | "Finance" | "Health" | "Home" | "Work" | "Recruiting" | "Travel" | "Ideas" | "Reference" | null,
  "subcategory": "Books" | "Movies" | "TV" | "Restaurants" | "Articles" | "Gifts" | "Products" | "Places" | "Activities" | "Random" | null,
  "urgency": "low" | "medium" | "high" | null,
  "due_date": "ISO date string" | null,
  "people_mentioned": ["name1", "name2"] | null
}

Classification rules:
- "task": Something to do, an action item, a todo
- "event": A scheduled meeting, appointment, or activity with a specific time
- "idea": A recommendation, something to watch/read/try, a want-to-do
- "reference": Information to remember, facts, passwords, sizes, preferences

Additional rules:
- Only set subcategory if type is "idea"
- Parse relative dates like "tomorrow", "next week", "in 3 days" relative to today
- Extract people names that are clearly mentioned (Dad, Mom, Anjali, etc.)
- Set urgency only if the text implies urgency (urgent, ASAP, important, etc.)
- Keep titles concise but descriptive

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
            temperature: 0.1, // Low temperature for consistent extraction
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
    const extracted = JSON.parse(jsonText)

    // Validate required fields
    if (!extracted.type || !extracted.title) {
      throw new Error('Missing required fields from extraction')
    }

    return {
      type: extracted.type,
      title: extracted.title.substring(0, 100),
      description: extracted.description || null,
      category: extracted.category || null,
      subcategory: extracted.type === 'idea' ? extracted.subcategory : null,
      urgency: extracted.urgency || null,
      due_date: extracted.due_date || null,
      people_mentioned: extracted.people_mentioned || null,
    }
  } catch (error) {
    console.error('Gemini extraction error:', error)
    // Fall back to simple extraction
    return fallbackExtract(text)
  }
}

function fallbackExtract(text: string): ExtractedItem {
  // Simple fallback when Gemini is unavailable
  return {
    type: 'task',
    title: text.substring(0, 100),
    description: text.length > 100 ? text : null,
    category: null,
    subcategory: null,
    urgency: null,
    due_date: null,
    people_mentioned: null,
  }
}

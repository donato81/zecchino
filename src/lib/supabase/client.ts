import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url) throw new Error('VITE_SUPABASE_URL mancante in .env.local')
if (!key) throw new Error('VITE_SUPABASE_ANON_KEY mancante in .env.local')

export const supabase = createClient(url, key)

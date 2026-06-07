import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://guipfbivtvhbzkxjmkeu.supabase.co'
const supabaseKey = 'sb_publishable_WIOt8n7NbLmTuRK2UBx-1g_2KUchCMV'

export const supabase = createClient(supabaseUrl, supabaseKey)
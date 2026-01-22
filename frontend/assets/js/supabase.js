

const SUPABASE_URL = 'https://ogueqskgegymwxohcjez.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kSWZVgD8jX9qKGpHvngYmA_36PKZ9Ms';

if (SUPABASE_URL === 'https://ogueqskgegymwxohcjez.supabase.co') {
    console.warn('⚠️ Supabase credentials not set in assets/js/supabase.js');
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
